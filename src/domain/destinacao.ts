// Regras de processamento de um Item Devolvido:
// sugestão de destinação, valor recuperado estimado, custos reversos automáticos
// e impacto ambiental.
import type { Canal, Categoria, Condicao, Destinacao, TipoCusto, TipoRecuperacao } from "../generated/prisma/enums";
import { diasEntre } from "./politica";

export interface MaterialDominio {
  nome: string;
  fatorCo2: number;
  precoSucata: number;
  reciclavel: boolean;
  perigoso: boolean;
}

export interface ComposicaoDominio {
  massaKg: number;
  material: MaterialDominio;
}

export interface ProdutoDominio {
  nome: string;
  categoria: Categoria;
  preco: number;
  custo: number;
  garantiaMeses: number;
  composicao: ComposicaoDominio[];
}

export interface ParametrosDominio {
  prazoArrependimentoDias: number;
  custoTriagemItem: number;
  custoArmazenagemDia: number;
  custoEmbalagemItem: number;
  custoReparoPercentual: number;
  custoDescarteKg: number;
  custoTransporteKg: number;
  pctRevendaEstoque: number;
  pctRevendaRecondicionado: number;
  /** Revenda de produto de pós-consumo recondicionado para segunda vida (% do preço de novo). */
  pctRevendaSegundaVida: number;
  pctPecas: number;
  pctCreditoFornecedor: number;
}

/** Abaixo deste preço não compensa reparar um item defeituoso fora da garantia. */
export const PRECO_MINIMO_REPARO = 100;
/** Fração mínima de massa reciclável para enviar um item irrecuperável à reciclagem. */
export const FRACAO_MINIMA_RECICLAGEM = 0.5;

/** Número no formato brasileiro (vírgula decimal). */
export const fmt = (v: number, casas = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

export const arred = (v: number, casas = 2) => Math.round(v * 10 ** casas) / 10 ** casas;

export function massaTotal(composicao: ComposicaoDominio[]) {
  return composicao.reduce((s, c) => s + c.massaKg, 0);
}

export function fracaoReciclavel(composicao: ComposicaoDominio[]) {
  const total = massaTotal(composicao);
  if (total === 0) return 0;
  return composicao.filter((c) => c.material.reciclavel).reduce((s, c) => s + c.massaKg, 0) / total;
}

// ───────────── Sugestão de destinação ─────────────

export interface Sugestao {
  destinacao: Destinacao;
  justificativa: string;
}

export function sugerirDestinacao(entrada: {
  canal: Canal;
  condicao: Condicao;
  dentroGarantia: boolean;
  produto: Pick<ProdutoDominio, "preco" | "composicao">;
}): Sugestao {
  const { canal, condicao, dentroGarantia, produto } = entrada;
  if (canal === "POS_CONSUMO" && condicao !== "D") return sugerirPosConsumo(condicao);
  switch (condicao) {
    case "A":
      return { destinacao: "RETORNO_ESTOQUE", justificativa: "Item como novo: volta ao estoque para revenda." };
    case "B":
      return {
        destinacao: "RECONDICIONAMENTO",
        justificativa: "Funcional com marcas de uso: recondicionar e revender como seminovo.",
      };
    case "C":
      if (dentroGarantia)
        return {
          destinacao: "DEVOLUCAO_FORNECEDOR",
          justificativa: "Defeito dentro da garantia do fabricante: devolver ao fornecedor para crédito.",
        };
      if (produto.preco >= PRECO_MINIMO_REPARO)
        return {
          destinacao: "RECONDICIONAMENTO",
          justificativa: "Defeito reparável fora da garantia e valor que justifica o reparo.",
        };
      return {
        destinacao: "DESMONTAGEM_PECAS",
        justificativa: `Reparo não compensa (preço < R$ ${PRECO_MINIMO_REPARO}): aproveitar componentes.`,
      };
    case "D": {
      const fracao = fracaoReciclavel(produto.composicao);
      if (fracao >= FRACAO_MINIMA_RECICLAGEM)
        return {
          destinacao: "RECICLAGEM",
          justificativa: `Irrecuperável, mas ${Math.round(fracao * 100)}% da massa é reciclável.`,
        };
      return {
        destinacao: "DESCARTE",
        justificativa: `Irrecuperável e só ${Math.round(fracao * 100)}% da massa é reciclável: descarte adequado.`,
      };
    }
  }
}

/**
 * Pós-consumo: o produto já cumpriu sua vida útil com o cliente. Ele nunca volta ao estoque
 * como novo; quando funcional, ganha uma segunda vida recondicionado; com defeito,
 * o reparo não se justifica e os componentes são aproveitados.
 */
function sugerirPosConsumo(condicao: Exclude<Condicao, "D">): Sugestao {
  if (condicao === "C")
    return {
      destinacao: "DESMONTAGEM_PECAS",
      justificativa: "Produto em fim de vida com defeito: o reparo não se justifica; aproveitar componentes.",
    };
  return {
    destinacao: "RECONDICIONAMENTO",
    justificativa: "Produto de pós-consumo funcional: recondicionar para segunda vida (revenda como usado).",
  };
}

// ───────────── Valor recuperado estimado ─────────────

export interface Recuperacao {
  tipo: TipoRecuperacao;
  valor: number;
}

export function valorRecuperadoEstimado(
  destinacao: Destinacao,
  produto: ProdutoDominio,
  p: ParametrosDominio,
  canal: Canal,
): Recuperacao | null {
  switch (destinacao) {
    case "RETORNO_ESTOQUE":
      return { tipo: "REVENDA", valor: arred(produto.preco * p.pctRevendaEstoque) };
    case "RECONDICIONAMENTO": {
      const pct = canal === "POS_CONSUMO" ? p.pctRevendaSegundaVida : p.pctRevendaRecondicionado;
      return { tipo: "REVENDA", valor: arred(produto.preco * pct) };
    }
    case "DEVOLUCAO_FORNECEDOR":
      return { tipo: "CREDITO_FORNECEDOR", valor: arred(produto.custo * p.pctCreditoFornecedor) };
    case "DESMONTAGEM_PECAS":
      return { tipo: "REVENDA", valor: arred(produto.preco * p.pctPecas) };
    case "RECICLAGEM": {
      const sucata = produto.composicao
        .filter((c) => c.material.reciclavel)
        .reduce((s, c) => s + c.massaKg * c.material.precoSucata, 0);
      return { tipo: "SUCATA", valor: arred(sucata) };
    }
    case "DESCARTE":
      return null;
  }
}

// ───────────── Custos reversos automáticos (por item) ─────────────

export interface CustoCalculado {
  tipo: TipoCusto;
  valor: number;
  descricao: string;
}

export function custosAutomaticos(entrada: {
  destinacao: Destinacao;
  produto: ProdutoDominio;
  parametros: ParametrosDominio;
  recebidaEm: Date;
  destinadoEm: Date;
}): CustoCalculado[] {
  const { destinacao, produto, parametros: p } = entrada;
  const massa = massaTotal(produto.composicao);
  const custos: CustoCalculado[] = [
    { tipo: "TRIAGEM", valor: p.custoTriagemItem, descricao: "Inspeção e classificação do item" },
  ];

  const dias = Math.max(1, diasEntre(entrada.recebidaEm, entrada.destinadoEm));
  custos.push({
    tipo: "ARMAZENAGEM",
    valor: arred(dias * p.custoArmazenagemDia),
    descricao: `${dias} dia(s) × R$ ${fmt(p.custoArmazenagemDia)}`,
  });

  if (destinacao === "RECONDICIONAMENTO") {
    custos.push({
      tipo: "REPARO",
      valor: arred(produto.preco * p.custoReparoPercentual),
      descricao: `${Math.round(p.custoReparoPercentual * 100)}% do preço de venda`,
    });
  }

  if (destinacao === "RETORNO_ESTOQUE" || destinacao === "RECONDICIONAMENTO") {
    custos.push({ tipo: "EMBALAGEM", valor: p.custoEmbalagemItem, descricao: "Reembalagem para revenda" });
  }

  if (destinacao === "DEVOLUCAO_FORNECEDOR" || destinacao === "DESMONTAGEM_PECAS") {
    custos.push({
      tipo: "TRANSPORTE_DESCARTE",
      valor: arred(massa * p.custoTransporteKg),
      descricao: `Transporte de ${fmt(massa)} kg`,
    });
  }

  if (destinacao === "RECICLAGEM") {
    const rejeito = massa * (1 - fracaoReciclavel(produto.composicao));
    custos.push({
      tipo: "TRANSPORTE_DESCARTE",
      valor: arred(massa * p.custoTransporteKg + rejeito * p.custoDescarteKg),
      descricao: `Transporte de ${fmt(massa)} kg + descarte de ${fmt(rejeito)} kg de rejeito`,
    });
  }

  if (destinacao === "DESCARTE") {
    custos.push({
      tipo: "TRANSPORTE_DESCARTE",
      valor: arred(massa * (p.custoTransporteKg + p.custoDescarteKg)),
      descricao: `Transporte e disposição final de ${fmt(massa)} kg`,
    });
  }

  return custos;
}

// ───────────── Impacto ambiental (por item) ─────────────

export interface Impacto {
  massaKg: number;
  massaDesviadaKg: number;
  massaAterroKg: number;
  co2EvitadoKg: number;
  massaPerigosaKg: number;
}

/**
 * Reuso (estoque, recondicionamento, fornecedor, peças) desvia toda a massa do aterro;
 * reciclagem desvia só a parcela reciclável; descarte não desvia nada.
 * CO₂e evitado = Σ (massa desviada de cada material × fator do material).
 */
export function impactoAmbiental(destinacao: Destinacao, composicao: ComposicaoDominio[]): Impacto {
  let desviada = 0;
  let co2 = 0;
  for (const c of composicao) {
    const aproveita =
      destinacao === "DESCARTE" ? false : destinacao === "RECICLAGEM" ? c.material.reciclavel : true;
    if (aproveita) {
      desviada += c.massaKg;
      co2 += c.massaKg * c.material.fatorCo2;
    }
  }
  const total = massaTotal(composicao);
  return {
    massaKg: total,
    massaDesviadaKg: desviada,
    massaAterroKg: total - desviada,
    co2EvitadoKg: co2,
    massaPerigosaKg: composicao.filter((c) => c.material.perigoso).reduce((s, c) => s + c.massaKg, 0),
  };
}
