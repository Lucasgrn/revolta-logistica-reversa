const brlFmt = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brlCompacto = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", notation: "compact", maximumFractionDigits: 1 });
const numFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const dataFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "America/Sao_Paulo" });
const dataHoraFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export const brl = (v: number) => brlFmt.format(v);
export const brlCurto = (v: number) => brlCompacto.format(v);
export const num = (v: number) => numFmt.format(v);
export const kg = (v: number) => (Math.abs(v) >= 1000 ? `${numFmt.format(v / 1000)} t` : `${numFmt.format(v)} kg`);
export const pct = (v: number | null) => (v == null ? "—" : `${numFmt.format(v * 100)}%`);
/** Datas de filtro (meia-noite UTC) — formatadas sem conversão de fuso. */
const dataUtcFmt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeZone: "UTC" });
export const dataFiltro = (d: Date) => dataUtcFmt.format(d);
export const data = (d: Date | string) => dataFmt.format(new Date(d));
export const dataHora = (d: Date | string) => dataHoraFmt.format(new Date(d));
export const rotuloMes = (aaaamm: string) => {
  const [a, m] = aaaamm.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, 15)).toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
};
