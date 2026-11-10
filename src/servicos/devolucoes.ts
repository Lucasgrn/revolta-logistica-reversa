// Serviços do fluxo reverso: aplicam as regras do domínio e persistem o resultado.
// Usados pelas Server Actions (com usuário autenticado) e pelo seed (com datas passadas).
import type { Prisma } from "../generated/prisma/client";
import type {
  Canal,
  Condicao,
  Destinacao,
  Motivo,
  Origem,
  StatusDevolucao,
  TipoCusto,
} from "../generated/prisma/enums";
import { custosAutomaticos, sugerirDestinacao, valorRecuperadoEstimado, type ParametrosDominio, type ProdutoDominio } from "../domain/destinacao";
import { podeTransitar, todosItensDestinados } from "../domain/fluxo";
import { alertasDePolitica, dentroDaGarantia } from "../domain/politica";
import { STATUS } from "../domain/rotulos";

type Tx = Prisma.TransactionClient;

export class ErroDominio extends Error {}

export const INCLUDE_PRODUTO = { composicao: { include: { material: true } } } as const;

export async function obterParametros(tx: Tx): Promise<ParametrosDominio> {
  const p = await tx.parametros.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  return p;
}

const ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function gerarProtocolo(em: Date, aleatorio: () => number = Math.random) {
  const sufixo = Array.from({ length: 5 }, () => ALFABETO[Math.floor(aleatorio() * ALFABETO.length)]).join("");
  const aamm = `${String(em.getUTCFullYear()).slice(2)}${String(em.getUTCMonth() + 1).padStart(2, "0")}`;
  return `RV-${aamm}-${sufixo}`;
}

async function transitar(
  tx: Tx,
  devolucaoId: number,
  para: StatusDevolucao,
  usuario: string,
  em: Date,
  observacao = "",
  dados: Prisma.DevolucaoUpdateInput = {},
) {
  const d = await tx.devolucao.findUniqueOrThrow({ where: { id: devolucaoId } });
  if (!podeTransitar(d.status, para)) {
    throw new ErroDominio(`Não é possível passar de "${STATUS[d.status].rotulo}" para "${STATUS[para].rotulo}".`);
  }
  await tx.devolucao.update({ where: { id: devolucaoId }, data: { ...dados, status: para } });
  await tx.historicoStatus.create({
    data: { devolucaoId, de: d.status, para, usuario, observacao, em },
  });
  return d;
}

// ───────────── Abertura ─────────────

export interface AberturaDevolucao {
  canal: Canal;
  motivo: Motivo;
  origem: Origem;
  clienteId: number;
  vendaId?: number | null;
  descricao?: string;
  itens: { produtoId: number; quantidade: number }[];
  usuario: string;
  em?: Date;
  protocolo?: string;
}

export async function abrirDevolucao(tx: Tx, a: AberturaDevolucao) {
  const em = a.em ?? new Date();
  if (a.itens.length === 0 || a.itens.some((i) => i.quantidade < 1)) {
    throw new ErroDominio("Informe ao menos um produto com quantidade válida.");
  }
  if (a.canal === "POS_VENDA" && !a.vendaId) {
    throw new ErroDominio("Devoluções de pós-venda precisam estar vinculadas a uma venda.");
  }

  const parametros = await obterParametros(tx);
  const venda = a.vendaId ? await tx.venda.findUniqueOrThrow({ where: { id: a.vendaId }, include: { itens: true } }) : null;
  if (venda) {
    if (venda.clienteId !== a.clienteId) throw new ErroDominio("A venda não pertence a este cliente.");
    for (const i of a.itens) {
      const vendido = venda.itens.filter((v) => v.produtoId === i.produtoId).reduce((s, v) => s + v.quantidade, 0);
      if (i.quantidade > vendido) throw new ErroDominio("Quantidade devolvida maior que a vendida.");
    }
  }
  const produtos = await tx.produto.findMany({ where: { id: { in: a.itens.map((i) => i.produtoId) } } });

  const alertas = alertasDePolitica({
    canal: a.canal,
    motivo: a.motivo,
    dataSolicitacao: em,
    dataEntrega: venda?.dataEntrega,
    prazoArrependimentoDias: parametros.prazoArrependimentoDias,
    produtos,
  });

  const devolucao = await tx.devolucao.create({
    data: {
      protocolo: a.protocolo ?? gerarProtocolo(em),
      canal: a.canal,
      motivo: a.motivo,
      origem: a.origem,
      descricao: a.descricao ?? "",
      alertas,
      clienteId: a.clienteId,
      vendaId: a.vendaId ?? null,
      criadaEm: em,
      itens: {
        create: a.itens.flatMap((i) => Array.from({ length: i.quantidade }, () => ({ produtoId: i.produtoId }))),
      },
      historico: {
        create: { para: "SOLICITADA", usuario: a.usuario, em, observacao: a.origem === "PORTAL" ? "Aberta pelo Portal do Cliente" : "" },
      },
    },
  });
  return devolucao;
}

// ───────────── Transporte e recebimento ─────────────

export async function registrarTransito(
  tx: Tx,
  devolucaoId: number,
  r: { transportadora: string; rastreio?: string; valorFrete: number; usuario: string; em?: Date },
) {
  const em = r.em ?? new Date();
  await transitar(tx, devolucaoId, "EM_TRANSITO", r.usuario, em, `Coleta/postagem por ${r.transportadora}`, {
    transportadora: r.transportadora,
    rastreio: r.rastreio ?? null,
  });
  if (r.valorFrete > 0) {
    await tx.custoReverso.create({
      data: { devolucaoId, tipo: "FRETE_REVERSO", valor: r.valorFrete, descricao: r.transportadora, criadoEm: em },
    });
  }
}

export async function registrarRecebimento(
  tx: Tx,
  devolucaoId: number,
  r: { usuario: string; observacao?: string; em?: Date },
) {
  const em = r.em ?? new Date();
  await transitar(tx, devolucaoId, "RECEBIDA", r.usuario, em, r.observacao ?? "Conferência física realizada", {
    recebidaEm: em,
  });
}

export async function iniciarTriagem(tx: Tx, devolucaoId: number, r: { usuario: string; em?: Date }) {
  await transitar(tx, devolucaoId, "EM_TRIAGEM", r.usuario, r.em ?? new Date());
}

export async function recusarDevolucao(tx: Tx, devolucaoId: number, r: { justificativa: string; usuario: string; em?: Date }) {
  if (!r.justificativa.trim()) throw new ErroDominio("Informe a justificativa da recusa.");
  await transitar(tx, devolucaoId, "RECUSADA", r.usuario, r.em ?? new Date(), r.justificativa);
}

export async function encerrarDevolucao(tx: Tx, devolucaoId: number, r: { usuario: string; em?: Date }) {
  const em = r.em ?? new Date();
  await transitar(tx, devolucaoId, "ENCERRADA", r.usuario, em, "Custos e valores recuperados consolidados", {
    encerradaEm: em,
  });
}

// ───────────── Triagem: inspeção + destinação de um item ─────────────

function dominioProduto(p: Prisma.ProdutoGetPayload<{ include: typeof INCLUDE_PRODUTO }>): ProdutoDominio {
  return p;
}

/** Calcula a sugestão para um item já carregado (usado na tela e no serviço). */
export async function sugestaoParaItem(tx: Tx, itemId: number, condicao: Condicao, em = new Date()) {
  const item = await tx.itemDevolvido.findUniqueOrThrow({
    where: { id: itemId },
    include: { produto: { include: INCLUDE_PRODUTO }, devolucao: { include: { venda: true } } },
  });
  return sugerirDestinacao({
    condicao,
    dentroGarantia: dentroDaGarantia(item.devolucao.venda?.dataEntrega, item.produto.garantiaMeses, em),
    produto: item.produto,
  });
}

export async function destinarItem(
  tx: Tx,
  itemId: number,
  r: {
    condicao: Condicao;
    destinacao: Destinacao;
    observacao?: string;
    numeroSerie?: string;
    /** Sobrescreve o valor estimado pelos parâmetros. */
    valorRecuperado?: number | null;
    usuario: string;
    em?: Date;
  },
) {
  const em = r.em ?? new Date();
  const item = await tx.itemDevolvido.findUniqueOrThrow({
    where: { id: itemId },
    include: { produto: { include: INCLUDE_PRODUTO }, devolucao: { include: { venda: true } } },
  });
  const dev = item.devolucao;
  if (dev.status !== "EM_TRIAGEM") throw new ErroDominio("A devolução precisa estar em triagem.");

  const parametros = await obterParametros(tx);
  const produto = dominioProduto(item.produto);
  const sugestao = sugerirDestinacao({
    condicao: r.condicao,
    dentroGarantia: dentroDaGarantia(dev.venda?.dataEntrega, produto.garantiaMeses, em),
    produto,
  });

  await tx.itemDevolvido.update({
    where: { id: itemId },
    data: {
      condicao: r.condicao,
      destinacao: r.destinacao,
      destinacaoSugerida: sugestao.destinacao,
      observacao: r.observacao ?? null,
      numeroSerie: r.numeroSerie ?? item.numeroSerie,
      inspecionadoPor: r.usuario,
      destinadoEm: em,
    },
  });

  // Recalcula os lançamentos automáticos do item (idempotente ao redestinar).
  await tx.custoReverso.deleteMany({ where: { itemId, automatico: true } });
  await tx.valorRecuperado.deleteMany({ where: { itemId } });

  const custos = custosAutomaticos({
    destinacao: r.destinacao,
    produto,
    parametros,
    recebidaEm: dev.recebidaEm ?? em,
    destinadoEm: em,
  });
  await tx.custoReverso.createMany({
    data: custos.map((c) => ({ ...c, devolucaoId: dev.id, itemId, automatico: true, criadoEm: em })),
  });

  const estimado = valorRecuperadoEstimado(r.destinacao, produto, parametros);
  if (estimado) {
    const manual = r.valorRecuperado != null;
    await tx.valorRecuperado.create({
      data: {
        devolucaoId: dev.id,
        itemId,
        tipo: estimado.tipo,
        valor: manual ? r.valorRecuperado! : estimado.valor,
        estimado: !manual,
        criadoEm: em,
      },
    });
  }

  const itens = await tx.itemDevolvido.findMany({ where: { devolucaoId: dev.id }, select: { destinacao: true } });
  if (todosItensDestinados(itens)) {
    await transitar(tx, dev.id, "DESTINADA", r.usuario, em, "Todos os itens destinados");
  }
}

// ───────────── Lançamentos financeiros manuais ─────────────

export async function lancarCusto(
  tx: Tx,
  devolucaoId: number,
  c: { tipo: TipoCusto; valor: number; descricao?: string; itemId?: number | null; em?: Date },
) {
  const d = await tx.devolucao.findUniqueOrThrow({ where: { id: devolucaoId } });
  if (d.status === "ENCERRADA") throw new ErroDominio("Devolução encerrada: lançamentos bloqueados.");
  if (!(c.valor > 0)) throw new ErroDominio("O valor do custo deve ser positivo.");
  return tx.custoReverso.create({
    data: { devolucaoId, tipo: c.tipo, valor: c.valor, descricao: c.descricao ?? "", itemId: c.itemId ?? null, criadoEm: c.em },
  });
}

export async function removerCusto(tx: Tx, custoId: number) {
  const c = await tx.custoReverso.findUniqueOrThrow({ where: { id: custoId }, include: { devolucao: true } });
  if (c.devolucao.status === "ENCERRADA") throw new ErroDominio("Devolução encerrada: lançamentos bloqueados.");
  await tx.custoReverso.delete({ where: { id: custoId } });
  return c.devolucaoId;
}

export async function confirmarValorRecuperado(tx: Tx, recuperacaoId: number, valor: number) {
  const r = await tx.valorRecuperado.findUniqueOrThrow({ where: { id: recuperacaoId }, include: { devolucao: true } });
  if (r.devolucao.status === "ENCERRADA") throw new ErroDominio("Devolução encerrada: lançamentos bloqueados.");
  if (!(valor >= 0)) throw new ErroDominio("Valor inválido.");
  await tx.valorRecuperado.update({ where: { id: recuperacaoId }, data: { valor, estimado: false } });
  return r.devolucaoId;
}
