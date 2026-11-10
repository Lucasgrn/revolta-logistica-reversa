"use client";
import Link from "next/link";
import { Button } from "antd";
import { PlusOutlined } from "@ant-design/icons";
export const BotaoNova = () => <Link href="/devolucoes/nova"><Button type="primary" icon={<PlusOutlined />}>Registrar devolução</Button></Link>;
