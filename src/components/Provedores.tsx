"use client";
import { App, ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

export function Provedores({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: "#1f7a5a",
          colorInfo: "#2a78d6",
          borderRadius: 8,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
        },
        components: {
          Layout: { siderBg: "#0f3d2e", headerBg: "#ffffff", bodyBg: "#f5f7f6" },
          Menu: {
            darkItemBg: "#0f3d2e",
            darkSubMenuItemBg: "#0b3025",
            darkItemSelectedBg: "#1f7a5a",
          },
        },
      }}
    >
      <App>{children}</App>
    </ConfigProvider>
  );
}
