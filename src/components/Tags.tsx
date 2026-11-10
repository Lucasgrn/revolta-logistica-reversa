"use client";
import { Tag, Tooltip } from "antd";
import { ShoppingOutlined, SyncOutlined } from "@ant-design/icons";
import type { Canal, Condicao, Destinacao, StatusDevolucao } from "@/generated/prisma/enums";
import { CANAL, CONDICAO, DESTINACAO, STATUS } from "@/domain/rotulos";

export function TagCanal({ canal }: { canal: Canal }) {
  const c = CANAL[canal];
  return (
    <Tooltip title={c.descricao}>
      <Tag color={c.cor} icon={canal === "POS_VENDA" ? <ShoppingOutlined /> : <SyncOutlined />}>{c.rotulo}</Tag>
    </Tooltip>
  );
}
export const TagStatus = ({ status }: { status: StatusDevolucao }) => <Tag color={STATUS[status].cor}>{STATUS[status].rotulo}</Tag>;
export const TagCondicao = ({ condicao }: { condicao: Condicao }) => (
  <Tooltip title={CONDICAO[condicao].descricao}><Tag color={CONDICAO[condicao].cor}>{CONDICAO[condicao].rotulo}</Tag></Tooltip>
);
export const TagDestinacao = ({ destinacao }: { destinacao: Destinacao }) => <Tag color={DESTINACAO[destinacao].cor}>{DESTINACAO[destinacao].rotulo}</Tag>;
