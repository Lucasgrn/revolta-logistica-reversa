import { describe, expect, it } from "vitest";
import {
  custosAutomaticos,
  impactoAmbiental,
  sugerirDestinacao,
  valorRecuperadoEstimado,
  type ParametrosDominio,
  type ProdutoDominio,
} from "../destinacao";
import { alertasDePolitica } from "../politica";
import { podeTransitar, pode, todosItensDestinados } from "../fluxo";
import { calcularIndicadores } from "../indicadores";

const vidro = { nome: "Vidro", fatorCo2: 0.3, precoSucata: 0.15, reciclavel: true, perigoso: false };
const aluminio = { nome: "Alumínio", fatorCo2: 9, precoSucata: 6.5, reciclavel: true, perigoso: false };
const eva = { nome: "Polímeros EVA", fatorCo2: 0, precoSucata: 0, reciclavel: false, perigoso: false };

const painel: ProdutoDominio = {
  nome: "Painel 550W",
  categoria: "PAINEL_SOLAR",
  preco: 900,
  custo: 600,
  garantiaMeses: 12,
  composicao: [
    { massaKg: 20, material: vidro },
    { massaKg: 3, material: aluminio },
    { massaKg: 2, material: eva },
  ],
};

const params: ParametrosDominio = {
  prazoArrependimentoDias: 7,
  custoTriagemItem: 18,
  custoArmazenagemDia: 1.5,
  custoEmbalagemItem: 12,
  custoReparoPercentual: 0.15,
  custoDescarteKg: 2.8,
  custoTransporteKg: 0.45,
  pctRevendaEstoque: 1,
  pctRevendaRecondicionado: 0.6,
  pctPecas: 0.15,
  pctCreditoFornecedor: 1,
};

describe("sugestão de destinação", () => {
  it("segue a condição do item", () => {
    expect(sugerirDestinacao({ condicao: "A", dentroGarantia: false, produto: painel }).destinacao).toBe("RETORNO_ESTOQUE");
    expect(sugerirDestinacao({ condicao: "B", dentroGarantia: false, produto: painel }).destinacao).toBe("RECONDICIONAMENTO");
    expect(sugerirDestinacao({ condicao: "C", dentroGarantia: true, produto: painel }).destinacao).toBe("DEVOLUCAO_FORNECEDOR");
    expect(sugerirDestinacao({ condicao: "C", dentroGarantia: false, produto: painel }).destinacao).toBe("RECONDICIONAMENTO");
    expect(sugerirDestinacao({ condicao: "C", dentroGarantia: false, produto: { ...painel, preco: 30 } }).destinacao).toBe("DESMONTAGEM_PECAS");
    expect(sugerirDestinacao({ condicao: "D", dentroGarantia: false, produto: painel }).destinacao).toBe("RECICLAGEM");
    expect(
      sugerirDestinacao({ condicao: "D", dentroGarantia: false, produto: { ...painel, composicao: [{ massaKg: 5, material: eva }] } }).destinacao,
    ).toBe("DESCARTE");
  });
});

describe("valor recuperado e custos", () => {
  it("estima a sucata só dos materiais recicláveis", () => {
    expect(valorRecuperadoEstimado("RECICLAGEM", painel, params)).toEqual({ tipo: "SUCATA", valor: 22.5 });
    expect(valorRecuperadoEstimado("DEVOLUCAO_FORNECEDOR", painel, params)).toEqual({ tipo: "CREDITO_FORNECEDOR", valor: 600 });
    expect(valorRecuperadoEstimado("DESCARTE", painel, params)).toBeNull();
  });

  it("calcula armazenagem pelos dias e descarte pelo rejeito", () => {
    const custos = custosAutomaticos({
      destinacao: "RECICLAGEM",
      produto: painel,
      parametros: params,
      recebidaEm: new Date("2026-01-01"),
      destinadoEm: new Date("2026-01-11"),
    });
    expect(custos.find((c) => c.tipo === "ARMAZENAGEM")?.valor).toBe(15);
    // 25 kg × 0,45 + 2 kg de rejeito × 2,80
    expect(custos.find((c) => c.tipo === "TRANSPORTE_DESCARTE")?.valor).toBe(16.85);
  });
});

describe("impacto ambiental", () => {
  it("reciclagem desvia só a parcela reciclável", () => {
    const i = impactoAmbiental("RECICLAGEM", painel.composicao);
    expect(i.massaDesviadaKg).toBe(23);
    expect(i.massaAterroKg).toBe(2);
    expect(i.co2EvitadoKg).toBeCloseTo(20 * 0.3 + 3 * 9);
  });
  it("descarte não desvia nada", () => {
    expect(impactoAmbiental("DESCARTE", painel.composicao).massaDesviadaKg).toBe(0);
  });
});

describe("alertas de política", () => {
  it("alerta arrependimento fora do prazo sem bloquear", () => {
    const a = alertasDePolitica({
      canal: "POS_VENDA",
      motivo: "ARREPENDIMENTO",
      dataEntrega: new Date("2026-01-01"),
      dataSolicitacao: new Date("2026-01-15"),
      prazoArrependimentoDias: 7,
      produtos: [painel],
    });
    expect(a).toHaveLength(1);
  });
  it("não gera alertas no pós-consumo", () => {
    expect(
      alertasDePolitica({ canal: "POS_CONSUMO", motivo: "FIM_DE_VIDA", dataSolicitacao: new Date(), prazoArrependimentoDias: 7, produtos: [] }),
    ).toEqual([]);
  });
});

describe("fluxo e permissões", () => {
  it("valida transições e papéis", () => {
    expect(podeTransitar("SOLICITADA", "EM_TRANSITO")).toBe(true);
    expect(podeTransitar("EM_TRIAGEM", "RECUSADA")).toBe(false);
    expect(pode("OPERADOR", "triar")).toBe(false);
    expect(pode("GESTOR", "encerrar")).toBe(true);
    expect(todosItensDestinados([{ destinacao: "RECICLAGEM" }, { destinacao: null }])).toBe(false);
  });
});

describe("indicadores", () => {
  it("consolida taxa de reaproveitamento e resultado líquido", () => {
    const ind = calcularIndicadores(
      [
        {
          canal: "POS_VENDA",
          motivo: "DEFEITO",
          status: "ENCERRADA",
          criadaEm: new Date("2026-03-01"),
          encerradaEm: new Date("2026-03-11"),
          itens: [{ destinacao: "RECICLAGEM", produto: { ...painel, id: 1, sku: "P1" } }],
          custos: [{ tipo: "FRETE_REVERSO", valor: 50 }],
          recuperacoes: [{ tipo: "SUCATA", valor: 22.5 }],
        },
      ],
      new Map([[1, 10]]),
    );
    expect(ind.kpis.taxaReaproveitamento).toBeCloseTo(23 / 25);
    expect(ind.kpis.resultadoLiquido).toBeCloseTo(-27.5);
    expect(ind.kpis.tempoMedioCicloDias).toBe(10);
    expect(ind.porProduto[0].taxaDevolucao).toBeCloseTo(0.1);
  });

  it("não conta pós-consumo na taxa de devolução", () => {
    const ind = calcularIndicadores(
      [{ canal: "POS_CONSUMO", motivo: "FIM_DE_VIDA", status: "SOLICITADA", criadaEm: new Date("2026-03-01"), encerradaEm: null,
         itens: [{ destinacao: null, produto: { ...painel, id: 1, sku: "P1" } }], custos: [], recuperacoes: [] }],
      new Map([[1, 10]]),
    );
    expect(ind.porProduto).toHaveLength(0);
    expect(ind.kpis.itens).toBe(1);
  });
});
