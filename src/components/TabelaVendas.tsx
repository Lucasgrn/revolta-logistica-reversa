"use client";
import { Table } from "antd";
import { brl, data } from "@/lib/formato";

export interface LinhaVenda { id: number; numero: string; cliente: string; cidade: string; dataEntrega: Date; itens: string; total: number; devolucoes: number }

export function TabelaVendas({ linhas }: { linhas: LinhaVenda[] }) {
  return (
    <Table
      rowKey="id" size="small" dataSource={linhas} scroll={{ x: 900 }}
      pagination={{ pageSize: 20, showSizeChanger: false, showTotal: (t) => `${t} vendas` }}
      columns={[
        { title: "Número", dataIndex: "numero", width: 120, className: "font-mono" },
        { title: "Cliente", dataIndex: "cliente", ellipsis: true },
        { title: "Cidade", dataIndex: "cidade", width: 160 },
        { title: "Entrega", dataIndex: "dataEntrega", width: 100, render: data, sorter: (a, b) => +new Date(a.dataEntrega) - +new Date(b.dataEntrega) },
        { title: "Itens", dataIndex: "itens", ellipsis: true },
        { title: "Total", dataIndex: "total", align: "right", width: 130, render: brl, sorter: (a, b) => a.total - b.total },
        { title: "Devoluções", dataIndex: "devolucoes", align: "right", width: 100 },
      ]}
    />
  );
}
