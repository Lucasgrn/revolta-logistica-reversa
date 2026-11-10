// Consultas de leitura usadas pelas páginas (listagens, detalhe, indicadores, PNRS).
import type { Prisma } from "../generated/prisma/client";
import type { Canal, Categoria, Motivo, StatusDevolucao } from "../generated/prisma/enums";
import { calcularIndicadores, type DevolucaoAnalise } from "../domain/indicadores";
import { impactoAmbiental, massaTotal } from "../domain/destinacao";
import { db } from "../lib/db";
import { INCLUDE_PRODUTO } from "./devolucoes";

export interface Filtros {
  inicio: Date;
  fim: Date;
  canal?: Canal;
  categoria?: Categoria;
  motivo?: Motivo;
  status?: StatusDevolucao;
  busca?: string;
}

const CANAIS = ["POS_VENDA", "POS_CONSUMO"];
const CATEGORIAS = ["PAINEL_SOLAR", "INVERSOR", "BATERIA", "MEDIDOR", "ILUMINACAO_LED", "CABOS_CONECTORES"];
const MOTIVOS = ["ARREPENDIMENTO", "DEFEITO", "AVARIA_TRANSPORTE", "ITEM_ERRADO", "GARANTIA", "FIM_DE_VIDA", "TROCA_TECNOLOGICA"];
const STATUS = ["SOLICITADA", "EM_TRANSITO", "RECEBIDA", "EM_TRIAGEM", "DESTINADA", "ENCERRADA", "RECUSADA"];

/** Interpreta os filtros da URL. Padrão: últimos 12 meses completos até hoje. */
export function lerFiltros(sp: Record<string, string | string[] | undefined>, mesesPadrao = 12): Filtros {
  const v = (k: string) => (typeof sp[k] === "string" && sp[k] ? (sp[k] as string) : undefined);
  const hoje = new Date();
  const padraoInicio = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - (mesesPadrao - 1), 1));
  const inicio = v("inicio") ? new Date(`${v("inicio")}T00:00:00Z`) : padraoInicio;
  const fim = v("fim") ? new Date(`${v("fim")}T23:59:59Z`) : hoje;
  const pertence = <T extends string>(lista: string[], x?: string) => (x && lista.includes(x) ? (x as T) : undefined);
  return {
    inicio: isNaN(+inicio) ? padraoInicio : inicio,
    fim: isNaN(+fim) ? hoje : fim,
    canal: pertence<Canal>(CANAIS, v("canal")),
    categoria: pertence<Categoria>(CATEGORIAS, v("categoria")),
    motivo: pertence<Motivo>(MOTIVOS, v("motivo")),
    status: pertence<StatusDevolucao>(STATUS, v("status")),
    busca: v("busca"),
  };
}

function onde(f: Filtros): Prisma.DevolucaoWhereInput {
  return {
    criadaEm: { gte: f.inicio, lte: f.fim },
    ...(f.canal && { canal: f.canal }),
    ...(f.motivo && { motivo: f.motivo }),
    ...(f.status && { status: f.status }),
    ...(f.categoria && { itens: { some: { produto: { categoria: f.categoria } } } }),
    ...(f.busca && {
      OR: [
        { protocolo: { contains: f.busca, mode: "insensitive" } },
        { cliente: { nome: { contains: f.busca, mode: "insensitive" } } },
        { venda: { numero: { contains: f.busca, mode: "insensitive" } } },
      ],
    }),
  };
}

export async function listarDevolucoes(f: Filtros) {
  const devs = await db.devolucao.findMany({
    where: onde(f),
    orderBy: { criadaEm: "desc" },
    include: {
      cliente: { select: { nome: true } },
      venda: { select: { numero: true } },
      itens: { include: { produto: { include: INCLUDE_PRODUTO } } },
      custos: { select: { valor: true } },
      recuperacoes: { select: { valor: true } },
    },
  });
  return devs.map((d) => ({
    id: d.id,
    protocolo: d.protocolo,
    canal: d.canal,
    motivo: d.motivo,
    status: d.status,
    origem: d.origem,
    alertas: d.alertas.length,
    cliente: d.cliente.nome,
    venda: d.venda?.numero ?? null,
    criadaEm: d.criadaEm.toISOString(),
    itens: d.itens.length,
    produtos: [...new Set(d.itens.map((i) => i.produto.nome))].join(", "),
    massaKg: d.itens.reduce((s, i) => s + massaTotal(i.produto.composicao), 0),
    custo: d.custos.reduce((s, c) => s + c.valor, 0),
    recuperado: d.recuperacoes.reduce((s, c) => s + c.valor, 0),
  }));
}
export type LinhaDevolucao = Awaited<ReturnType<typeof listarDevolucoes>>[number];

export async function detalheDevolucao(id: number) {
  return db.devolucao.findUnique({
    where: { id },
    include: {
      cliente: true,
      venda: true,
      itens: { include: { produto: { include: INCLUDE_PRODUTO } }, orderBy: { id: "asc" } },
      custos: { orderBy: { criadoEm: "asc" } },
      recuperacoes: { orderBy: { criadoEm: "asc" } },
      historico: { orderBy: { em: "asc" } },
    },
  });
}

/** Carrega as devoluções do filtro no formato de análise. */
async function carregarAnalise(f: Filtros): Promise<DevolucaoAnalise[]> {
  const devs = await db.devolucao.findMany({
    where: onde({ ...f, status: undefined, busca: undefined }),
    include: {
      itens: { include: { produto: { include: INCLUDE_PRODUTO } } },
      custos: true,
      recuperacoes: true,
    },
  });
  return devs.map((d) => {
    if (!f.categoria) return d;
    // Com filtro de categoria, mantém só os itens da categoria; custos da devolução
    // (não atribuídos a item) são rateados pela fração de itens mantidos.
    const itens = d.itens.filter((i) => i.produto.categoria === f.categoria);
    const ids = new Set(itens.map((i) => i.id));
    const fracao = d.itens.length ? itens.length / d.itens.length : 0;
    const ratear = <T extends { itemId: number | null; valor: number }>(xs: T[]) =>
      xs.flatMap((x) => (x.itemId == null ? [{ ...x, valor: x.valor * fracao }] : ids.has(x.itemId) ? [x] : []));
    return { ...d, itens, custos: ratear(d.custos), recuperacoes: ratear(d.recuperacoes) };
  });
}

export async function indicadores(f: Filtros) {
  const [devolucoes, vendidos] = await Promise.all([
    carregarAnalise(f),
    db.itemVenda.groupBy({
      by: ["produtoId"],
      _sum: { quantidade: true },
      where: {
        venda: { dataEntrega: { gte: f.inicio, lte: f.fim } },
        ...(f.categoria && { produto: { categoria: f.categoria } }),
      },
    }),
  ]);
  const mapa = new Map(vendidos.map((v) => [v.produtoId, v._sum.quantidade ?? 0]));
  return calcularIndicadores(devolucoes, mapa, { inicio: f.inicio, fim: f.fim });
}

/** Relatório de conformidade PNRS: massa recebida e destinada por categoria com logística reversa obrigatória. */
export async function relatorioPnrs(f: Filtros) {
  const itens = await db.itemDevolvido.findMany({
    where: { devolucao: { criadaEm: { gte: f.inicio, lte: f.fim }, status: { not: "RECUSADA" } } },
    include: { produto: { include: INCLUDE_PRODUTO }, devolucao: { select: { canal: true, recebidaEm: true } } },
  });
  type Linha = {
    categoria: Categoria;
    canal: Canal;
    unidades: number;
    recebidas: number;
    destinadas: number;
    massaRecebidaKg: number;
    massaDestinadaKg: number;
    massaDesviadaKg: number;
    massaPerigosaKg: number;
    co2EvitadoKg: number;
    porDestinacao: Record<string, number>;
  };
  const linhas = new Map<string, Linha>();
  for (const i of itens) {
    const chave = `${i.produto.categoria}|${i.devolucao.canal}`;
    const l = linhas.get(chave) ?? {
      categoria: i.produto.categoria, canal: i.devolucao.canal, unidades: 0, recebidas: 0, destinadas: 0,
      massaRecebidaKg: 0, massaDestinadaKg: 0, massaDesviadaKg: 0, massaPerigosaKg: 0, co2EvitadoKg: 0, porDestinacao: {},
    };
    const massa = massaTotal(i.produto.composicao);
    l.unidades++;
    if (i.devolucao.recebidaEm) {
      l.recebidas++;
      l.massaRecebidaKg += massa;
    }
    if (i.destinacao) {
      const imp = impactoAmbiental(i.destinacao, i.produto.composicao);
      l.destinadas++;
      l.massaDestinadaKg += massa;
      l.massaDesviadaKg += imp.massaDesviadaKg;
      l.massaPerigosaKg += imp.massaPerigosaKg;
      l.co2EvitadoKg += imp.co2EvitadoKg;
      l.porDestinacao[i.destinacao] = (l.porDestinacao[i.destinacao] ?? 0) + massa;
    }
    linhas.set(chave, l);
  }
  return [...linhas.values()].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.canal.localeCompare(b.canal));
}
export type LinhaPnrs = Awaited<ReturnType<typeof relatorioPnrs>>[number];
