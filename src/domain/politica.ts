// Alertas de Política: avisos (não bloqueios) sobre prazos de pós-venda.
import type { Canal, Motivo } from "../generated/prisma/enums";

const DIA_MS = 86_400_000;

export function diasEntre(inicio: Date, fim: Date) {
  return Math.floor((fim.getTime() - inicio.getTime()) / DIA_MS);
}

export function adicionarMeses(data: Date, meses: number) {
  const d = new Date(data);
  d.setMonth(d.getMonth() + meses);
  return d;
}

export interface EntradaPolitica {
  canal: Canal;
  motivo: Motivo;
  dataSolicitacao: Date;
  /** Data de entrega da venda vinculada (pós-venda). */
  dataEntrega?: Date | null;
  prazoArrependimentoDias: number;
  /** Garantia em meses de cada produto devolvido. */
  produtos: { nome: string; garantiaMeses: number }[];
}

export function alertasDePolitica(e: EntradaPolitica): string[] {
  if (e.canal !== "POS_VENDA") return [];
  if (!e.dataEntrega) return ["Devolução de pós-venda sem venda vinculada."];

  const alertas: string[] = [];
  const dias = diasEntre(e.dataEntrega, e.dataSolicitacao);

  if (e.motivo === "ARREPENDIMENTO" && dias > e.prazoArrependimentoDias) {
    alertas.push(
      `Arrependimento solicitado ${dias} dias após a entrega (prazo legal: ${e.prazoArrependimentoDias} dias).`,
    );
  }

  if (e.motivo === "GARANTIA" || e.motivo === "DEFEITO") {
    for (const p of e.produtos) {
      const fimGarantia = adicionarMeses(e.dataEntrega, p.garantiaMeses);
      if (e.dataSolicitacao > fimGarantia) {
        alertas.push(`Garantia de "${p.nome}" vencida (${p.garantiaMeses} meses).`);
      }
    }
  }
  return [...new Set(alertas)];
}

export function dentroDaGarantia(dataEntrega: Date | null | undefined, garantiaMeses: number, em: Date) {
  if (!dataEntrega) return false;
  return em <= adicionarMeses(dataEntrega, garantiaMeses);
}
