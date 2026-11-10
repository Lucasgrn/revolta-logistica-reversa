import { notFound } from "next/navigation";
import { DetalheDevolucao } from "@/components/devolucoes/DetalheDevolucao";
import { custosPermitidos, pode } from "@/domain/fluxo";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";
import { detalheDevolucao } from "@/servicos/consultas";
import { obterParametros } from "@/servicos/devolucoes";

export default async function PaginaDevolucao({ params }: { params: Promise<{ id: string }> }) {
  const s = await exigirSessao();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [devolucao, parametros] = await Promise.all([detalheDevolucao(id), obterParametros(db)]);
  if (!devolucao) notFound();

  return (
    <DetalheDevolucao
      devolucao={devolucao}
      parametros={parametros}
      permissoes={{
        transito: pode(s.papel, "registrarTransito"),
        recebimento: pode(s.papel, "registrarRecebimento"),
        triar: pode(s.papel, "triar"),
        recusar: pode(s.papel, "recusar"),
        encerrar: pode(s.papel, "encerrar"),
        financeiro: pode(s.papel, "lancarFinanceiro"),
        custos: custosPermitidos(s.papel),
      }}
    />
  );
}
