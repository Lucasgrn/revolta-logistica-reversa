import { BotaoNova } from "@/components/devolucoes/BotaoNova";
import { BarraFiltros } from "@/components/BarraFiltros";
import { AreaDados, Filtragem } from "@/components/Filtragem";
import { TabelaDevolucoes } from "@/components/devolucoes/TabelaDevolucoes";
import { pode } from "@/domain/fluxo";
import { exigirSessao } from "@/lib/sessao";
import { lerFiltros, listarDevolucoes } from "@/servicos/consultas";

export default async function PaginaDevolucoes({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const s = await exigirSessao();
  const f = lerFiltros(await searchParams);
  const linhas = await listarDevolucoes(f);
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Devoluções</h1>
          <p className="text-sm text-gray-500">
            <span className="mr-3"><span className="mr-1 inline-block h-3 w-1 bg-pos-venda align-middle" />Pós-venda</span>
            <span><span className="mr-1 inline-block h-3 w-1 bg-pos-consumo align-middle" />Pós-consumo</span>
          </p>
        </div>
        {pode(s.papel, "registrarDevolucao") && (
          <BotaoNova />
        )}
      </div>
      <Filtragem>
        <BarraFiltros inicio={f.inicio.toISOString().slice(0, 10)} fim={f.fim.toISOString().slice(0, 10)} campos={["busca", "canal", "status", "motivo", "categoria"]} />
        <AreaDados><TabelaDevolucoes linhas={linhas} /></AreaDados>
      </Filtragem>
    </div>
  );
}
