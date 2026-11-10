import { TabelaVendas } from "@/components/TabelaVendas";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";

export default async function Vendas() {
  await exigirSessao();
  const vendas = await db.venda.findMany({
    orderBy: { dataEntrega: "desc" },
    include: { cliente: true, itens: { include: { produto: { select: { nome: true } } } }, _count: { select: { devolucoes: true } } },
  });
  return (
    <div>
      <h1 className="text-2xl font-semibold">Vendas (referência)</h1>
      <p className="mb-4 text-sm text-gray-500">Somente leitura — importadas do e-commerce. Servem para validar prazos e garantia e calcular a taxa de devolução.</p>
      <TabelaVendas
        linhas={vendas.map((v) => ({
          id: v.id, numero: v.numero, cliente: v.cliente.nome, cidade: `${v.cliente.cidade}/${v.cliente.uf}`, dataEntrega: v.dataEntrega,
          itens: v.itens.map((i) => `${i.quantidade}× ${i.produto.nome}`).join(", "),
          total: v.itens.reduce((s, i) => s + i.quantidade * i.precoUnitario, 0),
          devolucoes: v._count.devolucoes,
        }))}
      />
    </div>
  );
}
