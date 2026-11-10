"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button, DatePicker, Input, Select } from "antd";
import { ClearOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { CANAL, CATEGORIA, MOTIVO, STATUS } from "@/domain/rotulos";

const opcoes = (r: Record<string, string | { rotulo: string }>) =>
  Object.entries(r).map(([value, v]) => ({ value, label: typeof v === "string" ? v : v.rotulo }));

export function BarraFiltros({ inicio, fim, campos = ["canal", "categoria", "motivo"] }: {
  inicio: string; fim: string; campos?: ("canal" | "categoria" | "motivo" | "status" | "busca")[];
}) {
  const router = useRouter();
  const caminho = usePathname();
  const sp = useSearchParams();
  const [pendente, iniciar] = useTransition();

  const definir = (mudancas: Record<string, string | undefined>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(mudancas)) {
      if (v) p.set(k, v);
      else p.delete(k);
    }
    iniciar(() => router.push(`${caminho}?${p.toString()}`));
  };

  return (
    <div className={`mb-4 flex flex-wrap items-center gap-2 transition-opacity ${pendente ? "opacity-60" : ""}`}>
      <DatePicker.RangePicker
        allowClear={false}
        value={[dayjs(inicio), dayjs(fim)]}
        format="DD/MM/YYYY"
        presets={[
          { label: "Últimos 30 dias", value: [dayjs().subtract(30, "day"), dayjs()] },
          { label: "Últimos 3 meses", value: [dayjs().subtract(3, "month").startOf("month"), dayjs()] },
          { label: "Últimos 12 meses", value: [dayjs().subtract(11, "month").startOf("month"), dayjs()] },
          { label: "Ano corrente", value: [dayjs().startOf("year"), dayjs()] },
        ]}
        onChange={(v) => v?.[0] && v[1] && definir({ inicio: v[0].format("YYYY-MM-DD"), fim: v[1].format("YYYY-MM-DD") })}
      />
      {campos.includes("canal") && (
        <Select allowClear placeholder="Canal" className="min-w-36" value={sp.get("canal") ?? undefined} options={opcoes(CANAL)} onChange={(v) => definir({ canal: v })} />
      )}
      {campos.includes("categoria") && (
        <Select allowClear placeholder="Categoria" className="min-w-44" value={sp.get("categoria") ?? undefined} options={opcoes(CATEGORIA)} onChange={(v) => definir({ categoria: v })} />
      )}
      {campos.includes("motivo") && (
        <Select allowClear placeholder="Motivo" className="min-w-52" value={sp.get("motivo") ?? undefined} options={opcoes(MOTIVO)} onChange={(v) => definir({ motivo: v })} />
      )}
      {campos.includes("status") && (
        <Select allowClear placeholder="Status" className="min-w-36" value={sp.get("status") ?? undefined} options={opcoes(STATUS)} onChange={(v) => definir({ status: v })} />
      )}
      {campos.includes("busca") && (
        <Input.Search allowClear placeholder="Protocolo, cliente ou venda" className="!w-64" defaultValue={sp.get("busca") ?? ""} onSearch={(v) => definir({ busca: v || undefined })} />
      )}
      <Button icon={<ClearOutlined />} onClick={() => iniciar(() => router.push(caminho))}>Limpar</Button>
    </div>
  );
}
