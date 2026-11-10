"use client";
import { Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
export const BotaoImprimir = () => <Button className="print:hidden" icon={<PrinterOutlined />} onClick={() => window.print()}>Imprimir / PDF</Button>;
