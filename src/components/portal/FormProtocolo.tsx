"use client";
import { useRouter } from "next/navigation";
import { Input } from "antd";

export function FormProtocolo({ inicial }: { inicial?: string }) {
  const router = useRouter();
  return (
    <Input.Search
      size="large" placeholder="Ex.: RV-2611-ABCDE" defaultValue={inicial} enterButton="Consultar"
      onSearch={(v) => v.trim() && router.push(`/portal/acompanhar?protocolo=${encodeURIComponent(v.trim())}`)}
    />
  );
}
