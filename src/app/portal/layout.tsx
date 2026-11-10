import Link from "next/link";

export const dynamic = "force-dynamic";

export default function LayoutPortal({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f2f7f4]">
      <header className="bg-[#0f3d2e] text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold">ReVolta <span className="font-normal text-emerald-200">· Portal do Cliente</span></Link>
          <nav className="flex gap-4 text-sm">
            <Link href="/portal" className="text-emerald-100 hover:text-white">Devolver</Link>
            <Link href="/portal/acompanhar" className="text-emerald-100 hover:text-white">Acompanhar</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
