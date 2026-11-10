"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { App, Button, Form, Input, InputNumber, Modal, Switch, Table, Tag } from "antd";
import { EditOutlined, PlusOutlined } from "@ant-design/icons";
import { brl } from "@/lib/formato";
import { salvarMaterial } from "@/app/acoes/cadastros";

interface Material { id: number; nome: string; fatorCo2: number; precoSucata: number; reciclavel: boolean; perigoso: boolean; _count: { composicoes: number } }

export function Materiais({ materiais }: { materiais: Material[] }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [editando, setEditando] = useState<Material | "novo" | null>(null);
  const [pendente, iniciar] = useTransition();
  const abrir = (m: Material | "novo") => setEditando(m);
  const iniciais = editando === "novo" || editando == null ? { reciclavel: true, perigoso: false, fatorCo2: 0, precoSucata: 0 } : editando;
  const salvar = () =>
    form.validateFields().then((v) =>
      iniciar(async () => {
        const r = await salvarMaterial({ nome: v.nome, fatorCo2: v.fatorCo2, precoSucata: v.precoSucata, reciclavel: v.reciclavel, perigoso: v.perigoso, id: editando === "novo" ? undefined : editando?.id });
        if (r.ok) { message.success("Material salvo"); setEditando(null); router.refresh(); } else message.error(r.erro);
      }),
    );
  return (
    <>
      <div className="mb-3 flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => abrir("novo")}>Novo material</Button></div>
      <Table
        rowKey="id" size="small" pagination={false} dataSource={materiais} scroll={{ x: 800 }}
        columns={[
          { title: "Material", dataIndex: "nome" },
          { title: "Fator CO₂e evitado", dataIndex: "fatorCo2", align: "right", render: (v: number) => `${v.toLocaleString("pt-BR")} kgCO₂e/kg` },
          { title: "Preço de sucata", dataIndex: "precoSucata", align: "right", render: (v: number) => `${brl(v)}/kg` },
          { title: "Classificação", render: (_, m) => <>{m.reciclavel ? <Tag color="green">reciclável</Tag> : <Tag>não reciclável</Tag>}{m.perigoso && <Tag color="orange">perigoso</Tag>}</> },
          { title: "Usado em", dataIndex: ["_count", "composicoes"], align: "right", render: (n: number) => `${n} produto(s)` },
          { title: "", width: 50, render: (_, m) => <Button size="small" type="text" icon={<EditOutlined />} onClick={() => abrir(m)} aria-label="Editar" /> },
        ]}
      />
      <Modal open={editando != null} title={editando === "novo" ? "Novo material" : "Editar material"} okText="Salvar" confirmLoading={pendente} onOk={salvar} onCancel={() => setEditando(null)} destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={iniciais} key={editando === "novo" ? "novo" : editando?.id}>
          <Form.Item name="nome" label="Nome" rules={[{ required: true }]}><Input /></Form.Item>
          <div className="grid gap-x-4 sm:grid-cols-2">
            <Form.Item name="fatorCo2" label="Fator de CO₂e evitado (kgCO₂e por kg)" rules={[{ required: true }]}><InputNumber min={0} step={0.1} className="!w-full" decimalSeparator="," /></Form.Item>
            <Form.Item name="precoSucata" label="Preço de sucata (R$/kg)" rules={[{ required: true }]}><InputNumber min={0} step={0.1} className="!w-full" decimalSeparator="," /></Form.Item>
            <Form.Item name="reciclavel" label="Reciclável" valuePropName="checked"><Switch /></Form.Item>
            <Form.Item name="perigoso" label="Resíduo perigoso (Classe I)" valuePropName="checked"><Switch /></Form.Item>
          </div>
        </Form>
      </Modal>
    </>
  );
}
