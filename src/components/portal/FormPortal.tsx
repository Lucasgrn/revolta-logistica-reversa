"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { Alert, App, Button, Card, Checkbox, Form, Input, InputNumber, Result, Select, Space } from "antd";
import { DeleteOutlined, PlusOutlined, SearchOutlined, ShoppingOutlined, SyncOutlined } from "@ant-design/icons";
import type { Categoria } from "@/generated/prisma/enums";
import { CATEGORIA, MOTIVO, motivosDoCanal } from "@/domain/rotulos";
import { data } from "@/lib/formato";
import { abrirPosConsumo, abrirPosVenda, buscarVenda } from "@/app/acoes/portal";

type Venda = { numero: string; cliente: string; dataEntrega: string; itens: { produtoId: number; nome: string; quantidade: number }[] };
const UFS = "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");

export function FormPortal({ produtos }: { produtos: { id: number; nome: string; categoria: Categoria }[] }) {
  const { message } = App.useApp();
  const [canal, setCanal] = useState<"POS_VENDA" | "POS_CONSUMO" | null>(null);
  const [venda, setVenda] = useState<Venda | null>(null);
  const [selecionados, setSelecionados] = useState<Record<number, number>>({});
  const [concluido, setConcluido] = useState<{ protocolo: string; alertas: string[] } | null>(null);
  const [pendente, iniciar] = useTransition();
  const [form] = Form.useForm();

  if (concluido)
    return (
      <Card className="entrada-sucesso">
        <Result
          status="success"
          title="Solicitação registrada!"
          subTitle={<>Seu protocolo é <b className="font-mono text-lg">{concluido.protocolo}</b>. Guarde-o para acompanhar o andamento.</>}
          extra={<Link href={`/portal/acompanhar?protocolo=${concluido.protocolo}`}><Button type="primary">Acompanhar solicitação</Button></Link>}
        >
          {concluido.alertas.length > 0 && <Alert type="warning" showIcon title="Sua solicitação será analisada" description={concluido.alertas.join(" ")} />}
        </Result>
      </Card>
    );

  if (!canal)
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <button onClick={() => setCanal("POS_VENDA")} className="borda-pos-venda rounded-xl bg-white p-5 text-left shadow-sm transition-[box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a5a] focus-visible:ring-offset-2 motion-reduce:active:scale-100">
          <ShoppingOutlined className="text-2xl text-pos-venda" />
          <h2 className="mt-2 font-semibold">Devolução de compra</h2>
          <p className="text-sm text-gray-600">Arrependimento, defeito, avaria no transporte, item errado ou garantia de um pedido feito conosco.</p>
        </button>
        <button onClick={() => setCanal("POS_CONSUMO")} className="borda-pos-consumo rounded-xl bg-white p-5 text-left shadow-sm transition-[box-shadow,transform] duration-150 ease-[var(--ease-out)] hover:shadow-md active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1f7a5a] focus-visible:ring-offset-2 motion-reduce:active:scale-100">
          <SyncOutlined className="text-2xl text-pos-consumo" />
          <h2 className="mt-2 font-semibold">Descarte responsável</h2>
          <p className="text-sm text-gray-600">Entregue produtos em fim de vida útil — mesmo que comprados em outro lugar — para reciclagem ou destinação adequada.</p>
        </button>
      </div>
    );

  const localizar = () =>
    form.validateFields(["numero", "email"]).then((v) =>
      iniciar(async () => {
        const r = await buscarVenda(v.numero, v.email);
        if (r.ok) { setVenda(r.dados!); setSelecionados({}); } else message.error(r.erro);
      }),
    ).catch(() => undefined /* erros já exibidos nos campos */);

  const enviar = () =>
    form.validateFields().then((v) =>
      iniciar(async () => {
        const r =
          canal === "POS_VENDA"
            ? await abrirPosVenda({ numero: v.numero, email: v.email, motivo: v.motivo, descricao: v.descricao, itens: Object.entries(selecionados).map(([produtoId, quantidade]) => ({ produtoId: Number(produtoId), quantidade })) })
            : await abrirPosConsumo({ ...v, itens: v.itens });
        if (r.ok) setConcluido(r.dados!); else message.error(r.erro);
      }),
    ).catch(() => undefined /* erros já exibidos nos campos */);

  return (
    <Card className={canal === "POS_VENDA" ? "borda-pos-venda" : "borda-pos-consumo"}>
      <Button type="link" className="!px-0" onClick={() => { setCanal(null); setVenda(null); form.resetFields(); }}>← Trocar tipo de solicitação</Button>
      <h2 className="mb-4 text-lg font-semibold">{canal === "POS_VENDA" ? "Devolução de compra" : "Descarte responsável"}</h2>
      <Form form={form} layout="vertical" initialValues={{ itens: [{ quantidade: 1 }] }}>
        {canal === "POS_VENDA" ? (
          <>
            <div className="grid gap-x-4 sm:grid-cols-[1fr_1fr_auto]">
              <Form.Item name="numero" label="Número do pedido" rules={[{ required: true, message: "Informe o pedido" }]} extra="Ex.: PED-100000"><Input disabled={!!venda} /></Form.Item>
              <Form.Item name="email" label="E-mail da compra" rules={[{ required: true, type: "email", message: "E-mail inválido" }]}><Input disabled={!!venda} /></Form.Item>
              <Form.Item label=" ">{venda ? <Button onClick={() => setVenda(null)}>Alterar</Button> : <Button icon={<SearchOutlined />} loading={pendente} onClick={localizar}>Localizar</Button>}</Form.Item>
            </div>
            {venda && (
              <>
                <Alert className="!mb-4" type="success" title={`Olá, ${venda.cliente}! Pedido entregue em ${data(venda.dataEntrega)}. Selecione o que deseja devolver:`} />
                <div className="mb-4 flex flex-col gap-2">
                  {venda.itens.map((i) => (
                    <div key={i.produtoId} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 px-3 py-2">
                      <Checkbox checked={i.produtoId in selecionados} onChange={(e) => setSelecionados((s) => { const n = { ...s }; if (e.target.checked) n[i.produtoId] = 1; else delete n[i.produtoId]; return n; })}>{i.nome}</Checkbox>
                      {i.produtoId in selecionados && <InputNumber size="small" min={1} max={i.quantidade} value={selecionados[i.produtoId]} onChange={(q) => setSelecionados((s) => ({ ...s, [i.produtoId]: Number(q) || 1 }))} addonAfter={`de ${i.quantidade}`} />}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            <div className="grid gap-x-4 sm:grid-cols-2">
              <Form.Item name="nome" label="Nome completo / razão social" rules={[{ required: true, message: "Informe o nome" }]}><Input /></Form.Item>
              <Form.Item name="documento" label="CPF ou CNPJ" rules={[{ required: true, min: 11, message: "Informe o documento" }]}><Input /></Form.Item>
              <Form.Item name="email" label="E-mail" rules={[{ required: true, type: "email", message: "E-mail inválido" }]}><Input /></Form.Item>
              <div className="grid grid-cols-[1fr_90px] gap-x-2">
                <Form.Item name="cidade" label="Cidade" rules={[{ required: true, message: "Informe a cidade" }]}><Input /></Form.Item>
                <Form.Item name="uf" label="UF" rules={[{ required: true, message: "UF" }]}><Select showSearch options={UFS.map((u) => ({ value: u, label: u }))} /></Form.Item>
              </div>
            </div>
            <Form.List name="itens">
              {(campos, { add, remove }) => (
                <div className="mb-4">
                  <div className="mb-2 text-sm">Produtos que serão entregues</div>
                  {campos.map(({ key, name }) => (
                    <Space key={key} align="start" className="!flex [&>.ant-space-item:first-child]:flex-1">
                      <Form.Item name={[name, "produtoId"]} rules={[{ required: true, message: "Escolha o produto" }]} className="!mb-2">
                        <Select showSearch={{ optionFilterProp: "label" }} placeholder="Tipo de produto" options={Object.entries(CATEGORIA).map(([cat, label]) => ({ label, options: produtos.filter((p) => p.categoria === cat).map((p) => ({ value: p.id, label: p.nome })) }))} />
                      </Form.Item>
                      <Form.Item name={[name, "quantidade"]} rules={[{ required: true, message: "Qtd." }]} className="!mb-2"><InputNumber min={1} max={50} /></Form.Item>
                      {campos.length > 1 && <Button type="text" icon={<DeleteOutlined />} onClick={() => remove(name)} aria-label="Remover" />}
                    </Space>
                  ))}
                  <Button type="dashed" icon={<PlusOutlined />} onClick={() => add({ quantidade: 1 })}>Adicionar produto</Button>
                </div>
              )}
            </Form.List>
          </>
        )}

        {(canal === "POS_CONSUMO" || venda) && (
          <>
            <Form.Item name="motivo" label="Motivo" rules={[{ required: true, message: "Selecione o motivo" }]}>
              <Select options={motivosDoCanal(canal).map((m) => ({ value: m, label: MOTIVO[m].rotulo }))} />
            </Form.Item>
            <Form.Item name="descricao" label="Conte-nos mais (opcional)"><Input.TextArea rows={3} /></Form.Item>
            <Button type="primary" size="large" loading={pendente} onClick={enviar} disabled={canal === "POS_VENDA" && Object.keys(selecionados).length === 0}>Enviar solicitação</Button>
          </>
        )}
      </Form>
    </Card>
  );
}
