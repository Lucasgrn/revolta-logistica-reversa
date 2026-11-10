import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Provedores } from "@/components/Provedores";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ReVolta — Logística Reversa",
  description:
    "Gestão de devoluções, reaproveitamento de materiais, custos reversos e indicadores ambientais para o varejo de energia.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} antialiased`}>
        <AntdRegistry layer>
          <Provedores>{children}</Provedores>
        </AntdRegistry>
      </body>
    </html>
  );
}
