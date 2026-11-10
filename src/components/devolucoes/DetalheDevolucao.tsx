"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  Alert, App, Button, Card, Col, Descriptions, Form, Input, InputNumber, Modal, Popconfirm, Row, Select, Space, Statistic,
  Steps, Table, Tag, Timeline,
} from "antd";
import { ArrowLeftOutlined, CarOutlined, CheckCircleOutlined, DeleteOutlined, ExperimentOutlined, InboxOutlined, StopOutlined } from "@ant-design/icons";
import type { Prisma } from "@/generated/prisma/client";
import type { TipoCusto } from "@/generated/prisma/enums";
import { impactoAmbiental, massaTotal, type ParametrosDominio } from "@/domain/destinacao";
import { ETAPAS } from "@/domain/fluxo";
import { MOTIVO, STATUS, TIPO_CUSTO, TIPO_RECUPERACAO } from "@/domain/rotulos";
import { brl, data, dataHora, kg } from "@/lib/formato";
import { TagCanal, TagCondicao, TagDestinacao, TagStatus } from "@/components/Tags";
import * as acoes from "@/app/acoes/devolucoes";
import { ModalTriagem } from "./ModalTriagem";
import { CampoValorReal } from "./CampoValorReal";

export type DevolucaoCompleta = Prisma.DevolucaoGetPayload<{
  include: {
    cliente: true;
    venda: true;
    itens: { include: { produto: { include: { composicao: { include: { material: true } } } } } };
    custos: true;
    recuperacoes: true;
    historico: true;
  };
}>;

interface Permissoes {
  transito: boolean; recebimento: boolean; triar: boolean; recusar: boolean; encerrar: boolean; financeiro: boolean; custos: TipoCusto[];
}

export function DetalheDevolucao({ devolucao: d, parametros, permissoes: p }: { devolucao: DevolucaoCompleta; parametros: ParametrosDominio; permissoes: Permissoes }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [pendente, iniciar] = useTransition();
  const [modal, setModal] = useState<null | "transito" | "recebimento" | "recusa" | "custo">(null);
  const [itemTriagem, setItemTriagem] = useState<number | null>(null);
  const [form] = Form.useForm();

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>, sucesso: string) =>
    iniciar(async () => {
      const r = await fn();
      if (r.ok) {
        message.success(sucesso);
        if (modal) form.resetFields();
        setModal(null);
        router.refresh();
      } else message.error(r.erro);
    });

  const totalCusto = d.custos.reduce((s, c) => s + c.valor, 0);
  const totalRecuperado = d.recuperacoes.reduce((s, c) => s + c.valor, 0);
  const encerrada = d.status === "ENCERRADA" || d.status === "RECUSADA";
  const impacto = useMemo(
    () =>
      d.itens.reduce(
        (acc, i) => {
          acc.massa += massaTotal(i.produto.composicao);
          if (i.destinacao) {
            const x = impactoAmbiental(i.destinacao, i.produto.composicao);
            acc.desviada += x.massaDesviadaKg;
            acc.co2 += x.co2EvitadoKg;
          }
          return acc;
        },
        { massa: 0, desviada: 0, co2: 0 },
      ),
    [d.itens],
  );
  const nomeItem = (id: number | null) => {
    if (id == null) return <span className="text-gray-400">Devolução</span>;
    const n = d.itens.findIndex((i) => i.id === id);
    return `Item ${n + 1}`;
  };

  const etapaAtual = d.status === "RECUSADA" ? ETAPAS.indexOf(d.historico.at(-1)?.de ?? "SOLICITADA") : ETAPAS.indexOf(d.status);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/devolucoes" className="text-sm"><ArrowLeftOutlined /> Devoluções</Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2 text-2xl font-semibold">
            <span className="font-mono">{d.protocolo}</span>
            <TagCanal canal={d.canal} />
            <TagStatus status={d.status} />
          </h1>
        </div>
        <Space wrap>
          {d.status === "SOLICITADA" && p.transito && <Button type="primary" icon={<CarOutlined />} onClick={() => setModal("transito")}>Registrar coleta / envio</Button>}
          {d.status === "EM_TRANSITO" && p.recebimento && <Button type="primary" icon={<InboxOutlined />} onClick={() => setModal("recebimento")}>Registrar recebimento</Button>}
          {d.status === "RECEBIDA" && p.triar && (
            <Button type="primary" icon={<ExperimentOutlined />} loading={pendente} onClick={() => rodar(() => acoes.iniciarTriagem(d.id), "Triagem iniciada")}>Iniciar triagem</Button>
          )}
          {d.status === "DESTINADA" && p.encerrar && (
            <Popconfirm title="Encerrar a devolução?" description="Custos e valores ficarão bloqueados para edição." onConfirm={() => rodar(() => acoes.encerrar(d.id), "Devolução encerrada")}>
              <Button type="primary" icon={<CheckCircleOutlined />} loading={pendente}>Encerrar devolução</Button>
            </Popconfirm>
          )}
          {(d.status === "SOLICITADA" || d.status === "RECEBIDA") && p.recusar && (
            <Button danger icon={<StopOutlined />} onClick={() => setModal("recusa")}>Recusar</Button>
          )}
        </Space>
      </div>

      {d.alertas.length > 0 && (
        <Alert type="warning" showIcon title="Alertas de política" description={<ul className="list-disc pl-4">{d.alertas.map((a) => <li key={a}>{a}</li>)}</ul>} />
      )}
      {d.status === "EM_TRIAGEM" && (
        <Alert type="info" showIcon title="Inspecione cada item, classifique a condição e confirme a destinação. Quando todos estiverem destinados, a devolução passa a Destinada." />
      )}

      <Card size="small">
        <Steps
          size="small"
          current={etapaAtual}
          status={d.status === "RECUSADA" ? "error" : d.status === "ENCERRADA" ? "finish" : "process"}
          items={ETAPAS.map((e) => ({ title: STATUS[e].rotulo }))}
          responsive
        />
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} lg={14}>
          <Card size="small" title="Dados da devolução" className="h-full">
            <Descriptions size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Cliente">{d.cliente.nome}</Descriptions.Item>
              <Descriptions.Item label="Contato">{d.cliente.email}</Descriptions.Item>
              <Descriptions.Item label="Localidade">{d.cliente.cidade}/{d.cliente.uf}</Descriptions.Item>
              <Descriptions.Item label="Motivo">{MOTIVO[d.motivo].rotulo}</Descriptions.Item>
              <Descriptions.Item label="Venda">{d.venda ? `${d.venda.numero} (entregue em ${data(d.venda.dataEntrega)})` : "—"}</Descriptions.Item>
              <Descriptions.Item label="Origem">{d.origem === "PORTAL" ? "Portal do Cliente" : "Registro interno"}</Descriptions.Item>
              <Descriptions.Item label="Abertura">{dataHora(d.criadaEm)}</Descriptions.Item>
              <Descriptions.Item label="Recebimento">{d.recebidaEm ? dataHora(d.recebidaEm) : "—"}</Descriptions.Item>
              {d.transportadora && <Descriptions.Item label="Transporte">{d.transportadora}{d.rastreio ? ` · ${d.rastreio}` : ""}</Descriptions.Item>}
              {d.descricao && <Descriptions.Item label="Descrição" span={2}>{d.descricao}</Descriptions.Item>}
            </Descriptions>
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card size="small" title="Resultado da devolução" className="h-full">
            <Row gutter={[8, 12]}>
              <Col span={12}><Statistic title="Custo reverso" value={totalCusto} formatter={(v) => brl(Number(v))} /></Col>
              <Col span={12}><Statistic title="Valor recuperado" value={totalRecuperado} formatter={(v) => brl(Number(v))} /></Col>
              <Col span={12}>
                <Statistic title="Resultado líquido" value={totalRecuperado - totalCusto} formatter={(v) => brl(Number(v))} styles={{ content: { color: totalRecuperado - totalCusto >= 0 ? "#1f7a5a" : "#c4352f" } }} />
              </Col>
              <Col span={12}><Statistic title="Massa desviada de aterro" value={impacto.desviada} formatter={(v) => `${kg(Number(v))} de ${kg(impacto.massa)}`} /></Col>
              <Col span={24}><Statistic title="CO₂e evitado" value={impacto.co2} formatter={(v) => kg(Number(v)).replace("kg", "kgCO₂e").replace(" t", " tCO₂e")} /></Col>
            </Row>
          </Card>
        </Col>
      </Row>

      <Card size="small" title={`Itens devolvidos (${d.itens.length})`}>
        <Table
          rowKey="id"
          size="small"
          pagination={false}
          scroll={{ x: 900 }}
          dataSource={d.itens}
          columns={[
            { title: "#", width: 50, render: (_, __, i) => i + 1 },
            { title: "Produto", render: (_, i) => <><div>{i.produto.nome}</div><div className="text-xs text-gray-500">{i.produto.sku}{i.numeroSerie ? ` · S/N ${i.numeroSerie}` : ""}</div></> },
            { title: "Massa", width: 90, align: "right", render: (_, i) => kg(massaTotal(i.produto.composicao)) },
            { title: "Condição", width: 190, render: (_, i) => (i.condicao ? <TagCondicao condicao={i.condicao} /> : <span className="text-gray-400">Não inspecionado</span>) },
            {
              title: "Destinação", width: 260,
              render: (_, i) =>
                i.destinacao ? (
                  <div>
                    <TagDestinacao destinacao={i.destinacao} />
                    {i.destinacaoSugerida && i.destinacaoSugerida !== i.destinacao && <div className="text-xs text-amber-600">Divergiu da sugestão</div>}
                    {i.observacao && <div className="text-xs text-gray-500">{i.observacao}</div>}
                  </div>
                ) : <span className="text-gray-400">—</span>,
            },
            {
              title: "", width: 150, align: "right",
              render: (_, i) =>
                d.status === "EM_TRIAGEM" && p.triar ? (
                  <Button size="small" type={i.destinacao ? "default" : "primary"} onClick={() => setItemTriagem(i.id)}>{i.destinacao ? "Redestinar" : "Inspecionar e destinar"}</Button>
                ) : null,
            },
          ]}
        />
      </Card>

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={13}>
          <Card
            size="small"
            title="Custos reversos"
            extra={!encerrada && p.financeiro && <Button size="small" onClick={() => setModal("custo")}>Lançar custo</Button>}
            className="h-full"
          >
            <Table
              rowKey="id" size="small" pagination={false} dataSource={d.custos}
              summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={3}><b>Total</b></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><b>{brl(totalCusto)}</b></Table.Summary.Cell><Table.Summary.Cell index={2} /></Table.Summary.Row>}
              columns={[
                { title: "Tipo", dataIndex: "tipo", render: (t: TipoCusto, c) => <>{TIPO_CUSTO[t]} {c.automatico && <Tag className="!ml-1" variant="filled">automático</Tag>}</> },
                { title: "Ref.", dataIndex: "itemId", width: 90, render: nomeItem },
                { title: "Descrição", dataIndex: "descricao", ellipsis: true },
                { title: "Valor", dataIndex: "valor", align: "right", width: 110, render: brl },
                {
                  title: "", width: 40,
                  render: (_, c) => !c.automatico && !encerrada && p.custos.includes(c.tipo) && (
                    <Popconfirm title="Remover este custo?" onConfirm={() => rodar(() => acoes.removerCusto(c.id), "Custo removido")}>
                      <Button size="small" type="text" danger icon={<DeleteOutlined />} aria-label="Remover" />
                    </Popconfirm>
                  ),
                },
              ]}
            />
          </Card>
        </Col>
        <Col xs={24} xl={11}>
          <Card size="small" title="Valores recuperados" className="h-full">
            <Table
              rowKey="id" size="small" pagination={false} dataSource={d.recuperacoes}
              summary={() => <Table.Summary.Row><Table.Summary.Cell index={0} colSpan={2}><b>Total</b></Table.Summary.Cell><Table.Summary.Cell index={1} align="right"><b>{brl(totalRecuperado)}</b></Table.Summary.Cell></Table.Summary.Row>}
              columns={[
                { title: "Tipo", dataIndex: "tipo", render: (t: keyof typeof TIPO_RECUPERACAO, r) => <>{TIPO_RECUPERACAO[t]} <Tag className="!ml-1" color={r.estimado ? "default" : "green"} variant="filled">{r.estimado ? "estimado" : "real"}</Tag></> },
                { title: "Ref.", dataIndex: "itemId", width: 80, render: nomeItem },
                {
                  title: "Valor", dataIndex: "valor", align: "right", width: 220,
                  render: (v: number, r) =>
                    !encerrada && p.triar ? (
                      <CampoValorReal id={r.id} valor={v} />
                    ) : brl(v),
                },
              ]}
            />
            {!encerrada && p.triar && d.recuperacoes.length > 0 && <p className="mt-2 text-xs text-gray-500">Edite o valor e pressione Enter para substituir a estimativa pelo valor real obtido.</p>}
          </Card>
        </Col>
      </Row>

      <Card size="small" title="Histórico (rastreabilidade)">
        <Timeline
          items={d.historico.map((h) => ({
            color: h.para === "RECUSADA" ? "red" : h.para === "ENCERRADA" ? "green" : "blue",
            content: (
              <div>
                <b>{STATUS[h.para].rotulo}</b> <span className="text-xs text-gray-500">· {dataHora(h.em)} · {h.usuario}</span>
                {h.observacao && <div className="text-sm text-gray-600">{h.observacao}</div>}
              </div>
            ),
          }))}
        />
      </Card>

      {/* Modais de transição */}
      <Modal
        open={modal === "transito"} title="Registrar coleta / envio" okText="Confirmar" confirmLoading={pendente} onCancel={() => setModal(null)} destroyOnHidden
        onOk={() => form.validateFields().then((v) => rodar(() => acoes.registrarTransito(d.id, v), "Devolução em trânsito")).catch(() => undefined /* erros já exibidos nos campos */)}
      >
        <Form form={form} layout="vertical" initialValues={{ valorFrete: 0 }}>
          <Form.Item name="transportadora" label="Transportadora / modalidade" rules={[{ required: true, message: "Informe a transportadora" }]}>
            <Select options={["Correios — Logística Reversa", "Jadlog", "Total Express", "Braspress", "Coleta própria", "Entrega no balcão (PEV)"].map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="rastreio" label="Código de rastreio"><Input /></Form.Item>
          <Form.Item name="valorFrete" label="Valor do frete reverso (R$)" extra="Lançado como custo reverso do tipo Frete reverso.">
            <InputNumber min={0} step={5} className="!w-full" decimalSeparator="," />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modal === "recebimento"} title="Registrar recebimento" okText="Confirmar recebimento" confirmLoading={pendente} onCancel={() => setModal(null)} destroyOnHidden
        onOk={() => form.validateFields().then((v) => rodar(() => acoes.registrarRecebimento(d.id, v.observacao), "Recebimento registrado")).catch(() => undefined /* erros já exibidos nos campos */)}
      >
        <p className="mb-3 text-sm text-gray-600">Confira a quantidade ({d.itens.length} item(ns)) e a massa esperada ({kg(impacto.massa)}). A data de hoje inicia a contagem de armazenagem.</p>
        <Form form={form} layout="vertical"><Form.Item name="observacao" label="Observações da conferência"><Input.TextArea rows={3} /></Form.Item></Form>
      </Modal>

      <Modal
        open={modal === "recusa"} title="Recusar devolução" okText="Recusar" okButtonProps={{ danger: true }} confirmLoading={pendente} onCancel={() => setModal(null)} destroyOnHidden
        onOk={() => form.validateFields().then((v) => rodar(() => acoes.recusar(d.id, v.justificativa), "Devolução recusada")).catch(() => undefined /* erros já exibidos nos campos */)}
      >
        <Form form={form} layout="vertical" initialValues={{ justificativa: d.alertas[0] ?? "" }}>
          <Form.Item name="justificativa" label="Justificativa" rules={[{ required: true, message: "Informe a justificativa" }]}><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>

      <Modal
        open={modal === "custo"} title="Lançar custo reverso" okText="Lançar" confirmLoading={pendente} onCancel={() => setModal(null)} destroyOnHidden
        onOk={() => form.validateFields().then((v) => rodar(() => acoes.lancarCusto(d.id, v), "Custo lançado")).catch(() => undefined /* erros já exibidos nos campos */)}
      >
        <Form form={form} layout="vertical">
          <Form.Item name="tipo" label="Tipo" rules={[{ required: true, message: "Escolha o tipo" }]}>
            <Select options={p.custos.map((t) => ({ value: t, label: TIPO_CUSTO[t] }))} />
          </Form.Item>
          <Form.Item name="itemId" label="Referente a">
            <Select allowClear placeholder="Devolução inteira" options={d.itens.map((i, n) => ({ value: i.id, label: `Item ${n + 1} — ${i.produto.nome}` }))} />
          </Form.Item>
          <Form.Item name="valor" label="Valor (R$)" rules={[{ required: true, message: "Informe o valor" }]}><InputNumber min={0.01} step={5} className="!w-full" decimalSeparator="," /></Form.Item>
          <Form.Item name="descricao" label="Descrição"><Input /></Form.Item>
        </Form>
      </Modal>

      {itemTriagem != null && (
        <ModalTriagem
          item={d.itens.find((i) => i.id === itemTriagem)!}
          devolucao={{ id: d.id, canal: d.canal, recebidaEm: d.recebidaEm, dataEntrega: d.venda?.dataEntrega ?? null }}
          parametros={parametros}
          onFechar={(salvo) => {
            setItemTriagem(null);
            if (salvo) router.refresh();
          }}
        />
      )}
    </div>
  );
}
