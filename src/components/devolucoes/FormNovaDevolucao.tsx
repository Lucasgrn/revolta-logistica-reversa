"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { App, Button, Card, Form, Input, InputNumber, Radio, Select, Space } from "antd";
import { DeleteOutlined, PlusOutlined, ShoppingOutlined, SyncOutlined } from "@ant-design/icons";
import type { Canal, Categoria } from "@/generated/prisma/enums";
import { CANAL, CATEGORIA, MOTIVO, motivosDoCanal } from "@/domain/rotulos";
import { data } from "@/lib/formato";
import { criarDevolucaoInterna } from "@/app/acoes/devolucoes";

interface Props {
  clientes: { id: number; nome: string; documento: string }[];
  vendas: { id: number; numero: string; dataEntrega: Date; clienteId: number; cliente: { nome: string }; itens: { produtoId: number; quantidade: number; produto: { nome: string } }[] }[];
  produtos: { id: number; nome: string; sku: string; categoria: Categoria }[];
}

export function FormNovaDevolucao({ clientes, vendas, produtos }: Props) {
  const router = useRouter();
  const { message, modal } = App.useApp();
  const [form] = Form.useForm();
  const [canal, setCanal] = useState<Canal>("POS_VENDA");
  const [pendente, iniciar] = useTransition();
  const vendaId = Form.useWatch("vendaId", form) as number | undefined;
  const venda = vendas.find((v) => v.id === vendaId);

  const enviar = (v: { motivo: string; clienteId?: number; vendaId?: number; descricao?: string; itens: { produtoId: number; quantidade: number }[] }) =>
    iniciar(async () => {
      const r = await criarDevolucaoInterna({
        canal,
        motivo: v.motivo as never,
        clienteId: canal === "POS_VENDA" ? venda!.clienteId : v.clienteId!,
        vendaId: canal === "POS_VENDA" ? v.vendaId : null,
        descricao: v.descricao,
        itens: v.itens,
      });
      if (!r.ok) return void message.error(r.erro);
      const ir = () => router.push(`/devolucoes/${r.dados!.id}`);
      if (r.dados!.alertas.length) {
        modal.warning({ title: `Devolução ${r.dados!.protocolo} aberta com alertas`, content: <ul className="list-disc pl-4">{r.dados!.alertas.map((a) => <li key={a}>{a}</li>)}</ul>, onOk: ir });
      } else {
        message.success(`Devolução ${r.dados!.protocolo} registrada`);
        ir();
      }
    });

  type Opcoes = { value?: number; label: string; options?: { value: number; label: string }[] }[];
  const opcoesProduto: Opcoes = canal === "POS_VENDA"
    ? (venda?.itens ?? []).map((i) => ({ value: i.produtoId, label: `${i.produto.nome} (vendidos: ${i.quantidade})` }))
    : Object.entries(CATEGORIA).map(([cat, rotulo]) => ({
        label: rotulo,
        options: produtos.filter((p) => p.categoria === cat).map((p) => ({ value: p.id, label: `${p.nome} · ${p.sku}` })),
      }));

  return (
    <Card>
      <Form form={form} layout="vertical" onFinish={enviar} initialValues={{ itens: [{ quantidade: 1 }] }}>
        <Form.Item label="Canal">
          <Radio.Group
            value={canal}
            onChange={(e) => { setCanal(e.target.value); form.resetFields(["motivo", "vendaId", "clienteId", "itens"]); }}
            optionType="button"
            buttonStyle="solid"
            options={[
              { value: "POS_VENDA", label: <><ShoppingOutlined /> {CANAL.POS_VENDA.rotulo}</> },
              { value: "POS_CONSUMO", label: <><SyncOutlined /> {CANAL.POS_CONSUMO.rotulo}</> },
            ]}
          />
          <div className="mt-1 text-xs text-gray-500">{CANAL[canal].descricao}</div>
        </Form.Item>

        <div className={`rounded-lg p-4 ${canal === "POS_VENDA" ? "borda-pos-venda bg-blue-50/40" : "borda-pos-consumo bg-emerald-50/40"}`}>
          {canal === "POS_VENDA" ? (
            <Form.Item name="vendaId" label="Venda" rules={[{ required: true, message: "Selecione a venda" }]}>
              <Select
                showSearch={{ optionFilterProp: "label" }}
                placeholder="Busque pelo número ou cliente"
                options={vendas.map((v) => ({ value: v.id, label: `${v.numero} — ${v.cliente.nome} — entregue em ${data(v.dataEntrega)}` }))}
                onChange={() => form.setFieldValue("itens", [{ quantidade: 1 }])}
              />
            </Form.Item>
          ) : (
            <Form.Item name="clienteId" label="Cliente" rules={[{ required: true, message: "Selecione o cliente" }]}>
              <Select showSearch={{ optionFilterProp: "label" }} placeholder="Busque pelo nome ou documento" options={clientes.map((c) => ({ value: c.id, label: `${c.nome} — ${c.documento}` }))} />
            </Form.Item>
          )}

          <Form.Item name="motivo" label="Motivo" rules={[{ required: true, message: "Selecione o motivo" }]}>
            <Select options={motivosDoCanal(canal).map((m) => ({ value: m, label: MOTIVO[m].rotulo }))} />
          </Form.Item>

          <Form.List name="itens">
            {(campos, { add, remove }) => (
              <div>
                <div className="mb-2 text-sm">Produtos devolvidos</div>
                {campos.map(({ key, name }) => (
                  <Space key={key} align="start" className="!flex w-full [&>.ant-space-item:first-child]:flex-1">
                    <Form.Item name={[name, "produtoId"]} rules={[{ required: true, message: "Escolha o produto" }]} className="!mb-2">
                      <Select showSearch={{ optionFilterProp: "label" }} placeholder={canal === "POS_VENDA" && !venda ? "Selecione a venda primeiro" : "Produto"} options={opcoesProduto} disabled={canal === "POS_VENDA" && !venda} />
                    </Form.Item>
                    <Form.Item name={[name, "quantidade"]} rules={[{ required: true, message: "Qtd." }]} className="!mb-2">
                      <InputNumber min={1} max={100} placeholder="Qtd." />
                    </Form.Item>
                    {campos.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} aria-label="Remover produto" />}
                  </Space>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantidade: 1 })}>Adicionar produto</Button>
              </div>
            )}
          </Form.List>
        </div>

        <Form.Item name="descricao" label="Descrição / relato do cliente" className="!mt-4"><Input.TextArea rows={3} /></Form.Item>
        <Button type="primary" htmlType="submit" loading={pendente}>Registrar devolução</Button>
      </Form>
    </Card>
  );
}
