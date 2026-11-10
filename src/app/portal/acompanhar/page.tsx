import { Alert, Card, Steps, Tag } from "antd";
import { db } from "@/lib/db";
import { ETAPAS } from "@/domain/fluxo";
import { CANAL, DESTINACAO, MOTIVO, STATUS } from "@/domain/rotulos";
import { data, dataHora } from "@/lib/formato";
import { FormProtocolo } from "@/components/portal/FormProtocolo";

export default async function Acompanhar({ searchParams }: { searchParams: Promise<{ protocolo?: string }> }) {
  const protocolo = (await searchParams).protocolo?.trim().toUpperCase();
  const d = protocolo
    ? await db.devolucao.findUnique({
        where: { protocolo },
        include: { itens: { include: { produto: { select: { nome: true } } } }, historico: { orderBy: { em: "asc" } } },
      })
    : null;
  const atual = d ? (d.status === "RECUSADA" ? ETAPAS.indexOf(d.historico.at(-2)?.para ?? "SOLICITADA") : ETAPAS.indexOf(d.status)) : 0;

  return (
    <>
      <h1 className="mb-4 text-2xl font-semibold">Acompanhar solicitação</h1>
      <FormProtocolo inicial={protocolo} />
      {protocolo && !d && <Alert className="!mt-4" type="error" showIcon title="Protocolo não encontrado." />}
      {d && (
        <Card className={`!mt-4 ${d.canal === "POS_VENDA" ? "borda-pos-venda" : "borda-pos-consumo"}`}>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="font-mono text-lg font-semibold">{d.protocolo}</span>
            <Tag color={CANAL[d.canal].cor}>{CANAL[d.canal].rotulo}</Tag>
            <Tag color={STATUS[d.status].cor}>{STATUS[d.status].rotulo}</Tag>
          </div>
          <p className="mb-4 text-sm text-gray-600">{MOTIVO[d.motivo].rotulo} · aberta em {data(d.criadaEm)}</p>
          <Steps orientation="vertical" size="small" current={atual} status={d.status === "RECUSADA" ? "error" : d.status === "ENCERRADA" ? "finish" : "process"}
            items={ETAPAS.map((e) => {
              const h = d.historico.find((x) => x.para === e);
              return { title: STATUS[e].rotulo, content: h ? dataHora(h.em) : undefined };
            })}
          />
          {d.status === "RECUSADA" && <Alert type="error" showIcon title="Solicitação recusada" description={d.historico.at(-1)?.observacao} />}
          <h3 className="mt-4 mb-2 font-medium">Itens</h3>
          <ul className="space-y-1 text-sm">
            {d.itens.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center gap-2">
                {i.produto.nome}
                {i.destinacao && <Tag color={DESTINACAO[i.destinacao].cor}>{DESTINACAO[i.destinacao].rotulo}</Tag>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
