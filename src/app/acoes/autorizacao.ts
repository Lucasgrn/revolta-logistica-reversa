import "server-only";
import { pode, type Acao } from "@/domain/fluxo";
import { obterSessao } from "@/lib/sessao";
import { ErroPermissao } from "./resultado";

/** Para Server Actions: exige sessão e permissão, sem redirecionar. */
export async function autorizar(acao: Acao) {
  const s = await obterSessao();
  if (!s || !pode(s.papel, acao)) throw new ErroPermissao();
  return s;
}
