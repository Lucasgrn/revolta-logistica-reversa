import { ErroDominio } from "@/servicos/devolucoes";
import { z } from "zod";

export type Resultado<T = undefined> = { ok: true; dados?: T } | { ok: false; erro: string };

/** Converte erros de domínio e validação em mensagens para a interface. */
export async function executar<T>(fn: () => Promise<T>): Promise<Resultado<T>> {
  try {
    return { ok: true, dados: await fn() };
  } catch (e) {
    if (e instanceof ErroDominio) return { ok: false, erro: e.message };
    if (e instanceof z.ZodError) return { ok: false, erro: e.issues.map((i) => i.message).join("; ") };
    if (e instanceof ErroPermissao) return { ok: false, erro: e.message };
    console.error(e);
    return { ok: false, erro: "Erro inesperado. Tente novamente." };
  }
}

export class ErroPermissao extends Error {
  constructor() {
    super("Seu papel não tem permissão para esta ação.");
  }
}
