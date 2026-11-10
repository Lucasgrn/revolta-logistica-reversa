"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { App, Button, Form, Input, InputNumber, Modal, Select, Space, Table, Tag } from "antd";
import { DeleteOutlined, EditOutlined, PlusOutlined } from "@ant-design/icons";
import type { Categoria } from "@/generated/prisma/enums";
import { CATEGORIA } from "@/domain/rotulos";
import { fracaoReciclavel, massaTotal } from "@/domain/destinacao";
import { brl, kg, pct } from "@/lib/formato";
import { salvarProduto } from "@/app/acoes/cadastros";

interface Material { id: number; nome: string; fatorCo2: number; precoSucata: number; reciclavel: boolean; perigoso: boolean }
export interface ProdutoCadastro {
  id: number; sku: string; nome: string; categoria: Categoria; preco: number; custo: number; garantiaMeses: number;
  composicao: { materialId: number; massaKg: number; material: Material }[];
}

export function Produtos({ produtos, materiais }: { produtos: ProdutoCadastro[]; materiais: Material[] }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [editando, setEditando] = useState<ProdutoCadastro | "novo" | null>(null);
  const [pendente, iniciar] = useTransition();

  const abrir = (p: ProdutoCadastro | "novo") => setEditando(p);
  const iniciais =
    editando === "novo" || editando == null
      ? { composicao: [{}], garantiaMeses: 12 }
      : { ...editando, composicao: editando.composicao.map((c) => ({ materialId: c.materialId, massaKg: c.massaKg })) };
  const salvar = () =>
    form.validateFields().then((v) =>
      iniciar(async () => {
        const r = await salvarProduto({ ...v, id: editando === "novo" ? undefined : editando?.id });
        if (r.ok) { message.success("Produto salvo"); setEditando(null); router.refresh(); } else message.error(r.erro);
      }),
    );

  return (
    <>
      <div className="mb-3 flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => abrir("novo")}>Novo produto</Button></div>
      <Table
        rowKey="id" size="small" dataSource={produtos} pagination={{ pageSize: 15 }} scroll={{ x: 1000 }}
        expandable={{
          expandedRowRender: (p) => (
            <div className="flex flex-wrap gap-1">
              {p.composicao.map((c) => (
                <Tag key={c.materialId} color={c.material.perigoso ? "orange" : c.material.reciclavel ? "green" : "default"}>{c.material.nome}: {kg(c.massaKg)}</Tag>
              ))}
            </div>
          ),
        }}
        columns={[
          { title: "SKU", dataIndex: "sku", width: 110, className: "font-mono" },
          { title: "Produto", dataIndex: "nome" },
          { title: "Categoria", dataIndex: "categoria", width: 160, render: (c: Categoria) => CATEGORIA[c], filters: Object.entries(CATEGORIA).map(([value, text]) => ({ value, text })), onFilter: (v, p) => p.categoria === v },
          { title: "Preço", dataIndex: "preco", align: "right", width: 110, render: brl },
          { title: "Custo", dataIndex: "custo", align: "right", width: 110, render: brl },
          { title: "Garantia", dataIndex: "garantiaMeses", align: "right", width: 90, render: (m: number) => `${m} meses` },
          { title: "Massa", align: "right", width: 90, render: (_, p) => kg(massaTotal(p.composicao)) },
          { title: "Reciclável", align: "right", width: 100, render: (_, p) => pct(fracaoReciclavel(p.composicao)) },
          { title: "", width: 50, render: (_, p) => <Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrir(p)} aria-label="Editar" /> },
        ]}
      />
      <Modal open={editando != null} width={720} title={editando === "novo" ? "Novo produto" : "Editar produto"} okText="Salvar" confirmLoading={pendente} onOk={salvar} onCancel={() => setEditando(null)} destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={iniciais} key={editando === "novo" ? "novo" : editando?.id}>
          <div className="grid gap-x-4 sm:grid-cols-3">
            <Form.Item name="sku" label="SKU" rules={[{ required: true }]}><Input /></Form.Item>
            <Form.Item name="nome" label="Nome" rules={[{ required: true }]} className="sm:col-span-2"><Input /></Form.Item>
            <Form.Item name="categoria" label="Categoria" rules={[{ required: true }]}><Select options={Object.entries(CATEGORIA).map(([value, label]) => ({ value, label }))} /></Form.Item>
            <Form.Item name="preco" label="Preço de venda (R$)" rules={[{ required: true }]}><InputNumber min={0.01} className="!w-full" decimalSeparator="," /></Form.Item>
            <Form.Item name="custo" label="Custo de aquisição (R$)" rules={[{ required: true }]}><InputNumber min={0.01} className="!w-full" decimalSeparator="," /></Form.Item>
            <Form.Item name="garantiaMeses" label="Garantia (meses)" rules={[{ required: true }]}><InputNumber min={0} max={360} className="!w-full" /></Form.Item>
          </div>
          <Form.List name="composicao">
            {(campos, { add, remove }) => (
              <div>
                <div className="mb-2 text-sm font-medium">Composição de materiais (kg por unidade)</div>
                {campos.map(({ key, name }) => (
                  <Space key={key} align="start" className="!flex [&>.ant-space-item:first-child]:flex-1">
                    <Form.Item name={[name, "materialId"]} rules={[{ required: true, message: "Material" }]} className="!mb-2">
                      <Select placeholder="Material" options={materiais.map((m) => ({ value: m.id, label: m.nome }))} />
                    </Form.Item>
                    <Form.Item name={[name, "massaKg"]} rules={[{ required: true, message: "kg" }]} className="!mb-2">
                      <InputNumber min={0.001} step={0.1} placeholder="kg" decimalSeparator="," />
                    </Form.Item>
                    <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} aria-label="Remover material" />
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add()}>Adicionar material</Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>
    </>
  );
}
