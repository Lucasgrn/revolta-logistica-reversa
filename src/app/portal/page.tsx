import { FormPortal } from "@/components/portal/FormPortal";
import { db } from "@/lib/db";

export default async function Portal() {
  const produtos = await db.produto.findMany({ orderBy: [{ categoria: "asc" }, { nome: "asc" }], select: { id: true, nome: true, categoria: true } });
  return (
    <>
      <h1 className="text-2xl font-semibold">Devolver um produto</h1>
      <p className="mb-6 text-sm text-gray-600">
        Comprou conosco e precisa devolver? Ou tem um equipamento em fim de vida (bateria, painel, lâmpada, inversor)?
        Recebemos para dar a destinação ambientalmente adequada, conforme a Política Nacional de Resíduos Sólidos.
      </p>
      <FormPortal produtos={produtos} />
    </>
  );
}
