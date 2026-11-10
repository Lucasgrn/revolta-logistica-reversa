import { Shell } from "@/components/Shell";
import { exigirSessao } from "@/lib/sessao";

export default async function LayoutSistema({ children }: { children: React.ReactNode }) {
  const s = await exigirSessao();
  return <Shell usuario={{ nome: s.nome, papel: s.papel }}>{children}</Shell>;
}
