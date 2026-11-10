import { FormNovaDevolucao } from "@/components/devolucoes/FormNovaDevolucao";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";

export default async function NovaDevolucao() {
  await exigirSessao("registrarDevolucao");
  const [clientes, vendas, produtos] = await Promise.all([
    db.cliente.findMany({ orderBy: { nome: "asc" }, select: { id: true, nome: true, documento: true } }),
    db.venda.findMany({
      orderBy: { dataEntrega: "desc" },
      select: { id: true, numero: true, dataEntrega: true, clienteId: true, cliente: { select: { nome: true } }, itens: { select: { produtoId: true, quantidade: true, produto: { select: { nome: true } } } } },
    }),
    db.produto.findMany({ orderBy: [{ categoria: "asc" }, { nome: "asc" }], select: { id: true, nome: true, sku: true, categoria: true } }),
  ]);
  return (
    <div className="max-w-3xl">
      <h1 className="mb-1 text-2xl font-semibold">Registrar devolução</h1>
      <p className="mb-4 text-sm text-gray-500">Registro interno (balcão, telefone, e-mail ou ponto de entrega voluntária).</p>
      <FormNovaDevolucao clientes={clientes} vendas={vendas} produtos={produtos} />
    </div>
  );
}
