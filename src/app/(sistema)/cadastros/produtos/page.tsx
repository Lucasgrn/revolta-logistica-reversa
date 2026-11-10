import { Produtos } from "@/components/cadastros/Produtos";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaProdutos() {
  await exigirSessao("gerirCadastros");
  const [produtos, materiais] = await Promise.all([
    db.produto.findMany({ orderBy: [{ categoria: "asc" }, { nome: "asc" }], include: { composicao: { include: { material: true } } } }),
    db.material.findMany({ orderBy: { nome: "asc" } }),
  ]);
  return (
    <div>
      <h1 className="text-2xl font-semibold">Produtos</h1>
      <p className="text-sm text-gray-500">Catálogo com a composição de materiais de cada unidade — base dos indicadores ambientais e do valor de sucata.</p>
      <Produtos produtos={produtos} materiais={materiais} />
    </div>
  );
}
