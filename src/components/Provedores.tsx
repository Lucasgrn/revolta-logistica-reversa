"use client";
import { useSyncExternalStore } from "react";
import { App, ConfigProvider } from "antd";
import ptBR from "antd/locale/pt_BR";
import dayjs from "dayjs";
import "dayjs/locale/pt-br";

dayjs.locale("pt-br");

const CONSULTA_MOVIMENTO = "(prefers-reduced-motion: reduce)";
const assinarMovimento = (cb: () => void) => {
  const mq = window.matchMedia(CONSULTA_MOVIMENTO);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

export function Provedores({ children }: { children: React.ReactNode }) {
  // Quem pediu menos movimento recebe os componentes antd sem animação de transformação.
  const reduzirMovimento = useSyncExternalStore(
    assinarMovimento,
    () => window.matchMedia(CONSULTA_MOVIMENTO).matches,
    () => false,
  );
  return (
    <ConfigProvider
      locale={ptBR}
      theme={{
        token: {
          colorPrimary: "#1f7a5a",
          colorInfo: "#2a78d6",
          borderRadius: 8,
          fontFamily: "var(--font-inter), system-ui, sans-serif",
          // Curvas e durações mais firmes que o padrão do antd (ver globals.css --ease-out)
          motion: !reduzirMovimento,
          motionEaseOut: "cubic-bezier(0.23, 1, 0.32, 1)",
          motionEaseInOut: "cubic-bezier(0.77, 0, 0.175, 1)",
          motionDurationFast: "0.1s",
          motionDurationMid: "0.15s",
          motionDurationSlow: "0.22s",
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
