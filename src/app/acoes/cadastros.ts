"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { autorizar } from "./autorizacao";
import { executar } from "./resultado";

const categoria = z.enum(["PAINEL_SOLAR", "INVERSOR", "BATERIA", "MEDIDOR", "ILUMINACAO_LED", "CABOS_CONECTORES"]);

const produto = z.object({
  id: z.number().int().positive().optional(),
  sku: z.string().min(2).max(30),
  nome: z.string().min(3).max(120),
  categoria,
  preco: z.number().positive(),
  custo: z.number().positive(),
  garantiaMeses: z.number().int().min(0).max(360),
  composicao: z
    .array(z.object({ materialId: z.number().int().positive(), massaKg: z.number().positive() }))
    .min(1, "Informe ao menos um material na composição.")
    .refine((c) => new Set(c.map((x) => x.materialId)).size === c.length, "Material repetido na composição."),
});

export async function salvarProduto(e: z.input<typeof produto>) {
  return executar(async () => {
    await autorizar("gerirCadastros");
    const { id, composicao, ...dados } = produto.parse(e);
    await db.$transaction(async (tx) => {
      const p = id ? await tx.produto.update({ where: { id }, data: dados }) : await tx.produto.create({ data: dados });
      await tx.composicaoMaterial.deleteMany({ where: { produtoId: p.id } });
      await tx.composicaoMaterial.createMany({ data: composicao.map((c) => ({ ...c, produtoId: p.id })) });
    });
    revalidatePath("/cadastros/produtos");
  });
}

const material = z.object({
  id: z.number().int().positive().optional(),
  nome: z.string().min(2).max(80),
  fatorCo2: z.number().min(0).max(100),
  precoSucata: z.number().min(0),
  reciclavel: z.boolean(),
  perigoso: z.boolean(),
});

export async function salvarMaterial(e: z.input<typeof material>) {
  return executar(async () => {
    await autorizar("gerirCadastros");
    const { id, ...dados } = material.parse(e);
    if (id) await db.material.update({ where: { id }, data: dados });
    else await db.material.create({ data: dados });
    revalidatePath("/cadastros/materiais");
    revalidatePath("/painel");
  });
}

const parametros = z.object({
  prazoArrependimentoDias: z.number().int().min(0).max(90),
  custoTriagemItem: z.number().min(0),
  custoArmazenagemDia: z.number().min(0),
  custoEmbalagemItem: z.number().min(0),
  custoReparoPercentual: z.number().min(0).max(1),
  custoDescarteKg: z.number().min(0),
  custoTransporteKg: z.number().min(0),
  pctRevendaEstoque: z.number().min(0).max(1),
  pctRevendaRecondicionado: z.number().min(0).max(1),
  pctPecas: z.number().min(0).max(1),
  pctCreditoFornecedor: z.number().min(0).max(1),
});

export async function salvarParametros(e: z.input<typeof parametros>) {
  return executar(async () => {
    await autorizar("gerirCadastros");
    const dados = parametros.parse(e);
    await db.parametros.upsert({ where: { id: 1 }, update: dados, create: { id: 1, ...dados } });
    revalidatePath("/cadastros/parametros");
  });
}
