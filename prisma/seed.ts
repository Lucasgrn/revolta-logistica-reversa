// Seed determinístico: catálogo, materiais, clientes, vendas e ~180 devoluções
// percorrendo o fluxo reverso real (os mesmos serviços usados pela aplicação).
//
//   npx tsx prisma/seed.ts            → recria todos os dados
//   npx tsx prisma/seed.ts --if-empty → só popula se o banco estiver vazio (usado no build)
import "dotenv/config";
import bcrypt from "bcryptjs";
import { criarPrisma } from "../src/lib/db";
import type { Canal, Categoria, Condicao, Motivo } from "../src/generated/prisma/enums";
import { sugerirDestinacao } from "../src/domain/destinacao";
import { dentroDaGarantia } from "../src/domain/politica";
import {
  INCLUDE_PRODUTO,
  abrirDevolucao,
  destinarItem,
  encerrarDevolucao,
  ErroDominio,
  gerarProtocolo,
  iniciarTriagem,
  recusarDevolucao,
  registrarRecebimento,
  registrarTransito,
} from "../src/servicos/devolucoes";

const prisma = criarPrisma();

// PRNG determinístico (mulberry32)
function mulberry32(semente: number) {
  let a = semente;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20261110);
const entre = (min: number, max: number) => min + rnd() * (max - min);
const inteiro = (min: number, max: number) => Math.floor(entre(min, max + 1));
const escolher = <T,>(xs: readonly T[]) => xs[Math.floor(rnd() * xs.length)];
function ponderado<T>(opcoes: readonly (readonly [T, number])[]): T {
  const total = opcoes.reduce((s, [, p]) => s + p, 0);
  let r = rnd() * total;
  for (const [v, p] of opcoes) if ((r -= p) <= 0) return v;
  return opcoes[opcoes.length - 1][0];
}
const DIA = 86_400_000;
const AGORA = Date.now();
// Soma dias e algumas horas aleatórias, sem nunca ultrapassar o momento atual.
const somarDias = (d: Date, dias: number) => new Date(Math.min(d.getTime() + dias * DIA + inteiro(1, 8) * 3_600_000, AGORA));

// ───────────── Dados mestres ─────────────

// fatorCo2: kgCO2e evitados por kg reaproveitado (valores ilustrativos, ordem de grandeza
// compatível com EPA WARM e literatura de ACV); precoSucata: R$/kg (referência de mercado aproximada).
const MATERIAIS = [
  { nome: "Vidro", fatorCo2: 0.3, precoSucata: 0.15, reciclavel: true, perigoso: false },
  { nome: "Alumínio", fatorCo2: 9.0, precoSucata: 6.5, reciclavel: true, perigoso: false },
  { nome: "Aço", fatorCo2: 1.5, precoSucata: 0.8, reciclavel: true, perigoso: false },
  { nome: "Cobre", fatorCo2: 3.0, precoSucata: 35.0, reciclavel: true, perigoso: false },
  { nome: "Silício (células FV)", fatorCo2: 5.0, precoSucata: 2.0, reciclavel: true, perigoso: false },
  { nome: "Plástico de engenharia (ABS/PC)", fatorCo2: 1.5, precoSucata: 1.2, reciclavel: true, perigoso: false },
  { nome: "Polímeros EVA/backsheet", fatorCo2: 0, precoSucata: 0, reciclavel: false, perigoso: false },
  { nome: "Placa eletrônica (PCI)", fatorCo2: 8.0, precoSucata: 15.0, reciclavel: true, perigoso: true },
  { nome: "Células de íon-lítio", fatorCo2: 4.0, precoSucata: 8.0, reciclavel: true, perigoso: true },
  { nome: "Chumbo", fatorCo2: 1.2, precoSucata: 4.5, reciclavel: true, perigoso: true },
  { nome: "Eletrólito ácido", fatorCo2: 0, precoSucata: 0, reciclavel: false, perigoso: true },
  { nome: "Isolante PVC", fatorCo2: 0.8, precoSucata: 0.6, reciclavel: true, perigoso: false },
  { nome: "Ferrite e magnéticos", fatorCo2: 1.0, precoSucata: 0.5, reciclavel: true, perigoso: false },
  { nome: "Resina epóxi / compósitos", fatorCo2: 0, precoSucata: 0, reciclavel: false, perigoso: false },
] as const;

type NomeMaterial = (typeof MATERIAIS)[number]["nome"];

const PRODUTOS: {
  sku: string;
  nome: string;
  categoria: Categoria;
  preco: number;
  custo: number;
  garantiaMeses: number;
  composicao: [NomeMaterial, number][];
}[] = [
  // Painéis solares
  { sku: "FV-550M", nome: "Painel solar 550 W monocristalino", categoria: "PAINEL_SOLAR", preco: 899, custo: 610, garantiaMeses: 144,
    composicao: [["Vidro", 21.0], ["Alumínio", 3.2], ["Silício (células FV)", 1.1], ["Polímeros EVA/backsheet", 2.3], ["Cobre", 0.35], ["Placa eletrônica (PCI)", 0.15]] },
  { sku: "FV-410P", nome: "Painel solar 410 W policristalino", categoria: "PAINEL_SOLAR", preco: 649, custo: 430, garantiaMeses: 120,
    composicao: [["Vidro", 16.5], ["Alumínio", 2.6], ["Silício (células FV)", 0.9], ["Polímeros EVA/backsheet", 1.9], ["Cobre", 0.3], ["Placa eletrônica (PCI)", 0.12]] },
  { sku: "FV-BIF600", nome: "Painel bifacial 600 W", categoria: "PAINEL_SOLAR", preco: 1249, custo: 860, garantiaMeses: 144,
    composicao: [["Vidro", 28.0], ["Alumínio", 3.0], ["Silício (células FV)", 1.2], ["Polímeros EVA/backsheet", 1.6], ["Cobre", 0.4], ["Placa eletrônica (PCI)", 0.15]] },
  { sku: "FV-100F", nome: "Painel flexível 100 W", categoria: "PAINEL_SOLAR", preco: 459, custo: 290, garantiaMeses: 24,
    composicao: [["Silício (células FV)", 0.3], ["Polímeros EVA/backsheet", 1.4], ["Cobre", 0.1], ["Placa eletrônica (PCI)", 0.05]] },
  // Inversores
  { sku: "INV-ON5K", nome: "Inversor on-grid 5 kW", categoria: "INVERSOR", preco: 4290, custo: 2980, garantiaMeses: 60,
    composicao: [["Alumínio", 6.5], ["Aço", 3.0], ["Placa eletrônica (PCI)", 1.8], ["Cobre", 1.6], ["Ferrite e magnéticos", 1.2], ["Plástico de engenharia (ABS/PC)", 0.9]] },
  { sku: "INV-HIB8K", nome: "Inversor híbrido 8 kW", categoria: "INVERSOR", preco: 8990, custo: 6400, garantiaMeses: 60,
    composicao: [["Alumínio", 11.0], ["Aço", 6.0], ["Placa eletrônica (PCI)", 3.1], ["Cobre", 3.0], ["Ferrite e magnéticos", 2.4], ["Plástico de engenharia (ABS/PC)", 1.5]] },
  { sku: "INV-MIC2K", nome: "Microinversor 2 kW (4 MPPT)", categoria: "INVERSOR", preco: 2190, custo: 1450, garantiaMeses: 120,
    composicao: [["Alumínio", 2.1], ["Placa eletrônica (PCI)", 0.7], ["Cobre", 0.5], ["Resina epóxi / compósitos", 0.6], ["Plástico de engenharia (ABS/PC)", 0.3]] },
  { sku: "INV-OFF3K", nome: "Inversor off-grid senoidal 3 kW", categoria: "INVERSOR", preco: 2690, custo: 1790, garantiaMeses: 24,
    composicao: [["Aço", 5.5], ["Cobre", 4.2], ["Ferrite e magnéticos", 3.5], ["Placa eletrônica (PCI)", 1.0], ["Alumínio", 1.2], ["Plástico de engenharia (ABS/PC)", 0.6]] },
  // Baterias
  { sku: "BAT-LFP5", nome: "Bateria LiFePO4 5 kWh", categoria: "BATERIA", preco: 11990, custo: 8400, garantiaMeses: 120,
    composicao: [["Células de íon-lítio", 34.0], ["Aço", 9.5], ["Alumínio", 3.0], ["Placa eletrônica (PCI)", 0.9], ["Cobre", 1.1], ["Plástico de engenharia (ABS/PC)", 1.5]] },
  { sku: "BAT-LFP10", nome: "Bateria LiFePO4 10 kWh rack", categoria: "BATERIA", preco: 21490, custo: 15100, garantiaMeses: 120,
    composicao: [["Células de íon-lítio", 68.0], ["Aço", 16.0], ["Alumínio", 5.5], ["Placa eletrônica (PCI)", 1.4], ["Cobre", 2.1], ["Plástico de engenharia (ABS/PC)", 2.0]] },
  { sku: "BAT-EST150", nome: "Bateria estacionária chumbo-ácido 150 Ah", categoria: "BATERIA", preco: 1390, custo: 940, garantiaMeses: 24,
    composicao: [["Chumbo", 28.0], ["Eletrólito ácido", 9.0], ["Plástico de engenharia (ABS/PC)", 3.5], ["Cobre", 0.3]] },
  { sku: "BAT-EST60", nome: "Bateria estacionária chumbo-ácido 60 Ah", categoria: "BATERIA", preco: 649, custo: 420, garantiaMeses: 24,
    composicao: [["Chumbo", 12.0], ["Eletrólito ácido", 4.0], ["Plástico de engenharia (ABS/PC)", 1.6], ["Cobre", 0.15]] },
  { sku: "BAT-PWB20", nome: "Power bank solar 20.000 mAh", categoria: "BATERIA", preco: 229, custo: 120, garantiaMeses: 12,
    composicao: [["Células de íon-lítio", 0.32], ["Plástico de engenharia (ABS/PC)", 0.12], ["Placa eletrônica (PCI)", 0.04], ["Silício (células FV)", 0.02]] },
  // Medidores
  { sku: "MED-INT1F", nome: "Medidor inteligente monofásico", categoria: "MEDIDOR", preco: 389, custo: 240, garantiaMeses: 36,
    composicao: [["Plástico de engenharia (ABS/PC)", 0.55], ["Placa eletrônica (PCI)", 0.18], ["Cobre", 0.12], ["Aço", 0.05]] },
  { sku: "MED-INT3F", nome: "Medidor inteligente trifásico", categoria: "MEDIDOR", preco: 799, custo: 510, garantiaMeses: 36,
    composicao: [["Plástico de engenharia (ABS/PC)", 0.9], ["Placa eletrônica (PCI)", 0.3], ["Cobre", 0.35], ["Aço", 0.15]] },
  { sku: "MED-WIFI", nome: "Monitor de consumo Wi-Fi", categoria: "MEDIDOR", preco: 279, custo: 150, garantiaMeses: 12,
    composicao: [["Plástico de engenharia (ABS/PC)", 0.18], ["Placa eletrônica (PCI)", 0.08], ["Cobre", 0.06], ["Ferrite e magnéticos", 0.05]] },
  // Iluminação LED
  { sku: "LED-BUL9", nome: "Lâmpada LED bulbo 9 W (kit 10)", categoria: "ILUMINACAO_LED", preco: 89, custo: 48, garantiaMeses: 12,
    composicao: [["Plástico de engenharia (ABS/PC)", 0.35], ["Alumínio", 0.2], ["Placa eletrônica (PCI)", 0.12], ["Vidro", 0.05]] },
  { sku: "LED-TUB18", nome: "Lâmpada LED tubular 18 W (kit 10)", categoria: "ILUMINACAO_LED", preco: 159, custo: 88, garantiaMeses: 24,
    composicao: [["Plástico de engenharia (ABS/PC)", 1.4], ["Alumínio", 0.9], ["Placa eletrônica (PCI)", 0.3]] },
  { sku: "LED-REF100", nome: "Refletor LED 100 W", categoria: "ILUMINACAO_LED", preco: 219, custo: 120, garantiaMeses: 24,
    composicao: [["Alumínio", 1.1], ["Vidro", 0.3], ["Placa eletrônica (PCI)", 0.15], ["Cobre", 0.05]] },
  { sku: "LED-PUB150", nome: "Luminária pública LED 150 W", categoria: "ILUMINACAO_LED", preco: 1290, custo: 820, garantiaMeses: 60,
    composicao: [["Alumínio", 5.2], ["Vidro", 0.8], ["Placa eletrônica (PCI)", 0.5], ["Cobre", 0.2], ["Plástico de engenharia (ABS/PC)", 0.3]] },
  { sku: "LED-SOL60", nome: "Poste solar integrado 60 W", categoria: "ILUMINACAO_LED", preco: 749, custo: 470, garantiaMeses: 24,
    composicao: [["Alumínio", 3.0], ["Silício (células FV)", 0.4], ["Células de íon-lítio", 1.2], ["Placa eletrônica (PCI)", 0.2], ["Vidro", 0.9]] },
  // Cabos e conectores
  { sku: "CAB-6MM", nome: "Cabo solar 6 mm² (rolo 100 m)", categoria: "CABOS_CONECTORES", preco: 899, custo: 610, garantiaMeses: 12,
    composicao: [["Cobre", 5.4], ["Isolante PVC", 2.6]] },
  { sku: "CAB-4MM", nome: "Cabo solar 4 mm² (rolo 100 m)", categoria: "CABOS_CONECTORES", preco: 619, custo: 410, garantiaMeses: 12,
    composicao: [["Cobre", 3.6], ["Isolante PVC", 2.0]] },
  { sku: "CON-MC4", nome: "Kit conectores MC4 (20 pares)", categoria: "CABOS_CONECTORES", preco: 149, custo: 70, garantiaMeses: 12,
    composicao: [["Plástico de engenharia (ABS/PC)", 0.4], ["Cobre", 0.12], ["Aço", 0.03]] },
  { sku: "SB-4E", nome: "String box CC 4 entradas", categoria: "CABOS_CONECTORES", preco: 589, custo: 360, garantiaMeses: 24,
    composicao: [["Plástico de engenharia (ABS/PC)", 1.8], ["Cobre", 0.4], ["Placa eletrônica (PCI)", 0.2], ["Aço", 0.3]] },
];

const NOMES = ["Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela", "Henrique", "Isabela", "João", "Karina", "Lucas", "Mariana", "Nicolas", "Olívia", "Paulo", "Rafaela", "Samuel", "Tatiane", "Vinícius"];
const SOBRENOMES = ["Silva", "Souza", "Oliveira", "Pereira", "Costa", "Rodrigues", "Almeida", "Nascimento", "Lima", "Araújo", "Fernandes", "Carvalho", "Gomes", "Ribeiro"];
const EMPRESAS = ["Solar Nordeste Ltda", "EcoVolt Instalações", "Sol & Cia Engenharia", "Energia Limpa ME", "Fazenda Boa Vista", "Condomínio Jardim das Flores", "Mercado Bom Preço", "Clínica Vida Plena", "Escola Nova Geração", "Hotel Recanto Verde"];
const CIDADES: [string, string][] = [["São Paulo", "SP"], ["Campinas", "SP"], ["Belo Horizonte", "MG"], ["Uberlândia", "MG"], ["Rio de Janeiro", "RJ"], ["Curitiba", "PR"], ["Florianópolis", "SC"], ["Porto Alegre", "RS"], ["Goiânia", "GO"], ["Brasília", "DF"], ["Salvador", "BA"], ["Recife", "PE"], ["Fortaleza", "CE"], ["Natal", "RN"]];
const TRANSPORTADORAS = ["Correios — Logística Reversa", "Jadlog", "Total Express", "Braspress", "Coleta própria"];

const USUARIOS = [
  { nome: "Otávio Recebimento", email: "operador@reversa.dev", senha: "operador123", papel: "OPERADOR" as const },
  { nome: "Alice Triagem", email: "analista@reversa.dev", senha: "analista123", papel: "ANALISTA" as const },
  { nome: "Gustavo Gestão", email: "gestor@reversa.dev", senha: "gestor123", papel: "GESTOR" as const },
];

// Perfil de devolução por categoria (pós-venda vs pós-consumo, condições prováveis)
const CONDICOES_POS_VENDA: Record<Motivo, [Condicao, number][]> = {
  ARREPENDIMENTO: [["A", 70], ["B", 28], ["C", 2]],
  ITEM_ERRADO: [["A", 85], ["B", 15]],
  AVARIA_TRANSPORTE: [["B", 25], ["C", 50], ["D", 25]],
  DEFEITO: [["C", 75], ["D", 25]],
  GARANTIA: [["C", 70], ["D", 30]],
  FIM_DE_VIDA: [["D", 80], ["C", 20]],
  TROCA_TECNOLOGICA: [["B", 35], ["C", 35], ["D", 30]],
};

async function limpar() {
  await prisma.historicoStatus.deleteMany();
  await prisma.valorRecuperado.deleteMany();
  await prisma.custoReverso.deleteMany();
  await prisma.itemDevolvido.deleteMany();
  await prisma.devolucao.deleteMany();
  await prisma.itemVenda.deleteMany();
  await prisma.venda.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.composicaoMaterial.deleteMany();
  await prisma.produto.deleteMany();
  await prisma.material.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.parametros.deleteMany();
}

async function main() {
  if (process.argv.includes("--if-empty") && (await prisma.usuario.count()) > 0) {
    console.log("Banco já populado — seed ignorado.");
    return;
  }
  await limpar();

  // Âncora temporal: hoje. A sequência aleatória é fixa; só as datas acompanham o calendário.
  const hoje = new Date();

  for (const u of USUARIOS) {
    await prisma.usuario.create({
      data: { nome: u.nome, email: u.email, papel: u.papel, senhaHash: await bcrypt.hash(u.senha, 10) },
    });
  }
  await prisma.parametros.create({ data: { id: 1 } });

  const materiais = new Map<string, number>();
  for (const m of MATERIAIS) materiais.set(m.nome, (await prisma.material.create({ data: { ...m } })).id);

  const criarProduto = (p: (typeof PRODUTOS)[number]) =>
    prisma.produto.create({
        data: {
          sku: p.sku,
          nome: p.nome,
          categoria: p.categoria,
          preco: p.preco,
          custo: p.custo,
          garantiaMeses: p.garantiaMeses,
          composicao: { create: p.composicao.map(([nome, massaKg]) => ({ materialId: materiais.get(nome)!, massaKg })) },
        },
        include: INCLUDE_PRODUTO,
      });
  const produtos: Awaited<ReturnType<typeof criarProduto>>[] = [];
  for (const p of PRODUTOS) produtos.push(await criarProduto(p));

  // Clientes
  const clientes = [];
  for (let i = 0; i < 60; i++) {
    const pj = i % 6 === 0;
    const nome = pj ? EMPRESAS[(i / 6) % EMPRESAS.length] : `${escolher(NOMES)} ${escolher(SOBRENOMES)}`;
    const [cidade, uf] = escolher(CIDADES);
    const slug = nome.toLowerCase().normalize("NFD").replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".");
    clientes.push(
      await prisma.cliente.create({
        data: {
          nome,
          documento: pj ? `${inteiro(10, 99)}.${inteiro(100, 999)}.${inteiro(100, 999)}/0001-${inteiro(10, 99)}` : `${inteiro(100, 999)}.${inteiro(100, 999)}.${inteiro(100, 999)}-${inteiro(10, 99)}`,
          email: `${slug}${i}@exemplo.com.br`,
          cidade,
          uf,
        },
      }),
    );
  }

  // Vendas nos últimos 14 meses
  const vendas = [];
  for (let i = 0; i < 420; i++) {
    const entrega = somarDias(hoje, -inteiro(2, 425));
    const nItens = ponderado([[1, 55], [2, 30], [3, 15]] as [number, number][]);
    const escolhidos = new Set<number>();
    while (escolhidos.size < nItens) escolhidos.add(inteiro(0, produtos.length - 1));
    const venda = await prisma.venda.create({
      data: {
        numero: `PED-${String(100000 + i * 7 + inteiro(0, 6))}`,
        clienteId: escolher(clientes).id,
        dataEntrega: entrega,
        itens: {
          create: [...escolhidos].map((idx) => {
            const p = produtos[idx];
            const qtd = p.categoria === "PAINEL_SOLAR" ? inteiro(4, 16) : p.preco < 300 ? inteiro(1, 6) : inteiro(1, 2);
            return { produtoId: p.id, quantidade: qtd, precoUnitario: p.preco };
          }),
        },
      },
      include: { itens: true },
    });
    vendas.push(venda);
  }

  // Devoluções nos últimos 12 meses
  const operador = USUARIOS[0].nome;
  const analista = USUARIOS[1].nome;
  const gestor = USUARIOS[2].nome;
  let criadas = 0;

  for (let tentativa = 0; criadas < 180 && tentativa < 400; tentativa++) {
    const canal: Canal = rnd() < 0.62 ? "POS_VENDA" : "POS_CONSUMO";
    let solicitacao: Date;
    let clienteId: number;
    let vendaId: number | null = null;
    let itens: { produtoId: number; quantidade: number }[];
    let motivo: Motivo;

    if (canal === "POS_VENDA") {
      const candidatas = vendas.filter((v) => (hoje.getTime() - v.dataEntrega.getTime()) / DIA < 365);
      const venda = escolher(candidatas);
      motivo = ponderado<Motivo>([["ARREPENDIMENTO", 34], ["DEFEITO", 26], ["AVARIA_TRANSPORTE", 18], ["ITEM_ERRADO", 9], ["GARANTIA", 13]]);
      const atraso =
        motivo === "ARREPENDIMENTO" ? (rnd() < 0.12 ? inteiro(9, 20) : inteiro(1, 7)) :
        motivo === "AVARIA_TRANSPORTE" || motivo === "ITEM_ERRADO" ? inteiro(0, 4) :
        inteiro(10, 300);
      solicitacao = somarDias(venda.dataEntrega, atraso);
      if (solicitacao > hoje) solicitacao = somarDias(hoje, -inteiro(0, 2));
      clienteId = venda.clienteId;
      vendaId = venda.id;
      const iv = escolher(venda.itens);
      itens = [{ produtoId: iv.produtoId, quantidade: Math.min(iv.quantidade, ponderado([[1, 70], [2, 20], [3, 10]] as [number, number][])) }];
    } else {
      motivo = rnd() < 0.72 ? "FIM_DE_VIDA" : "TROCA_TECNOLOGICA";
      solicitacao = somarDias(hoje, -inteiro(0, 360));
      clienteId = escolher(clientes).id;
      // Pós-consumo concentra baterias, iluminação e painéis (logística reversa obrigatória)
      const cat = ponderado<Categoria>([["BATERIA", 38], ["ILUMINACAO_LED", 26], ["PAINEL_SOLAR", 16], ["INVERSOR", 10], ["MEDIDOR", 6], ["CABOS_CONECTORES", 4]]);
      const p = escolher(produtos.filter((x) => x.categoria === cat));
      itens = [{ produtoId: p.id, quantidade: p.categoria === "PAINEL_SOLAR" ? inteiro(2, 8) : inteiro(1, 3) }];
    }

    const idade = (hoje.getTime() - solicitacao.getTime()) / DIA;
    // Quanto mais antiga, mais avançada no fluxo
    const alvo =
      idade > 45 ? ponderado([["ENCERRADA", 90], ["RECUSADA", 6], ["DESTINADA", 4]] as const) :
      idade > 20 ? ponderado([["ENCERRADA", 55], ["DESTINADA", 20], ["EM_TRIAGEM", 15], ["RECUSADA", 10]] as const) :
      idade > 7 ? ponderado([["DESTINADA", 25], ["EM_TRIAGEM", 30], ["RECEBIDA", 25], ["EM_TRANSITO", 15], ["RECUSADA", 5]] as const) :
      ponderado([["SOLICITADA", 40], ["EM_TRANSITO", 35], ["RECEBIDA", 25]] as const);

    try {
    await prisma.$transaction(
      async (tx) => {
        const dev = await abrirDevolucao(tx, {
          canal,
          motivo,
          origem: rnd() < 0.55 ? "PORTAL" : "INTERNO",
          clienteId,
          vendaId,
          itens,
          descricao: canal === "POS_CONSUMO" ? "Entrega para destinação ambientalmente adequada." : "",
          usuario: rnd() < 0.55 ? "Portal do Cliente" : operador,
          em: solicitacao,
          protocolo: gerarProtocolo(solicitacao, rnd),
        });
        criadas++;
        if (alvo === "SOLICITADA") return;

        // Recusa logo na solicitação quando há alerta de política
        if (alvo === "RECUSADA" && (dev.alertas.length > 0 || rnd() < 0.5)) {
          await recusarDevolucao(tx, dev.id, {
            justificativa: dev.alertas[0] ?? "Produto fora da política comercial de devolução.",
            usuario: analista,
            em: somarDias(solicitacao, 1),
          });
          return;
        }

        const tTransito = somarDias(solicitacao, inteiro(1, 3));
        if (tTransito > hoje) return;
        const massa = itens.reduce((s, it) => {
          const p = produtos.find((x) => x.id === it.produtoId)!;
          return s + it.quantidade * p.composicao.reduce((a, c) => a + c.massaKg, 0);
        }, 0);
        await registrarTransito(tx, dev.id, {
          transportadora: escolher(TRANSPORTADORAS),
          rastreio: `BR${inteiro(100000000, 999999999)}`,
          valorFrete: Math.round((28 + massa * entre(0.9, 1.6)) * 100) / 100,
          usuario: operador,
          em: tTransito,
        });
        if (alvo === "EM_TRANSITO") return;

        const tReceb = somarDias(tTransito, inteiro(2, 6));
        await registrarRecebimento(tx, dev.id, { usuario: operador, em: tReceb > hoje ? hoje : tReceb });
        if (alvo === "RECEBIDA") return;
        if (alvo === "RECUSADA") {
          await recusarDevolucao(tx, dev.id, {
            justificativa: "Produto recebido com violação de lacre e sinais de mau uso.",
            usuario: analista,
            em: somarDias(tReceb, 1),
          });
          return;
        }

        const tTriagem = somarDias(tReceb, inteiro(1, 4));
        await iniciarTriagem(tx, dev.id, { usuario: analista, em: tTriagem > hoje ? hoje : tTriagem });

        const itensDev = await tx.itemDevolvido.findMany({ where: { devolucaoId: dev.id }, include: { produto: { include: INCLUDE_PRODUTO } } });
        const venda = vendaId ? await tx.venda.findUnique({ where: { id: vendaId } }) : null;
        const qtdDestinar = alvo === "EM_TRIAGEM" ? Math.floor(itensDev.length / 2) : itensDev.length;

        for (const [n, item] of itensDev.entries()) {
          if (n >= qtdDestinar) break;
          const tDest = somarDias(tTriagem, inteiro(1, 9));
          const em = tDest > hoje ? hoje : tDest;
          const condicao = ponderado(CONDICOES_POS_VENDA[motivo]);
          const sugestao = sugerirDestinacao({
            canal,
            condicao,
            dentroGarantia: dentroDaGarantia(venda?.dataEntrega, item.produto.garantiaMeses, em),
            produto: item.produto,
          });
          // Em ~10% dos casos o analista diverge da sugestão
          const destinacao =
            rnd() < 0.1 && condicao === "D" ? "DESMONTAGEM_PECAS" :
            rnd() < 0.1 && condicao === "C" ? "DESMONTAGEM_PECAS" :
            sugestao.destinacao;
          await destinarItem(tx, item.id, {
            condicao,
            destinacao,
            numeroSerie: `SN${inteiro(1000000, 9999999)}`,
            observacao: condicao === "D" ? "Danos estruturais / degradação severa." : condicao === "C" ? "Falha funcional identificada em bancada." : "",
            usuario: analista,
            em,
          });
        }
        if (alvo !== "ENCERRADA") return;
        const status = (await tx.devolucao.findUniqueOrThrow({ where: { id: dev.id } })).status;
        if (status !== "DESTINADA") return;
        const ultimo = await tx.historicoStatus.findFirst({ where: { devolucaoId: dev.id }, orderBy: { em: "desc" } });
        const tEnc = somarDias(ultimo!.em, inteiro(1, 5));
        await encerrarDevolucao(tx, dev.id, { usuario: gestor, em: tEnc > hoje ? hoje : tEnc });
      },
      { timeout: 30_000 },
    );
    } catch (e) {
      // Venda sem unidades disponíveis para devolver (já devolvidas antes): sorteia outra.
      if (e instanceof ErroDominio) continue;
      throw e;
    }
  }

  console.log(`Seed concluído: ${produtos.length} produtos, ${clientes.length} clientes, ${vendas.length} vendas, ${criadas} devoluções.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
