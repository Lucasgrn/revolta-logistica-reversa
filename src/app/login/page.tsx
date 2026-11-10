import Link from "next/link";
import { FormLogin } from "./FormLogin";

export default async function Login({ searchParams }: { searchParams: Promise<{ de?: string }> }) {
  const { de } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0f3d2e] px-4">
      <Link href="/" className="text-2xl font-bold text-white">ReVolta</Link>
      <FormLogin de={de} />
    </main>
  );
}
