"use server";
import { z } from "zod";
import { db } from "@/lib/db";
import * as servico from "@/servicos/devolucoes";
import { ErroDominio } from "@/servicos/devolucoes";
import { executar } from "./resultado";

const motivosPosVenda = z.enum(["ARREPENDIMENTO", "DEFEITO", "AVARIA_TRANSPORTE", "ITEM_ERRADO", "GARANTIA"]);
const motivosPosConsumo = z.enum(["FIM_DE_VIDA", "TROCA_TECNOLOGICA"]);
const itens = z
  .array(z.object({ produtoId: z.number().int().positive(), quantidade: z.number().int().min(1).max(50) }))
  .min(1, "Selecione ao menos um produto.");

/** Localiza a venda pelo número + e-mail do comprador (ambos precisam bater). */
export async function buscarVenda(numero: string, email: string) {
  return executar(async () => {
    const venda = await db.venda.findUnique({
      where: { numero: numero.trim().toUpperCase() },
      include: { cliente: true, itens: { include: { produto: true } } },
    });
    if (!venda || venda.cliente.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new ErroDominio("Venda não encontrada para este e-mail.");
    }
    return {
      numero: venda.numero,
      cliente: venda.cliente.nome.split(" ")[0],
      dataEntrega: venda.dataEntrega.toISOString(),
      itens: venda.itens.map((i) => ({ produtoId: i.produtoId, nome: i.produto.nome, quantidade: i.quantidade })),
    };
  });
}

export async function abrirPosVenda(e: { numero: string; email: string; motivo: string; descricao?: string; itens: { produtoId: number; quantidade: number }[] }) {
  return executar(async () => {
    const d = z.object({ numero: z.string(), email: z.string().email("E-mail inválido."), motivo: motivosPosVenda, descricao: z.string().max(1000).optional(), itens }).parse(e);
    const venda = await db.venda.findUnique({ where: { numero: d.numero.trim().toUpperCase() }, include: { cliente: true } });
    if (!venda || venda.cliente.email.toLowerCase() !== d.email.toLowerCase()) throw new ErroDominio("Venda não encontrada para este e-mail.");
    const dev = await db.$transaction((tx) =>
      servico.abrirDevolucao(tx, { canal: "POS_VENDA", motivo: d.motivo, origem: "PORTAL", clienteId: venda.clienteId, vendaId: venda.id, descricao: d.descricao, itens: d.itens, usuario: "Portal do Cliente" }),
    );
    return { protocolo: dev.protocolo, alertas: dev.alertas };
  });
}

export async function abrirPosConsumo(e: {
  nome: string; email: string; documento: string; cidade: string; uf: string; motivo: string; descricao?: string;
  itens: { produtoId: number; quantidade: number }[];
}) {
  return executar(async () => {
    const d = z
      .object({
        nome: z.string().min(3, "Informe o nome."),
        email: z.string().email("E-mail inválido."),
        documento: z.string().min(11, "Informe CPF ou CNPJ."),
        cidade: z.string().min(2, "Informe a cidade."),
        uf: z.string().length(2, "UF inválida."),
        motivo: motivosPosConsumo,
        descricao: z.string().max(1000).optional(),
        itens,
      })
      .parse(e);
    const email = d.email.toLowerCase();
    const cliente =
      (await db.cliente.findUnique({ where: { email } })) ??
      (await db.cliente.create({ data: { nome: d.nome, email, documento: d.documento, cidade: d.cidade, uf: d.uf.toUpperCase() } }));
    const dev = await db.$transaction((tx) =>
      servico.abrirDevolucao(tx, { canal: "POS_CONSUMO", motivo: d.motivo, origem: "PORTAL", clienteId: cliente.id, descricao: d.descricao, itens: d.itens, usuario: "Portal do Cliente" }),
    );
    return { protocolo: dev.protocolo, alertas: dev.alertas };
  });
}
