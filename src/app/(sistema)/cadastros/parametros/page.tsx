import { FormParametros } from "@/components/cadastros/FormParametros";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";
import { obterParametros } from "@/servicos/devolucoes";

export default async function PaginaParametros() {
  await exigirSessao("gerirCadastros");
  const p = await obterParametros(db);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Parâmetros de custo e recuperação</h1>
      <p className="mb-4 text-sm text-gray-500">Valores usados no cálculo automático quando um item é destinado. Alterações não recalculam destinações já feitas.</p>
      <FormParametros parametros={p} />
    </div>
  );
}
