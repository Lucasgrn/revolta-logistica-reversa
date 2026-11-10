"use client";
import { useState } from "react";
import { Alert, Card, Col, Progress, Row, Segmented, Table, Tag, Tooltip as Dica } from "antd";
import { InfoCircleOutlined } from "@ant-design/icons";
import {
  Bar, BarChart, CartesianGrid, Cell, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Indicadores } from "@/domain/indicadores";
import { CANAL, CATEGORIA, DESTINACAO, DESTINACOES_ORDENADAS, MOTIVO, TIPO_CUSTO } from "@/domain/rotulos";
import { brl, brlCurto, kg, num, pct, rotuloMes } from "@/lib/formato";

// Paleta categórica de referência (dataviz) — cores fixas por entidade.
const COR = { posVenda: CANAL.POS_VENDA.corHex, posConsumo: CANAL.POS_CONSUMO.corHex, custo: "#eb6834", recuperado: "#2a78d6", co2: "#1baf7a" };
const EIXO = { fontSize: 12, fill: "#52514e" };
const GRADE = "#e6e8e6";

function Kpi({ titulo, valor, detalhe, dica, destaque }: { titulo: string; valor: string; detalhe?: React.ReactNode; dica?: string; destaque?: "bom" | "ruim" }) {
  return (
    <Card size="small" className="h-full">
      <div className="flex items-center gap-1 text-xs text-gray-500">
        {titulo}
        {dica && <Dica title={dica}><InfoCircleOutlined /></Dica>}
      </div>
      <div className={`mt-1 text-2xl font-semibold ${destaque === "ruim" ? "text-red-700" : destaque === "bom" ? "text-emerald-700" : ""}`}>{valor}</div>
      {detalhe && <div className="mt-1 text-xs text-gray-500">{detalhe}</div>}
    </Card>
  );
}

function CartaoGrafico<T extends object>({ titulo, subtitulo, altura = 280, grafico, tabela, rodape }: {
  titulo: string; subtitulo?: string; altura?: number; grafico: React.ReactElement; rodape?: React.ReactNode;
  tabela: { colunas: { title: string; dataIndex: string; align?: "right" }[]; linhas: T[] };
}) {
  const [modo, setModo] = useState<"Gráfico" | "Tabela">("Gráfico");
  return (
    <Card
      size="small"
      title={<div className="py-1"><div>{titulo}</div>{subtitulo && <div className="text-xs font-normal text-gray-500">{subtitulo}</div>}</div>}
      extra={<Segmented size="small" options={["Gráfico", "Tabela"]} value={modo} onChange={(v) => setModo(v as "Gráfico" | "Tabela")} />}
      className="h-full"
    >
      {modo === "Gráfico" ? (
        <div style={{ height: altura }}><ResponsiveContainer width="100%" height="100%">{grafico}</ResponsiveContainer></div>
      ) : (
        <Table size="small" pagination={false} scroll={{ y: altura - 40 }} rowKey={(_, i) => String(i)} columns={tabela.colunas} dataSource={tabela.linhas} />
      )}
      {rodape}
    </Card>
  );
}

export function Painel({ dados }: { dados: Indicadores }) {
  const { kpis } = dados;
  const mensal = dados.mensal.map((m) => ({
    ...m,
    rotulo: rotuloMes(m.mes),
    taxaPct: m.taxaReaproveitamento == null ? null : Math.round(m.taxaReaproveitamento * 1000) / 10,
    co2t: Math.round(m.co2EvitadoKg) / 1000,
  }));
  const destinacoes = DESTINACOES_ORDENADAS.map((d) => {
    const v = dados.porDestinacao.find((x) => x.destinacao === d);
    return { destinacao: d, rotulo: DESTINACAO[d].rotulo, massaKg: Math.round(v?.massaKg ?? 0), itens: v?.itens ?? 0 };
  });
  const motivos = dados.porMotivo.map((m) => ({ ...m, rotulo: MOTIVO[m.motivo].rotulo }));
  const custos = dados.custosPorTipo.map((c) => ({ ...c, rotulo: TIPO_CUSTO[c.tipo], valor: Math.round(c.valor) }));

  if (kpis.devolucoes === 0) return <Alert type="info" showIcon title="Nenhuma devolução no período e filtros selecionados." />;

  return (
    <div className="flex flex-col gap-4">
      {/* Ambientais */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-emerald-800">Indicadores ambientais</h2>
        <Row gutter={[12, 12]}>
          <Col xs={12} md={8} xl={4}><Kpi titulo="Massa desviada de aterro" valor={kg(kpis.massaDesviadaKg)} detalhe={`de ${kg(kpis.massaDestinadaKg)} destinados`} dica="Massa dos itens cuja destinação não foi descarte (na reciclagem, só a parcela reciclável)." destaque="bom" /></Col>
          <Col xs={12} md={8} xl={5}>
            <Card size="small" className="h-full">
              <div className="text-xs text-gray-500">Taxa de reaproveitamento</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-700">{pct(kpis.taxaReaproveitamento)}</div>
              <Progress percent={Math.round((kpis.taxaReaproveitamento ?? 0) * 100)} showInfo={false} strokeColor="#1baf7a" size="small" />
            </Card>
          </Col>
          <Col xs={12} md={8} xl={5}><Kpi titulo="CO₂e evitado" valor={kg(kpis.co2EvitadoKg).replace("kg", "kgCO₂e").replace(" t", " tCO₂e")} detalhe="Σ massa reaproveitada × fator do material" dica="Estimativa por fatores de emissão editáveis em Cadastros › Materiais." destaque="bom" /></Col>
          <Col xs={12} md={12} xl={5}><Kpi titulo="Resíduos perigosos tratados" valor={kg(kpis.massaPerigosaKg)} detalhe="lítio, chumbo, eletrólito e placas eletrônicas" /></Col>
          <Col xs={24} md={12} xl={5}><Kpi titulo="Massa enviada a aterro" valor={kg(kpis.massaAterroKg)} detalhe="descarte adequado + rejeitos da reciclagem" /></Col>
        </Row>
      </section>

      {/* Operacionais e financeiros */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-600">Indicadores operacionais e financeiros</h2>
        <Row gutter={[12, 12]}>
          <Col xs={12} md={8} xl={4}>
            <Kpi titulo="Devoluções" valor={num(kpis.devolucoes)} detalhe={<><Tag color="geekblue" className="!m-0">{kpis.posVenda} pós-venda</Tag> <Tag color="green" className="!m-0">{kpis.posConsumo} pós-consumo</Tag></>} />
          </Col>
          <Col xs={12} md={8} xl={4}><Kpi titulo="Custo reverso total" valor={brl(kpis.custoTotal)} detalhe={kpis.custoMedioItem != null ? `${brl(kpis.custoMedioItem)} por item` : undefined} /></Col>
          <Col xs={12} md={8} xl={4}><Kpi titulo="Valor recuperado" valor={brl(kpis.valorRecuperado)} detalhe={`${pct(kpis.taxaRecuperacaoValor)} do valor de venda`} dica="Taxa de recuperação de valor = valor recuperado ÷ valor de venda dos itens devolvidos." /></Col>
          <Col xs={12} md={8} xl={4}><Kpi titulo="Resultado líquido" valor={brl(kpis.resultadoLiquido)} detalhe="recuperado − custos reversos" destaque={kpis.resultadoLiquido >= 0 ? "bom" : "ruim"} /></Col>
          <Col xs={12} md={8} xl={4}><Kpi titulo="Tempo médio de ciclo" valor={kpis.tempoMedioCicloDias != null ? `${num(kpis.tempoMedioCicloDias)} dias` : "—"} detalhe="da solicitação ao encerramento" /></Col>
          <Col xs={12} md={8} xl={4}><Kpi titulo="Taxa de recusa" valor={pct(kpis.taxaRecusa)} detalhe={`${kpis.itensDestinados} de ${kpis.itens} itens destinados`} /></Col>
        </Row>
      </section>

      <Row gutter={[12, 12]}>
        <Col xs={24} xl={14}>
          <CartaoGrafico
            titulo="Devoluções por mês e canal"
            grafico={
              <BarChart data={mensal} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRADE} />
                <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: GRADE }} />
                <YAxis tick={EIXO} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={(v) => num(v)} />
                <Tooltip cursor={{ fill: "#00000008" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="posVenda" name="Pós-venda" stackId="c" fill={COR.posVenda} stroke="#fff" strokeWidth={1} maxBarSize={28} />
                <Bar dataKey="posConsumo" name="Pós-consumo" stackId="c" fill={COR.posConsumo} stroke="#fff" strokeWidth={1} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            }
            tabela={{
              colunas: [{ title: "Mês", dataIndex: "rotulo" }, { title: "Pós-venda", dataIndex: "posVenda", align: "right" }, { title: "Pós-consumo", dataIndex: "posConsumo", align: "right" }],
              linhas: mensal,
            }}
          />
        </Col>
        <Col xs={24} xl={10}>
          <CartaoGrafico
            titulo="Massa por destinação"
            subtitulo="Ordem da hierarquia de resíduos (PNRS art. 9º)"
            grafico={
              <BarChart data={destinacoes} layout="vertical" margin={{ top: 4, right: 64, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="rotulo" width={150} tick={EIXO} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => kg(Number(v))} cursor={{ fill: "#00000008" }} />
                <Bar dataKey="massaKg" name="Massa" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {destinacoes.map((d) => <Cell key={d.destinacao} fill={DESTINACAO[d.destinacao].corHex} />)}
                  <LabelList dataKey="massaKg" position="right" formatter={(v) => kg(Number(v))} style={{ fontSize: 12, fill: "#52514e" }} />
                </Bar>
              </BarChart>
            }
            tabela={{
              colunas: [{ title: "Destinação", dataIndex: "rotulo" }, { title: "Itens", dataIndex: "itens", align: "right" }, { title: "Massa (kg)", dataIndex: "massaKg", align: "right" }],
              linhas: destinacoes,
            }}
          />
        </Col>

        <Col xs={24} lg={12}>
          <CartaoGrafico
            titulo="Taxa de reaproveitamento por mês"
            subtitulo="% da massa destinada desviada de aterro"
            altura={240}
            grafico={
              <LineChart data={mensal} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRADE} />
                <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: GRADE }} />
                <YAxis domain={[0, 100]} tick={EIXO} tickLine={false} axisLine={false} unit="%" />
                <Tooltip formatter={(v) => `${num(Number(v))}%`} />
                <Line type="monotone" dataKey="taxaPct" name="Reaproveitamento" stroke={COR.co2} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} connectNulls />
              </LineChart>
            }
            tabela={{ colunas: [{ title: "Mês", dataIndex: "rotulo" }, { title: "Reaproveitamento (%)", dataIndex: "taxaPct", align: "right" }], linhas: mensal }}
          />
        </Col>
        <Col xs={24} lg={12}>
          <CartaoGrafico
            titulo="CO₂e evitado por mês"
            subtitulo="toneladas de CO₂ equivalente"
            altura={240}
            grafico={
              <BarChart data={mensal} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke={GRADE} />
                <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: GRADE }} />
                <YAxis tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(v) => num(v)} />
                <Tooltip formatter={(v) => `${num(Number(v))} tCO₂e`} cursor={{ fill: "#00000008" }} />
                <Bar dataKey="co2t" name="CO₂e evitado" fill={COR.co2} radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            }
            tabela={{ colunas: [{ title: "Mês", dataIndex: "rotulo" }, { title: "tCO₂e", dataIndex: "co2t", align: "right" }], linhas: mensal }}
          />
        </Col>

        <Col xs={24} xl={14}>
          <CartaoGrafico
            titulo="Custo reverso × valor recuperado por mês"
            grafico={
              <BarChart data={mensal} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2}>
                <CartesianGrid vertical={false} stroke={GRADE} />
                <XAxis dataKey="rotulo" tick={EIXO} tickLine={false} axisLine={{ stroke: GRADE }} />
                <YAxis tick={EIXO} tickLine={false} axisLine={false} tickFormatter={(v) => brlCurto(v)} width={72} />
                <Tooltip formatter={(v) => brl(Number(v))} cursor={{ fill: "#00000008" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="custo" name="Custo reverso" fill={COR.custo} radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="recuperado" name="Valor recuperado" fill={COR.recuperado} radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            }
            tabela={{
              colunas: [{ title: "Mês", dataIndex: "rotulo" }, { title: "Custo (R$)", dataIndex: "custoF", align: "right" }, { title: "Recuperado (R$)", dataIndex: "recF", align: "right" }],
              linhas: mensal.map((m) => ({ ...m, custoF: brl(m.custo), recF: brl(m.recuperado) })),
            }}
          />
        </Col>
        <Col xs={24} xl={10}>
          <CartaoGrafico
            titulo="Composição do custo reverso"
            grafico={
              <BarChart data={custos} layout="vertical" margin={{ top: 4, right: 80, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="rotulo" width={170} tick={EIXO} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => brl(Number(v))} cursor={{ fill: "#00000008" }} />
                <Bar dataKey="valor" name="Custo" fill={COR.custo} radius={[0, 4, 4, 0]} maxBarSize={22}>
                  <LabelList dataKey="valor" position="right" formatter={(v) => brlCurto(Number(v))} style={{ fontSize: 12, fill: "#52514e" }} />
                </Bar>
              </BarChart>
            }
            tabela={{ colunas: [{ title: "Tipo", dataIndex: "rotulo" }, { title: "Valor (R$)", dataIndex: "valorF", align: "right" }], linhas: custos.map((c) => ({ ...c, valorF: brl(c.valor) })) }}
          />
        </Col>

        <Col xs={24} xl={10}>
          <CartaoGrafico
            titulo="Devoluções por motivo"
            grafico={
              <BarChart data={motivos} layout="vertical" margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="rotulo" width={180} tick={EIXO} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: "#00000008" }} />
                <Bar dataKey="quantidade" name="Devoluções" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {motivos.map((m) => <Cell key={m.motivo} fill={CANAL[m.canal].corHex} />)}
                  <LabelList dataKey="quantidade" position="right" style={{ fontSize: 12, fill: "#52514e" }} />
                </Bar>
              </BarChart>
            }
            tabela={{ colunas: [{ title: "Motivo", dataIndex: "rotulo" }, { title: "Devoluções", dataIndex: "quantidade", align: "right" }], linhas: motivos }}
            rodape={
              <div className="mt-2 flex justify-center gap-4 text-xs text-gray-600">
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COR.posVenda }} />Pós-venda</span>
                <span className="flex items-center gap-1"><span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: COR.posConsumo }} />Pós-consumo</span>
              </div>
            }
          />
        </Col>
        <Col xs={24} xl={14}>
          <Card size="small" title="Taxa de devolução por produto" extra={<span className="text-xs text-gray-500">devolvidos no período ÷ vendidos no período</span>} className="h-full">
            <Table
              size="small"
              rowKey="produtoId"
              pagination={{ pageSize: 6, size: "small" }}
              dataSource={dados.porProduto}
              columns={[
                { title: "Produto", dataIndex: "nome", render: (n: string, r) => <><div>{n}</div><div className="text-xs text-gray-500">{r.sku} · {CATEGORIA[r.categoria]}</div></> },
                { title: "Devolvidos", dataIndex: "devolvidos", align: "right", sorter: (a, b) => a.devolvidos - b.devolvidos },
                { title: "Vendidos", dataIndex: "vendidos", align: "right" },
                { title: "Taxa", dataIndex: "taxaDevolucao", align: "right", defaultSortOrder: "descend", sorter: (a, b) => (a.taxaDevolucao ?? 0) - (b.taxaDevolucao ?? 0), render: (t: number | null) => pct(t) },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
