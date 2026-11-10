import { Alert, Card } from "antd";
import { BarraFiltros } from "@/components/BarraFiltros";
import { TabelaPnrs } from "@/components/TabelaPnrs";
import { BotaoImprimir } from "@/components/BotaoImprimir";
import { exigirSessao } from "@/lib/sessao";
import { dataFiltro } from "@/lib/formato";
import { lerFiltros, relatorioPnrs } from "@/servicos/consultas";

export default async function RelatorioPnrs({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirSessao("verPainel");
  const f = lerFiltros(await searchParams);
  const linhas = await relatorioPnrs(f);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Relatório de conformidade PNRS</h1>
          <p className="text-sm text-gray-500">Período: {dataFiltro(f.inicio)} a {dataFiltro(f.fim)} · devoluções não recusadas, por data de solicitação.</p>
        </div>
        <BotaoImprimir />
      </div>
      <Alert
        className="!mb-4" type="info" showIcon
        title="Política Nacional de Resíduos Sólidos — Lei 12.305/2010"
        description="Comerciantes de pilhas e baterias, lâmpadas e produtos eletroeletrônicos devem estruturar sistemas de logística reversa (art. 33), observando a ordem de prioridade: não geração, redução, reutilização, reciclagem, tratamento e disposição final ambientalmente adequada (art. 9º). O Decreto 10.240/2020 regulamenta o sistema para eletroeletrônicos de uso doméstico."
      />
      <div className="print:hidden"><BarraFiltros inicio={f.inicio.toISOString().slice(0, 10)} fim={f.fim.toISOString().slice(0, 10)} campos={[]} /></div>
      <Card size="small"><TabelaPnrs linhas={linhas} /></Card>
    </div>
  );
}
