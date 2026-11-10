// Ciclo de vida da Devolução e permissões por papel.
import type { Papel, StatusDevolucao, TipoCusto } from "../generated/prisma/enums";

export const ETAPAS: StatusDevolucao[] = [
  "SOLICITADA",
  "EM_TRANSITO",
  "RECEBIDA",
  "EM_TRIAGEM",
  "DESTINADA",
  "ENCERRADA",
];

/** Transições válidas do ciclo de vida. */
export const TRANSICOES: Record<StatusDevolucao, StatusDevolucao[]> = {
  SOLICITADA: ["EM_TRANSITO", "RECUSADA"],
  EM_TRANSITO: ["RECEBIDA"],
  RECEBIDA: ["EM_TRIAGEM", "RECUSADA"],
  EM_TRIAGEM: ["DESTINADA"],
  DESTINADA: ["ENCERRADA"],
  ENCERRADA: [],
  RECUSADA: [],
};

export function podeTransitar(de: StatusDevolucao, para: StatusDevolucao) {
  return TRANSICOES[de].includes(para);
}

export type Acao =
  | "registrarDevolucao"
  | "registrarTransito"
  | "registrarRecebimento"
  | "triar"
  | "recusar"
  | "encerrar"
  | "lancarFinanceiro"
  | "verPainel"
  | "gerirCadastros";

const PERMISSOES: Record<Acao, Papel[]> = {
  registrarDevolucao: ["OPERADOR", "GESTOR"],
  registrarTransito: ["OPERADOR", "GESTOR"],
  registrarRecebimento: ["OPERADOR", "GESTOR"],
  triar: ["ANALISTA", "GESTOR"],
  recusar: ["ANALISTA", "GESTOR"],
  encerrar: ["GESTOR"],
  lancarFinanceiro: ["OPERADOR", "ANALISTA", "GESTOR"],
  verPainel: ["OPERADOR", "ANALISTA", "GESTOR"],
  gerirCadastros: ["GESTOR"],
};

export function pode(papel: Papel, acao: Acao) {
  return PERMISSOES[acao].includes(papel);
}

/** Tipos de custo que cada papel pode lançar manualmente. */
const CUSTOS_POR_PAPEL: Record<Papel, TipoCusto[]> = {
  OPERADOR: ["FRETE_REVERSO", "EMBALAGEM"],
  ANALISTA: ["TRIAGEM", "REPARO", "TRANSPORTE_DESCARTE", "ARMAZENAGEM"],
  GESTOR: ["FRETE_REVERSO", "TRIAGEM", "REPARO", "ARMAZENAGEM", "TRANSPORTE_DESCARTE", "EMBALAGEM"],
};

export function custosPermitidos(papel: Papel) {
  return CUSTOS_POR_PAPEL[papel];
}

/** A Devolução fica Destinada quando todo Item Devolvido tem destinação. */
export function todosItensDestinados(itens: { destinacao: unknown }[]) {
  return itens.length > 0 && itens.every((i) => i.destinacao != null);
}
