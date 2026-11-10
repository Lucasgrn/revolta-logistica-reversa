"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { criarSessao, encerrarSessao } from "@/lib/sessao";

export async function entrar(_: { erro?: string } | undefined, form: FormData) {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");
  const destino = String(form.get("de") ?? "/painel");
  const u = await db.usuario.findUnique({ where: { email } });
  if (!u || !(await bcrypt.compare(senha, u.senhaHash))) return { erro: "E-mail ou senha inválidos." };
  await criarSessao({ id: u.id, nome: u.nome, papel: u.papel });
  redirect(destino.startsWith("/") && !destino.startsWith("//") ? destino : "/painel");
}

export async function sair() {
  await encerrarSessao();
  redirect("/login");
}
