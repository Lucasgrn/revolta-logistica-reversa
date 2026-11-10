"use client";
import { createContext, useContext, useTransition, type TransitionStartFunction } from "react";

// Compartilha o estado "carregando novo filtro" entre a barra de filtros e a área de dados,
// para que a indicação apareça sobre os dados que estão sendo substituídos.
const Contexto = createContext<{ pendente: boolean; iniciar: TransitionStartFunction } | null>(null);

export function Filtragem({ children }: { children: React.ReactNode }) {
  const [pendente, iniciar] = useTransition();
  return <Contexto.Provider value={{ pendente, iniciar }}>{children}</Contexto.Provider>;
}

export function useFiltragem() {
  const ctx = useContext(Contexto);
  const [pendenteLocal, iniciarLocal] = useTransition();
  return ctx ?? { pendente: pendenteLocal, iniciar: iniciarLocal };
}

export function AreaDados({ children }: { children: React.ReactNode }) {
  const { pendente } = useFiltragem();
  return (
    <div className="area-dados" data-pendente={pendente} aria-busy={pendente}>
      {children}
    </div>
  );
}
