import { Alert } from "antd";
import { Materiais } from "@/components/cadastros/Materiais";
import { db } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";

export default async function PaginaMateriais() {
  await exigirSessao("gerirCadastros");
  const materiais = await db.material.findMany({ orderBy: { nome: "asc" }, include: { _count: { select: { composicoes: true } } } });
  return (
    <div>
      <h1 className="text-2xl font-semibold">Materiais e fatores ambientais</h1>
      <p className="mb-3 text-sm text-gray-500">Fatores usados no cálculo de CO₂e evitado, valor de sucata e classificação de resíduos.</p>
      <Alert className="!mb-4" type="info" showIcon title="Os valores iniciais são ilustrativos, para fins acadêmicos, na ordem de grandeza de bases como EPA WARM e estudos de ACV. Ajuste-os conforme a fonte adotada e a região." />
      <Materiais materiais={materiais} />
    </div>
  );
}
