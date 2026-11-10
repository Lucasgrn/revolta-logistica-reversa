import Link from "next/link";
import { Button } from "antd";

const ETAPAS = [
  ["Solicitação", "Cliente abre a devolução pelo portal ou no balcão"],
  ["Coleta e recebimento", "Frete reverso, conferência física"],
  ["Triagem", "Inspeção, condição A–D e destinação sugerida"],
  ["Destinação", "Estoque, recondicionamento, fornecedor, peças, reciclagem ou descarte"],
  ["Indicadores", "Custos reversos, valor recuperado, massa desviada e CO₂e evitado"],
];

export default function Inicio() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-[#0f3d2e] to-[#1f7a5a] text-white">
      <div className="mx-auto max-w-5xl px-4 py-14 sm:py-20">
        <p className="text-sm uppercase tracking-widest text-emerald-200">Logística reversa · varejo de energia</p>
        <h1 className="mt-3 text-4xl font-bold sm:text-5xl">ReVolta</h1>
        <p className="mt-4 max-w-2xl text-lg text-emerald-50">
          Gestão de devoluções, reaproveitamento de materiais, custos reversos e indicadores ambientais
          para painéis solares, inversores, baterias, medidores e iluminação LED — alinhada à PNRS (Lei 12.305/2010).
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login"><Button type="primary" size="large" className="!bg-white !text-[#0f3d2e]">Acessar o sistema</Button></Link>
          <Link href="/portal"><Button size="large" ghost>Portal do Cliente — devolver um produto</Button></Link>
          <Link href="/portal/acompanhar"><Button size="large" type="text" className="!text-emerald-100">Acompanhar protocolo</Button></Link>
        </div>
        <ol className="mt-14 grid gap-3 sm:grid-cols-5">
          {ETAPAS.map(([t, d], i) => (
            <li key={t} className="rounded-xl bg-white/10 p-4">
              <span className="text-xs text-emerald-200">Etapa {i + 1}</span>
              <p className="mt-1 font-semibold">{t}</p>
              <p className="mt-1 text-sm text-emerald-100">{d}</p>
            </li>
          ))}
        </ol>
      </div>
    </main>
  );
}
