"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Avatar, Button, Drawer, Grid, Layout, Menu, Tag } from "antd";
import {
  AppstoreOutlined, AuditOutlined, BarChartOutlined, DatabaseOutlined, ExperimentOutlined,
  LogoutOutlined, MenuOutlined, PlusCircleOutlined, SettingOutlined, ShoppingOutlined, SwapOutlined,
} from "@ant-design/icons";
import type { Papel } from "@/generated/prisma/enums";
import { PAPEL } from "@/domain/rotulos";
import { sair } from "@/app/acoes/auth";

const { Sider, Header, Content } = Layout;

export function Shell({ usuario, children }: { usuario: { nome: string; papel: Papel }; children: React.ReactNode }) {
  const caminho = usePathname();
  const telas = Grid.useBreakpoint();
  const [aberto, setAberto] = useState(false);
  const gestor = usuario.papel === "GESTOR";
  const podeRegistrar = usuario.papel !== "ANALISTA";

  const itens = [
    { key: "/painel", icon: <BarChartOutlined />, label: <Link href="/painel">Painel de indicadores</Link> },
    { key: "/devolucoes", icon: <SwapOutlined />, label: <Link href="/devolucoes">Devoluções</Link> },
    ...(podeRegistrar ? [{ key: "/devolucoes/nova", icon: <PlusCircleOutlined />, label: <Link href="/devolucoes/nova">Registrar devolução</Link> }] : []),
    { key: "/relatorio-pnrs", icon: <AuditOutlined />, label: <Link href="/relatorio-pnrs">Relatório PNRS</Link> },
    { key: "/vendas", icon: <ShoppingOutlined />, label: <Link href="/vendas">Vendas (referência)</Link> },
    ...(gestor
      ? [{
          key: "cadastros", icon: <DatabaseOutlined />, label: "Cadastros",
          children: [
            { key: "/cadastros/produtos", icon: <AppstoreOutlined />, label: <Link href="/cadastros/produtos">Produtos</Link> },
            { key: "/cadastros/materiais", icon: <ExperimentOutlined />, label: <Link href="/cadastros/materiais">Materiais e fatores</Link> },
            { key: "/cadastros/parametros", icon: <SettingOutlined />, label: <Link href="/cadastros/parametros">Parâmetros de custo</Link> },
          ],
        }]
      : []),
  ];
  const selecionado = [...itens.flatMap((i) => ("children" in i && i.children ? i.children : [i])).map((i) => i.key)]
    .filter((k) => caminho === k || caminho.startsWith(k + "/"))
    .sort((a, b) => b.length - a.length)[0];

  const menu = (
    <Menu theme="dark" mode="inline" selectedKeys={selecionado ? [selecionado] : []} defaultOpenKeys={["cadastros"]} items={itens} onClick={() => setAberto(false)} />
  );
  const logo = (
    <div className="px-6 py-5">
      <Link href="/painel" className="text-xl font-bold text-white">ReVolta</Link>
      <p className="text-xs text-emerald-200">Logística reversa · energia</p>
    </div>
  );

  return (
    <Layout hasSider className="min-h-screen">
      {telas.lg ? (
        // O fundo escuro acompanha toda a altura da página; o menu fica fixo no topo ao rolar.
        <div className="shrink-0 bg-[#0f3d2e]">
          <Sider width={248} className="!sticky top-0 h-screen overflow-auto">{logo}{menu}</Sider>
        </div>
      ) : (
        <Drawer open={aberto} onClose={() => setAberto(false)} placement="left" size={260} styles={{ body: { padding: 0, background: "#0f3d2e" }, header: { display: "none" } }}>
          {logo}{menu}
        </Drawer>
      )}
      <Layout>
        <Header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-gray-200 !px-4 sm:!px-6">
          {!telas.lg ? <Button type="text" icon={<MenuOutlined />} onClick={() => setAberto(true)} aria-label="Abrir menu" /> : <span />}
          <div className="flex items-center gap-3">
            <Avatar className="!bg-[#1f7a5a]">{usuario.nome[0]}</Avatar>
            <div className="hidden leading-tight sm:block">
              <div className="text-sm font-medium">{usuario.nome}</div>
              <Tag color="green" className="!m-0 !text-[11px]">{PAPEL[usuario.papel]}</Tag>
            </div>
            <form action={sair}><Button htmlType="submit" icon={<LogoutOutlined />}>Sair</Button></form>
          </div>
        </Header>
        <Content className="p-4 sm:p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
