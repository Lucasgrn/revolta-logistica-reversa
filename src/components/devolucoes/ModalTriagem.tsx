"use client";
import { useMemo, useState, useTransition } from "react";
import { Alert, App, Descriptions, Divider, Form, Input, InputNumber, Modal, Radio, Select, Table, Tag } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import type { Canal, Condicao, Destinacao } from "@/generated/prisma/enums";
import {
  custosAutomaticos, impactoAmbiental, massaTotal, sugerirDestinacao, valorRecuperadoEstimado, type ParametrosDominio,
} from "@/domain/destinacao";
import { dentroDaGarantia } from "@/domain/politica";
import { CONDICAO, DESTINACAO, DESTINACOES_ORDENADAS, TIPO_CUSTO, TIPO_RECUPERACAO } from "@/domain/rotulos";
import { brl, kg } from "@/lib/formato";
import { destinarItem } from "@/app/acoes/devolucoes";
import type { DevolucaoCompleta } from "./DetalheDevolucao";

export function ModalTriagem({ item, devolucao, parametros, onFechar }: {
  item: DevolucaoCompleta["itens"][number];
  devolucao: { id: number; canal: Canal; recebidaEm: Date | null; dataEntrega: Date | null };
  parametros: ParametrosDominio;
  onFechar: (salvo: boolean) => void;
}) {
  const { message } = App.useApp();
  const [pendente, iniciar] = useTransition();
  const [condicao, setCondicao] = useState<Condicao | undefined>(item.condicao ?? undefined);
  const [destinacao, setDestinacao] = useState<Destinacao | undefined>(item.destinacao ?? undefined);
  const [valorManual, setValorManual] = useState<number | null>(null);
  const [form] = Form.useForm();
  const produto = item.produto;
  const agora = useMemo(() => new Date(), []);
  const garantia = dentroDaGarantia(devolucao.dataEntrega, produto.garantiaMeses, agora);

  const sugestao = condicao ? sugerirDestinacao({ canal: devolucao.canal, condicao, dentroGarantia: garantia, produto }) : null;

  // Prévia do processamento: mesmas funções de domínio usadas no servidor.
  const previa = useMemo(() => {
    if (!destinacao) return null;
    return {
      recuperacao: valorRecuperadoEstimado(destinacao, produto, parametros, devolucao.canal),
      custos: custosAutomaticos({ destinacao, produto, parametros, recebidaEm: devolucao.recebidaEm ?? agora, destinadoEm: agora }),
      impacto: impactoAmbiental(destinacao, produto.composicao),
    };
  }, [destinacao, produto, parametros, devolucao.recebidaEm, devolucao.canal, agora]);
  const totalCustos = previa?.custos.reduce((s, c) => s + c.valor, 0) ?? 0;
  const recuperado = valorManual ?? previa?.recuperacao?.valor ?? 0;

  const salvar = () =>
    form.validateFields().then((v) => {
      if (!condicao || !destinacao) return message.warning("Classifique a condição e escolha a destinação.");
      iniciar(async () => {
        const r = await destinarItem(devolucao.id, item.id, { condicao, destinacao, observacao: v.observacao, numeroSerie: v.numeroSerie, valorRecuperado: valorManual });
        if (r.ok) {
          message.success("Item destinado");
          onFechar(true);
        } else message.error(r.erro);
      });
    }).catch(() => undefined /* erros já exibidos nos campos */);

  return (
    <Modal open width={760} title={`Inspeção e destinação — ${produto.nome}`} okText="Confirmar destinação" confirmLoading={pendente} onOk={salvar} onCancel={() => onFechar(false)}>
      <Descriptions size="small" column={{ xs: 1, sm: 3 }} className="mb-3">
        <Descriptions.Item label="Massa">{kg(massaTotal(produto.composicao))}</Descriptions.Item>
        <Descriptions.Item label="Preço">{brl(produto.preco)}</Descriptions.Item>
        <Descriptions.Item label="Garantia">{devolucao.dataEntrega ? (garantia ? <Tag color="green">vigente</Tag> : <Tag color="red">vencida</Tag>) : "sem venda vinculada"}</Descriptions.Item>
      </Descriptions>

      <Form form={form} layout="vertical" initialValues={{ numeroSerie: item.numeroSerie, observacao: item.observacao }}>
        <Form.Item label="1. Condição do item" required>
          <Radio.Group
            value={condicao}
            onChange={(e) => {
              const c = e.target.value as Condicao;
              setCondicao(c);
              setValorManual(null);
              setDestinacao(sugerirDestinacao({ canal: devolucao.canal, condicao: c, dentroGarantia: garantia, produto }).destinacao);
            }}
            className="!grid grid-cols-1 gap-2 sm:grid-cols-2"
          >
            {(Object.keys(CONDICAO) as Condicao[]).map((c) => (
              <Radio.Button key={c} value={c} className="!h-auto !rounded-lg !border !py-1.5 !leading-snug">
                <b>{CONDICAO[c].rotulo}</b>
                <div className="text-xs text-gray-500">{CONDICAO[c].descricao}</div>
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>

        {sugestao && (
          <Alert key={sugestao.destinacao} className="entrada-suave !mb-3" type="success" icon={<BulbOutlined />} showIcon title={<>Sugestão: <b>{DESTINACAO[sugestao.destinacao].rotulo}</b></>} description={sugestao.justificativa} />
        )}

        <Form.Item label="2. Destinação" required>
          <Select
            value={destinacao}
            onChange={(v) => { setDestinacao(v); setValorManual(null); }}
            placeholder="Escolha a destinação"
            options={DESTINACOES_ORDENADAS.map((d) => ({ value: d, label: `${DESTINACAO[d].ordem}. ${DESTINACAO[d].rotulo}${sugestao?.destinacao === d ? " (sugerida)" : ""}` }))}
          />
        </Form.Item>
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Form.Item name="numeroSerie" label="Número de série"><Input /></Form.Item>
          <Form.Item name="observacao" label="Laudo / observação"><Input /></Form.Item>
        </div>
      </Form>

      {previa && (
        <div className="entrada-suave">
          <Divider titlePlacement="start" className="!my-2">3. Resultado calculado</Divider>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Table
                size="small" pagination={false} rowKey="tipo" dataSource={previa.custos}
                columns={[{ title: "Custo automático", dataIndex: "tipo", render: (t: keyof typeof TIPO_CUSTO, c) => <><div>{TIPO_CUSTO[t]}</div><div className="text-xs text-gray-500">{c.descricao}</div></> }, { title: "Valor", dataIndex: "valor", align: "right", render: brl }]}
                summary={() => <Table.Summary.Row><Table.Summary.Cell index={0}><b>Total</b></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><b>{brl(totalCustos)}</b></Table.Summary.Cell></Table.Summary.Row>}
              />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <div>
                <div className="text-gray-500">{previa.recuperacao ? TIPO_RECUPERACAO[previa.recuperacao.tipo] : "Sem valor recuperado (descarte)"}</div>
                {previa.recuperacao && (
                  <InputNumber className="!w-full" prefix="R$" min={0} precision={2} decimalSeparator="," value={recuperado} onChange={(v) => setValorManual(v == null ? null : Number(v))} />
                )}
                {valorManual != null && <div className="text-xs text-amber-600">Valor informado manualmente (substitui a estimativa)</div>}
              </div>
              <div>Resultado líquido do item: <b className={recuperado - totalCustos >= 0 ? "text-emerald-700" : "text-red-700"}>{brl(recuperado - totalCustos)}</b></div>
              <div>Desviado de aterro: <b>{kg(previa.impacto.massaDesviadaKg)}</b> de {kg(previa.impacto.massaKg)}</div>
              <div>CO₂e evitado: <b>{kg(previa.impacto.co2EvitadoKg).replace("kg", "kgCO₂e")}</b></div>
              {previa.impacto.massaPerigosaKg > 0 && <Tag color="orange">Contém {kg(previa.impacto.massaPerigosaKg)} de material perigoso</Tag>}
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
