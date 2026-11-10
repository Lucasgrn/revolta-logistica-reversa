"use client";
import { useActionState } from "react";
import { Alert, Button, Card, Input } from "antd";
import { entrar } from "../acoes/auth";

const CONTAS = [
  ["Operador de Recebimento", "operador@reversa.dev", "operador123"],
  ["Analista de Triagem", "analista@reversa.dev", "analista123"],
  ["Gestor", "gestor@reversa.dev", "gestor123"],
];

export function FormLogin({ de }: { de?: string }) {
  const [estado, acao, pendente] = useActionState(entrar, undefined);
  return (
    <Card className="w-full max-w-md shadow-lg" title="Entrar no ReVolta">
      <form action={acao} className="flex flex-col gap-3">
        <input type="hidden" name="de" value={de ?? "/painel"} />
        <label className="text-sm">E-mail<Input name="email" type="email" autoComplete="username" required size="large" /></label>
        <label className="text-sm">Senha<Input.Password name="senha" autoComplete="current-password" required size="large" /></label>
        {estado?.erro && <Alert type="error" title={estado.erro} showIcon />}
        <Button type="primary" htmlType="submit" size="large" loading={pendente}>Entrar</Button>
      </form>
      <div className="mt-6 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
        <p className="mb-2 font-semibold">Contas de demonstração</p>
        <ul className="space-y-1">
          {CONTAS.map(([papel, email, senha]) => (
            <li key={email}><b>{papel}:</b> {email} / {senha}</li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
