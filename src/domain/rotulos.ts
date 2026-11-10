// Rótulos e cores de exibição dos conceitos do domínio (pt-BR).
import type {
  Canal,
  Categoria,
  Condicao,
  Destinacao,
  Motivo,
  Papel,
  StatusDevolucao,
  TipoCusto,
  TipoRecuperacao,
} from "../generated/prisma/enums";

export const PAPEL: Record<Papel, string> = {
  OPERADOR: "Operador de Recebimento",
  ANALISTA: "Analista de Triagem",
  GESTOR: "Gestor",
};

export const CANAL: Record<Canal, { rotulo: string; cor: string; corHex: string; descricao: string }> = {
  POS_VENDA: {
    rotulo: "Pós-venda",
    cor: "geekblue",
    corHex: "#2a78d6",
    descricao: "Retorno logo após a compra (arrependimento, defeito, avaria, garantia)",
  },
  POS_CONSUMO: {
    rotulo: "Pós-consumo",
    cor: "green",
    corHex: "#1baf7a",
    descricao: "Produto em fim de vida útil entregue para destinação adequada (PNRS)",
  },
};

export const MOTIVO: Record<Motivo, { rotulo: string; canal: Canal }> = {
  ARREPENDIMENTO: { rotulo: "Arrependimento (CDC art. 49)", canal: "POS_VENDA" },
  DEFEITO: { rotulo: "Defeito", canal: "POS_VENDA" },
  AVARIA_TRANSPORTE: { rotulo: "Avaria no transporte", canal: "POS_VENDA" },
  ITEM_ERRADO: { rotulo: "Item errado", canal: "POS_VENDA" },
  GARANTIA: { rotulo: "Acionamento de garantia", canal: "POS_VENDA" },
  FIM_DE_VIDA: { rotulo: "Fim de vida útil", canal: "POS_CONSUMO" },
  TROCA_TECNOLOGICA: { rotulo: "Troca tecnológica / upgrade", canal: "POS_CONSUMO" },
};

export const motivosDoCanal = (canal: Canal) =>
  (Object.keys(MOTIVO) as Motivo[]).filter((m) => MOTIVO[m].canal === canal);

export const STATUS: Record<StatusDevolucao, { rotulo: string; cor: string }> = {
  SOLICITADA: { rotulo: "Solicitada", cor: "default" },
  EM_TRANSITO: { rotulo: "Em trânsito", cor: "processing" },
  RECEBIDA: { rotulo: "Recebida", cor: "cyan" },
  EM_TRIAGEM: { rotulo: "Em triagem", cor: "orange" },
  DESTINADA: { rotulo: "Destinada", cor: "purple" },
  ENCERRADA: { rotulo: "Encerrada", cor: "success" },
  RECUSADA: { rotulo: "Recusada", cor: "error" },
};

export const CONDICAO: Record<Condicao, { rotulo: string; descricao: string; cor: string }> = {
  A: { rotulo: "A — Como novo", descricao: "Lacrado ou sem sinais de uso", cor: "green" },
  B: { rotulo: "B — Uso aparente", descricao: "Marcas de uso, totalmente funcional", cor: "lime" },
  C: { rotulo: "C — Defeituoso reparável", descricao: "Falha que pode ser corrigida", cor: "orange" },
  D: { rotulo: "D — Irrecuperável", descricao: "Sem possibilidade de reuso como produto", cor: "red" },
};

/** Destinações em ordem de prioridade da hierarquia de resíduos (PNRS art. 9º). */
export const DESTINACAO: Record<Destinacao, { rotulo: string; cor: string; corHex: string; ordem: number }> = {
  RETORNO_ESTOQUE: { rotulo: "Retorno ao estoque", cor: "green", corHex: "#1baf7a", ordem: 1 },
  RECONDICIONAMENTO: { rotulo: "Recondicionamento", cor: "cyan", corHex: "#2a78d6", ordem: 2 },
  DEVOLUCAO_FORNECEDOR: { rotulo: "Devolução ao fornecedor", cor: "blue", corHex: "#6250d6", ordem: 3 },
  DESMONTAGEM_PECAS: { rotulo: "Desmontagem para peças", cor: "purple", corHex: "#e87ba4", ordem: 4 },
  RECICLAGEM: { rotulo: "Reciclagem", cor: "gold", corHex: "#eda100", ordem: 5 },
  DESCARTE: { rotulo: "Descarte adequado", cor: "volcano", corHex: "#eb6834", ordem: 6 },
};

export const DESTINACOES_ORDENADAS = (Object.keys(DESTINACAO) as Destinacao[]).sort(
  (a, b) => DESTINACAO[a].ordem - DESTINACAO[b].ordem,
);

export const CATEGORIA: Record<Categoria, string> = {
  PAINEL_SOLAR: "Painéis solares",
  INVERSOR: "Inversores",
  BATERIA: "Baterias",
  MEDIDOR: "Medidores",
  ILUMINACAO_LED: "Iluminação LED",
  CABOS_CONECTORES: "Cabos e conectores",
};

export const TIPO_CUSTO: Record<TipoCusto, string> = {
  FRETE_REVERSO: "Frete reverso",
  TRIAGEM: "Triagem e inspeção",
  REPARO: "Reparo / recondicionamento",
  ARMAZENAGEM: "Armazenagem",
  TRANSPORTE_DESCARTE: "Transporte ao destino / taxa de descarte",
  EMBALAGEM: "Embalagem / reembalagem",
};

export const TIPO_RECUPERACAO: Record<TipoRecuperacao, string> = {
  REVENDA: "Revenda",
  CREDITO_FORNECEDOR: "Crédito do fornecedor",
  SUCATA: "Venda de sucata",
};
