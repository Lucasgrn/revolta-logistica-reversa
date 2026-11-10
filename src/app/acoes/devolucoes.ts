"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { custosPermitidos } from "@/domain/fluxo";
import { ErroDominio } from "@/servicos/devolucoes";
import * as servico from "@/servicos/devolucoes";
import { autorizar } from "./autorizacao";
import { executar } from "./resultado";

const id = z.number().int().positive();
const enumCanal = z.enum(["POS_VENDA", "POS_CONSUMO"]);
const enumMotivo = z.enum(["ARREPENDIMENTO", "DEFEITO", "AVARIA_TRANSPORTE", "ITEM_ERRADO", "GARANTIA", "FIM_DE_VIDA", "TROCA_TECNOLOGICA"]);
const enumCondicao = z.enum(["A", "B", "C", "D"]);
const enumDestinacao = z.enum(["RETORNO_ESTOQUE", "RECONDICIONAMENTO", "DEVOLUCAO_FORNECEDOR", "DESMONTAGEM_PECAS", "RECICLAGEM", "DESCARTE"]);
const enumCusto = z.enum(["FRETE_REVERSO", "TRIAGEM", "REPARO", "ARMAZENAGEM", "TRANSPORTE_DESCARTE", "EMBALAGEM"]);

function revalidar(devolucaoId?: number) {
  revalidatePath("/devolucoes");
  revalidatePath("/painel");
  if (devolucaoId) revalidatePath(`/devolucoes/${devolucaoId}`);
}

const novaDevolucao = z.object({
  canal: enumCanal,
  motivo: enumMotivo,
  clienteId: id,
  vendaId: id.nullish(),
  descricao: z.string().max(1000).optional(),
  itens: z.array(z.object({ produtoId: id, quantidade: z.number().int().min(1).max(100) })).min(1, "Inclua ao menos um produto."),
});

export async function criarDevolucaoInterna(entrada: z.input<typeof novaDevolucao>) {
  return executar(async () => {
    const s = await autorizar("registrarDevolucao");
    const d = novaDevolucao.parse(entrada);
    const dev = await db.$transaction((tx) => servico.abrirDevolucao(tx, { ...d, origem: "INTERNO", usuario: s.nome }));
    revalidar();
    return { id: dev.id, protocolo: dev.protocolo, alertas: dev.alertas };
  });
}

export async function registrarTransito(devolucaoId: number, r: { transportadora: string; rastreio?: string | null; valorFrete?: number | null }) {
  return executar(async () => {
    const s = await autorizar("registrarTransito");
    const d = z.object({ transportadora: z.string().min(2, "Informe a transportadora."), rastreio: z.string().nullish().transform((v) => v || undefined), valorFrete: z.number().min(0).nullish().transform((v) => v ?? 0) }).parse(r);
    await db.$transaction((tx) => servico.registrarTransito(tx, id.parse(devolucaoId), { ...d, usuario: s.nome }));
    revalidar(devolucaoId);
  });
}

export async function registrarRecebimento(devolucaoId: number, observacao?: string) {
  return executar(async () => {
    const s = await autorizar("registrarRecebimento");
    await db.$transaction((tx) => servico.registrarRecebimento(tx, id.parse(devolucaoId), { usuario: s.nome, observacao }));
    revalidar(devolucaoId);
  });
}

export async function iniciarTriagem(devolucaoId: number) {
  return executar(async () => {
    const s = await autorizar("triar");
    await db.$transaction((tx) => servico.iniciarTriagem(tx, id.parse(devolucaoId), { usuario: s.nome }));
    revalidar(devolucaoId);
  });
}

export async function recusar(devolucaoId: number, justificativa: string) {
  return executar(async () => {
    const s = await autorizar("recusar");
    await db.$transaction((tx) => servico.recusarDevolucao(tx, id.parse(devolucaoId), { justificativa, usuario: s.nome }));
    revalidar(devolucaoId);
  });
}

export async function encerrar(devolucaoId: number) {
  return executar(async () => {
    const s = await autorizar("encerrar");
    await db.$transaction((tx) => servico.encerrarDevolucao(tx, id.parse(devolucaoId), { usuario: s.nome }));
    revalidar(devolucaoId);
  });
}

export async function sugerir(itemId: number, condicao: string) {
  return executar(async () => {
    await autorizar("triar");
    return servico.sugestaoParaItem(db, id.parse(itemId), enumCondicao.parse(condicao));
  });
}

export async function destinarItem(
  devolucaoId: number,
  itemId: number,
  r: { condicao: string; destinacao: string; observacao?: string | null; numeroSerie?: string | null; valorRecuperado?: number | null },
) {
  return executar(async () => {
    const s = await autorizar("triar");
    const d = z
      .object({
        condicao: enumCondicao,
        destinacao: enumDestinacao,
        observacao: z.string().max(500).nullish().transform((v) => v || undefined),
        numeroSerie: z.string().max(60).nullish().transform((v) => v || undefined),
        valorRecuperado: z.number().min(0).nullish(),
      })
      .parse(r);
    await db.$transaction((tx) => servico.destinarItem(tx, id.parse(itemId), { ...d, usuario: s.nome }));
    revalidar(devolucaoId);
  });
}

export async function lancarCusto(devolucaoId: number, c: { tipo: string; valor: number; descricao?: string | null; itemId?: number | null }) {
  return executar(async () => {
    const s = await autorizar("lancarFinanceiro");
    const d = z.object({ tipo: enumCusto, valor: z.number().positive("O valor deve ser positivo."), descricao: z.string().max(200).nullish().transform((v) => v ?? undefined), itemId: id.nullish() }).parse(c);
    if (!custosPermitidos(s.papel).includes(d.tipo)) throw new ErroDominio("Seu papel não pode lançar este tipo de custo.");
    await servico.lancarCusto(db, id.parse(devolucaoId), d);
    revalidar(devolucaoId);
  });
}

export async function removerCusto(custoId: number) {
  return executar(async () => {
    const s = await autorizar("lancarFinanceiro");
    const c = await db.custoReverso.findUniqueOrThrow({ where: { id: id.parse(custoId) } });
    if (c.automatico) throw new ErroDominio("Custos automáticos são recalculados pela destinação do item.");
    if (!custosPermitidos(s.papel).includes(c.tipo)) throw new ErroDominio("Seu papel não pode remover este tipo de custo.");
    const devolucaoId = await servico.removerCusto(db, custoId);
    revalidar(devolucaoId);
  });
}

export async function confirmarValor(recuperacaoId: number, valor: number) {
  return executar(async () => {
    await autorizar("triar");
    const devolucaoId = await servico.confirmarValorRecuperado(db, id.parse(recuperacaoId), z.number().min(0).parse(valor));
    revalidar(devolucaoId);
  });
}
