// Consolidação dos indicadores ambientais, operacionais e financeiros.
import type {
  Canal,
  Categoria,
  Destinacao,
  Motivo,
  StatusDevolucao,
  TipoCusto,
  TipoRecuperacao,
} from "../generated/prisma/enums";
import { impactoAmbiental, type ProdutoDominio } from "./destinacao";
import { diasEntre } from "./politica";

export interface DevolucaoAnalise {
  canal: Canal;
  motivo: Motivo;
  status: StatusDevolucao;
  criadaEm: Date;
  encerradaEm: Date | null;
  itens: {
    destinacao: Destinacao | null;
    produto: ProdutoDominio & { id: number; sku: string };
  }[];
  custos: { tipo: TipoCusto; valor: number }[];
  recuperacoes: { tipo: TipoRecuperacao; valor: number }[];
}

export interface Mensal {
  mes: string; // AAAA-MM
  posVenda: number;
  posConsumo: number;
  custo: number;
  recuperado: number;
  massaDesviadaKg: number;
  massaAterroKg: number;
  co2EvitadoKg: number;
  taxaReaproveitamento: number | null;
}

export interface Indicadores {
  kpis: {
    devolucoes: number;
    posVenda: number;
    posConsumo: number;
    itens: number;
    itensDestinados: number;
    massaDestinadaKg: number;
    massaDesviadaKg: number;
    massaAterroKg: number;
    taxaReaproveitamento: number | null;
    co2EvitadoKg: number;
    massaPerigosaKg: number;
    custoTotal: number;
    custoMedioItem: number | null;
    valorRecuperado: number;
    resultadoLiquido: number;
    taxaRecuperacaoValor: number | null;
    tempoMedioCicloDias: number | null;
    taxaRecusa: number | null;
  };
  mensal: Mensal[];
  porDestinacao: { destinacao: Destinacao; itens: number; massaKg: number }[];
  porMotivo: { motivo: Motivo; canal: Canal; quantidade: number }[];
  porStatus: { status: StatusDevolucao; quantidade: number }[];
  custosPorTipo: { tipo: TipoCusto; valor: number }[];
  recuperacaoPorTipo: { tipo: TipoRecuperacao; valor: number }[];
  porProduto: {
    produtoId: number;
    sku: string;
    nome: string;
    categoria: Categoria;
    devolvidos: number;
    vendidos: number;
    taxaDevolucao: number | null;
  }[];
}

export const chaveMes = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;

const razao = (a: number, b: number) => (b > 0 ? a / b : null);

/** Lista os meses AAAA-MM de `inicio` a `fim`, inclusive. */
export function mesesNoIntervalo(inicio: Date, fim: Date) {
  const meses: string[] = [];
  const d = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth(), 1));
  while (d <= fim) {
    meses.push(chaveMes(d));
    d.setUTCMonth(d.getUTCMonth() + 1);
  }
  return meses;
}

export function calcularIndicadores(
  devolucoes: DevolucaoAnalise[],
  vendidosPorProduto: Map<number, number>,
  intervalo?: { inicio: Date; fim: Date },
): Indicadores {
  const mensal = new Map<string, Mensal>();
  const mes = (chave: string) => {
    let m = mensal.get(chave);
    if (!m) {
      m = {
        mes: chave,
        posVenda: 0,
        posConsumo: 0,
        custo: 0,
        recuperado: 0,
        massaDesviadaKg: 0,
        massaAterroKg: 0,
        co2EvitadoKg: 0,
        taxaReaproveitamento: null,
      };
      mensal.set(chave, m);
    }
    return m;
  };
  if (intervalo) mesesNoIntervalo(intervalo.inicio, intervalo.fim).forEach(mes);

  const k = {
    devolucoes: devolucoes.length,
    posVenda: 0,
    posConsumo: 0,
    itens: 0,
    itensDestinados: 0,
    massaDestinadaKg: 0,
    massaDesviadaKg: 0,
    massaAterroKg: 0,
    co2EvitadoKg: 0,
    massaPerigosaKg: 0,
    custoTotal: 0,
    valorRecuperado: 0,
    valorReferencia: 0,
    recuperadoPosVenda: 0,
    somaCiclo: 0,
    encerradas: 0,
    recusadas: 0,
  };
  const destinacoes = new Map<Destinacao, { itens: number; massaKg: number }>();
  const motivos = new Map<Motivo, { canal: Canal; quantidade: number }>();
  const status = new Map<StatusDevolucao, number>();
  const custosTipo = new Map<TipoCusto, number>();
  const recTipo = new Map<TipoRecuperacao, number>();
  const produtos = new Map<number, Indicadores["porProduto"][number]>();
  const registrarDevolvido = (prod: DevolucaoAnalise["itens"][number]["produto"]) => {
    const p = produtos.get(prod.id) ?? {
      produtoId: prod.id,
      sku: prod.sku,
      nome: prod.nome,
      categoria: prod.categoria,
      devolvidos: 0,
      vendidos: vendidosPorProduto.get(prod.id) ?? 0,
      taxaDevolucao: null,
    };
    p.devolvidos++;
    produtos.set(prod.id, p);
  };

  for (const d of devolucoes) {
    const m = mes(chaveMes(d.criadaEm));
    if (d.canal === "POS_VENDA") {
      k.posVenda++;
      m.posVenda++;
    } else {
      k.posConsumo++;
      m.posConsumo++;
    }
    motivos.set(d.motivo, { canal: d.canal, quantidade: (motivos.get(d.motivo)?.quantidade ?? 0) + 1 });
    status.set(d.status, (status.get(d.status) ?? 0) + 1);
    if (d.status === "RECUSADA") k.recusadas++;
    if (d.status === "ENCERRADA" && d.encerradaEm) {
      k.encerradas++;
      k.somaCiclo += diasEntre(d.criadaEm, d.encerradaEm);
    }

    for (const c of d.custos) {
      k.custoTotal += c.valor;
      m.custo += c.valor;
      custosTipo.set(c.tipo, (custosTipo.get(c.tipo) ?? 0) + c.valor);
    }
    for (const r of d.recuperacoes) {
      k.valorRecuperado += r.valor;
      if (d.canal === "POS_VENDA") k.recuperadoPosVenda += r.valor;
      m.recuperado += r.valor;
      recTipo.set(r.tipo, (recTipo.get(r.tipo) ?? 0) + r.valor);
    }

    for (const item of d.itens) {
      k.itens++;
      if (d.canal === "POS_VENDA") k.valorReferencia += item.produto.preco;
      // Taxa de devolução só considera o pós-venda: no pós-consumo o produto pode ter sido comprado em outro lugar.
      if (d.canal === "POS_VENDA") registrarDevolvido(item.produto);

      if (!item.destinacao) continue;
      k.itensDestinados++;
      const imp = impactoAmbiental(item.destinacao, item.produto.composicao);
      k.massaDestinadaKg += imp.massaKg;
      k.massaDesviadaKg += imp.massaDesviadaKg;
      k.massaAterroKg += imp.massaAterroKg;
      k.co2EvitadoKg += imp.co2EvitadoKg;
      k.massaPerigosaKg += imp.massaPerigosaKg;
      m.massaDesviadaKg += imp.massaDesviadaKg;
      m.massaAterroKg += imp.massaAterroKg;
      m.co2EvitadoKg += imp.co2EvitadoKg;
      const dst = destinacoes.get(item.destinacao) ?? { itens: 0, massaKg: 0 };
      dst.itens++;
      dst.massaKg += imp.massaKg;
      destinacoes.set(item.destinacao, dst);
    }
  }

  for (const m of mensal.values()) {
    m.taxaReaproveitamento = razao(m.massaDesviadaKg, m.massaDesviadaKg + m.massaAterroKg);
  }
  for (const p of produtos.values()) p.taxaDevolucao = razao(p.devolvidos, p.vendidos);

  return {
    kpis: {
      devolucoes: k.devolucoes,
      posVenda: k.posVenda,
      posConsumo: k.posConsumo,
      itens: k.itens,
      itensDestinados: k.itensDestinados,
      massaDestinadaKg: k.massaDestinadaKg,
      massaDesviadaKg: k.massaDesviadaKg,
      massaAterroKg: k.massaAterroKg,
      taxaReaproveitamento: razao(k.massaDesviadaKg, k.massaDestinadaKg),
      co2EvitadoKg: k.co2EvitadoKg,
      massaPerigosaKg: k.massaPerigosaKg,
      custoTotal: k.custoTotal,
      custoMedioItem: razao(k.custoTotal, k.itens),
      valorRecuperado: k.valorRecuperado,
      resultadoLiquido: k.valorRecuperado - k.custoTotal,
      taxaRecuperacaoValor: razao(k.recuperadoPosVenda, k.valorReferencia),
      tempoMedioCicloDias: razao(k.somaCiclo, k.encerradas),
      taxaRecusa: razao(k.recusadas, k.devolucoes),
    },
    mensal: [...mensal.values()].sort((a, b) => a.mes.localeCompare(b.mes)),
    porDestinacao: [...destinacoes.entries()].map(([destinacao, v]) => ({ destinacao, ...v })),
    porMotivo: [...motivos.entries()]
      .map(([motivo, v]) => ({ motivo, ...v }))
      .sort((a, b) => b.quantidade - a.quantidade),
    porStatus: [...status.entries()].map(([s, quantidade]) => ({ status: s, quantidade })),
    custosPorTipo: [...custosTipo.entries()]
      .map(([tipo, valor]) => ({ tipo, valor }))
      .sort((a, b) => b.valor - a.valor),
    recuperacaoPorTipo: [...recTipo.entries()].map(([tipo, valor]) => ({ tipo, valor })),
    porProduto: [...produtos.values()].sort((a, b) => (b.taxaDevolucao ?? 0) - (a.taxaDevolucao ?? 0)),
  };
}
