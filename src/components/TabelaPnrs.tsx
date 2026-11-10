"use client";
import { Table, Tag } from "antd";
import type { LinhaPnrs } from "@/servicos/consultas";
import { CATEGORIA, DESTINACAO, DESTINACOES_ORDENADAS } from "@/domain/rotulos";
import { kg, pct } from "@/lib/formato";
import { TagCanal } from "./Tags";

/** Categorias sujeitas a sistemas de logística reversa obrigatória (PNRS art. 33 e Decreto 10.240/2020). */
const OBRIGATORIA: Record<string, string> = {
  BATERIA: "Pilhas e baterias (art. 33, II; CONAMA 401/2008)",
  ILUMINACAO_LED: "Eletroeletrônicos (art. 33, VI) — LED",
  PAINEL_SOLAR: "Eletroeletrônicos (art. 33, VI)",
  INVERSOR: "Eletroeletrônicos (art. 33, VI)",
  MEDIDOR: "Eletroeletrônicos (art. 33, VI)",
  CABOS_CONECTORES: "Eletroeletrônicos e componentes (art. 33, VI)",
};

export function TabelaPnrs({ linhas }: { linhas: LinhaPnrs[] }) {
  const total = linhas.reduce(
    (s, l) => ({ r: s.r + l.massaRecebidaKg, d: s.d + l.massaDestinadaKg, v: s.v + l.massaDesviadaKg, p: s.p + l.massaPerigosaKg, c: s.c + l.co2EvitadoKg }),
    { r: 0, d: 0, v: 0, p: 0, c: 0 },
  );
  return (
    <Table
      rowKey={(l) => `${l.categoria}-${l.canal}`}
      size="small"
      pagination={false}
      scroll={{ x: 1200 }}
      dataSource={linhas}
      rowClassName={(l) => (l.canal === "POS_VENDA" ? "borda-pos-venda" : "borda-pos-consumo")}
      columns={[
        { title: "Categoria", dataIndex: "categoria", fixed: "left", width: 200, render: (c: string) => <><div className="font-medium">{CATEGORIA[c as keyof typeof CATEGORIA]}</div><div className="text-xs text-gray-500">{OBRIGATORIA[c]}</div></> },
        { title: "Canal", dataIndex: "canal", width: 130, render: (c) => <TagCanal canal={c} /> },
        { title: "Unidades", dataIndex: "unidades", align: "right", width: 90 },
        { title: "Massa recebida", dataIndex: "massaRecebidaKg", align: "right", render: kg },
        { title: "Massa destinada", dataIndex: "massaDestinadaKg", align: "right", render: kg },
        { title: "Desviada de aterro", dataIndex: "massaDesviadaKg", align: "right", render: (v: number, l) => <>{kg(v)} <span className="text-xs text-gray-500">({pct(l.massaDestinadaKg ? v / l.massaDestinadaKg : null)})</span></> },
        { title: "Perigosos tratados", dataIndex: "massaPerigosaKg", align: "right", render: (v: number) => (v > 0 ? <Tag color="orange">{kg(v)}</Tag> : "—") },
        { title: "CO₂e evitado", dataIndex: "co2EvitadoKg", align: "right", render: kg },
        {
          title: "Destinação (massa)", width: 280,
          render: (_, l) => (
            <ul className="space-y-0.5 text-xs">
              {DESTINACOES_ORDENADAS.filter((d) => l.porDestinacao[d]).map((d) => (
                <li key={d} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: DESTINACAO[d].corHex }} />{DESTINACAO[d].rotulo}</span>
                  <span className="tabular-nums text-gray-600">{kg(l.porDestinacao[d])}</span>
                </li>
              ))}
            </ul>
          ),
        },
      ]}
      summary={() => (
        <Table.Summary.Row className="font-semibold">
          <Table.Summary.Cell index={0} colSpan={3}>Total</Table.Summary.Cell>
          <Table.Summary.Cell index={3} align="right">{kg(total.r)}</Table.Summary.Cell>
          <Table.Summary.Cell index={4} align="right">{kg(total.d)}</Table.Summary.Cell>
          <Table.Summary.Cell index={5} align="right">{kg(total.v)} ({pct(total.d ? total.v / total.d : null)})</Table.Summary.Cell>
          <Table.Summary.Cell index={6} align="right">{kg(total.p)}</Table.Summary.Cell>
          <Table.Summary.Cell index={7} align="right">{kg(total.c)}</Table.Summary.Cell>
          <Table.Summary.Cell index={8} />
        </Table.Summary.Row>
      )}
    />
  );
}
