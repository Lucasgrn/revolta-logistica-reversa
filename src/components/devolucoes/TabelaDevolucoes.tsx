"use client";
import Link from "next/link";
import { Table, Tooltip } from "antd";
import { WarningOutlined } from "@ant-design/icons";
import type { LinhaDevolucao } from "@/servicos/consultas";
import { MOTIVO } from "@/domain/rotulos";
import { brl, data, kg } from "@/lib/formato";
import { TagCanal, TagStatus } from "@/components/Tags";

export function TabelaDevolucoes({ linhas }: { linhas: LinhaDevolucao[] }) {
  return (
    <Table
      rowKey="id"
      size="middle"
      dataSource={linhas}
      scroll={{ x: 1100 }}
      pagination={{ pageSize: 15, showTotal: (t) => `${t} devoluções`, showSizeChanger: false }}
      rowClassName={(r) => (r.canal === "POS_VENDA" ? "borda-pos-venda" : "borda-pos-consumo")}
      columns={[
        {
          title: "Protocolo", dataIndex: "protocolo", fixed: "left", width: 150,
          render: (p: string, r) => (
            <Link href={`/devolucoes/${r.id}`} className="font-mono font-medium">
              {p} {r.alertas > 0 && <Tooltip title="Possui alerta de política"><WarningOutlined className="text-amber-500" /></Tooltip>}
            </Link>
          ),
        },
        { title: "Canal", dataIndex: "canal", width: 130, render: (c) => <TagCanal canal={c} /> },
        { title: "Status", dataIndex: "status", width: 120, render: (s) => <TagStatus status={s} /> },
        { title: "Motivo", dataIndex: "motivo", width: 190, render: (m: LinhaDevolucao["motivo"]) => MOTIVO[m].rotulo },
        { title: "Cliente", dataIndex: "cliente", ellipsis: true },
        { title: "Produtos", dataIndex: "produtos", ellipsis: true, render: (p: string, r) => <span title={p}>{r.itens}× {p}</span> },
        { title: "Massa", dataIndex: "massaKg", align: "right", width: 90, render: kg },
        { title: "Custo reverso", dataIndex: "custo", align: "right", width: 120, render: brl, sorter: (a, b) => a.custo - b.custo },
        { title: "Recuperado", dataIndex: "recuperado", align: "right", width: 120, render: brl, sorter: (a, b) => a.recuperado - b.recuperado },
        { title: "Abertura", dataIndex: "criadaEm", width: 100, render: data, sorter: (a, b) => a.criadaEm.localeCompare(b.criadaEm) },
      ]}
    />
  );
}
