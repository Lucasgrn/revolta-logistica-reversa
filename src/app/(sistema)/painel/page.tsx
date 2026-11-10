import { Alert } from "antd";
import { BarraFiltros } from "@/components/BarraFiltros";
import { AreaDados, Filtragem } from "@/components/Filtragem";
import { Painel } from "@/components/painel/Painel";
import { exigirSessao } from "@/lib/sessao";
import { indicadores, lerFiltros } from "@/servicos/consultas";

export default async function PaginaPainel({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await exigirSessao("verPainel");
  const sp = await searchParams;
  const f = lerFiltros(sp);
  const dados = await indicadores(f);
  return (
    <div>
      <div className="mb-3">
        <h1 className="text-2xl font-semibold">Painel de indicadores</h1>
        <p className="text-sm text-gray-500">Desempenho ambiental, operacional e financeiro do fluxo reverso, por data de solicitação.</p>
      </div>
      {sp.negado && <Alert className="!mb-3" type="warning" showIcon title="Seu papel não tem acesso à página solicitada." />}
      <Filtragem>
        <BarraFiltros inicio={f.inicio.toISOString().slice(0, 10)} fim={f.fim.toISOString().slice(0, 10)} />
        <AreaDados><Painel dados={dados} /></AreaDados>
      </Filtragem>
    </div>
  );
}
