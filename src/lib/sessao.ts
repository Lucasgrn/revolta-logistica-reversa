import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Papel } from "../generated/prisma/enums";
import { pode, type Acao } from "../domain/fluxo";

export const COOKIE_SESSAO = "sessao";
const DURACAO_S = 60 * 60 * 8;

export interface Sessao {
  id: number;
  nome: string;
  papel: Papel;
}

export function chaveSessao() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET ausente ou com menos de 32 caracteres.");
  return new TextEncoder().encode(s);
}

export async function lerToken(token: string | undefined): Promise<Sessao | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, chaveSessao());
    return { id: Number(payload.sub), nome: String(payload.nome), papel: payload.papel as Papel };
  } catch {
    return null;
  }
}

export async function criarSessao(s: Sessao) {
  const token = await new SignJWT({ nome: s.nome, papel: s.papel })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(s.id))
    .setIssuedAt()
    .setExpirationTime(`${DURACAO_S}s`)
    .sign(chaveSessao());
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_S,
  });
}

export async function encerrarSessao() {
  (await cookies()).delete(COOKIE_SESSAO);
}

export async function obterSessao() {
  return lerToken((await cookies()).get(COOKIE_SESSAO)?.value);
}

/** Para páginas: redireciona ao login sem sessão e ao painel sem permissão. */
export async function exigirSessao(acao?: Acao): Promise<Sessao> {
  const s = await obterSessao();
  if (!s) redirect("/login");
  if (acao && !pode(s.papel, acao)) redirect("/painel?negado=1");
  return s;
}
