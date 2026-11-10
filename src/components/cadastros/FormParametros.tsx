"use client";
import { useTransition } from "react";
import { App, Button, Card, Form, InputNumber } from "antd";
import type { ParametrosDominio } from "@/domain/destinacao";
import { salvarParametros } from "@/app/acoes/cadastros";

const R = { prefix: "R$", decimalSeparator: ",", min: 0, step: 0.5, className: "!w-full" } as const;
const P = { min: 0, max: 100, suffix: "%", className: "!w-full" } as const;

export function FormParametros({ parametros }: { parametros: ParametrosDominio }) {
  const { message } = App.useApp();
  const [pendente, iniciar] = useTransition();
  const pcts = ["custoReparoPercentual", "pctRevendaEstoque", "pctRevendaRecondicionado", "pctRevendaSegundaVida", "pctPecas", "pctCreditoFornecedor"] as const;
  const inicial = { ...parametros, ...Object.fromEntries(pcts.map((k) => [k, Math.round(parametros[k] * 100)])) };
  return (
    <Form
      layout="vertical"
      initialValues={inicial}
      onFinish={(v) =>
        iniciar(async () => {
          const dados = { ...v, ...Object.fromEntries(pcts.map((k) => [k, v[k] / 100])) };
          const r = await salvarParametros(dados);
          if (r.ok) message.success("Parâmetros salvos. Valem para as próximas destinações.");
          else message.error(r.erro);
        })
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <Card size="small" title="Política">
          <Form.Item name="prazoArrependimentoDias" label="Prazo de arrependimento (dias)" extra="CDC art. 49: 7 dias"><InputNumber min={0} max={90} className="!w-full" /></Form.Item>
        </Card>
        <Card size="small" title="Custos reversos automáticos">
          <Form.Item name="custoTriagemItem" label="Triagem e inspeção, por item"><InputNumber {...R} /></Form.Item>
          <Form.Item name="custoArmazenagemDia" label="Armazenagem, por item/dia"><InputNumber {...R} /></Form.Item>
          <Form.Item name="custoEmbalagemItem" label="Reembalagem, por item"><InputNumber {...R} /></Form.Item>
          <Form.Item name="custoReparoPercentual" label="Reparo (% do preço de venda)"><InputNumber {...P} /></Form.Item>
          <Form.Item name="custoTransporteKg" label="Transporte ao destino, por kg"><InputNumber {...R} step={0.05} /></Form.Item>
          <Form.Item name="custoDescarteKg" label="Taxa de descarte/aterro, por kg"><InputNumber {...R} step={0.1} /></Form.Item>
        </Card>
        <Card size="small" title="Valor recuperado estimado">
          <Form.Item name="pctRevendaEstoque" label="Retorno ao estoque (% do preço)"><InputNumber {...P} /></Form.Item>
          <Form.Item name="pctRevendaRecondicionado" label="Recondicionado / outlet — pós-venda (% do preço)"><InputNumber {...P} /></Form.Item>
          <Form.Item name="pctRevendaSegundaVida" label="Segunda vida — pós-consumo (% do preço de novo)"><InputNumber {...P} /></Form.Item>
          <Form.Item name="pctPecas" label="Desmontagem para peças (% do preço)"><InputNumber {...P} /></Form.Item>
          <Form.Item name="pctCreditoFornecedor" label="Crédito do fornecedor (% do custo)"><InputNumber {...P} /></Form.Item>
          <p className="text-xs text-gray-500">Reciclagem: Σ massa reciclável × preço de sucata do material.</p>
        </Card>
      </div>
      <Button className="!mt-4" type="primary" htmlType="submit" loading={pendente}>Salvar parâmetros</Button>
    </Form>
  );
}
