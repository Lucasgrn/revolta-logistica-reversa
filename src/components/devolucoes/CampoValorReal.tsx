"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { App, InputNumber } from "antd";
import { CheckOutlined, LoadingOutlined } from "@ant-design/icons";
import { confirmarValor } from "@/app/acoes/devolucoes";

/** Substitui um valor recuperado estimado pelo valor real. Salva com Enter ou ao sair do campo. */
export function CampoValorReal({ id, valor }: { id: number; valor: number }) {
  const router = useRouter();
  const { message } = App.useApp();
  const [atual, setAtual] = useState<number | null>(valor);
  const [salvando, iniciar] = useTransition();
  const [salvo, setSalvo] = useState(false);
  const ultimoSalvo = useRef(valor);

  useEffect(() => {
    if (!salvo) return;
    const t = setTimeout(() => setSalvo(false), 1800);
    return () => clearTimeout(t);
  }, [salvo]);

  const salvar = () => {
    if (atual == null || atual === ultimoSalvo.current) return;
    const n = atual;
    iniciar(async () => {
      const r = await confirmarValor(id, n);
      if (r.ok) {
        ultimoSalvo.current = n;
        setSalvo(true);
        router.refresh();
      } else {
        message.error(r.erro);
        setAtual(ultimoSalvo.current);
      }
    });
  };

  return (
    <span className="inline-flex items-center gap-2">
      <span className="w-12 text-right text-xs" aria-live="polite">
        {salvando ? <LoadingOutlined className="text-gray-400" /> : salvo ? <span className="entrada-suave text-emerald-700"><CheckOutlined /> salvo</span> : null}
      </span>
      <InputNumber
        size="small" min={0} step={10} precision={2} prefix="R$" className="!w-36" decimalSeparator=","
        value={atual}
        onChange={(v) => setAtual(v == null ? null : Number(v))}
        onPressEnter={salvar}
        onBlur={salvar}
        aria-label="Valor real recuperado"
      />
    </span>
  );
}
