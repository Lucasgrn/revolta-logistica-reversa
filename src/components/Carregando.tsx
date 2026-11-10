"use client";
import { Skeleton } from "antd";

/** Esqueleto exibido na hora do clique enquanto o servidor monta a próxima tela. */
export function Carregando() {
  return (
    <div className="carregando" role="status" aria-label="Carregando">
      <Skeleton.Input active size="large" className="!mb-2 !w-72 max-w-full" />
      <Skeleton active title={false} paragraph={{ rows: 1, width: "60%" }} className="!mb-6" />
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton.Node key={i} active className="!h-24 !w-full [&_.ant-skeleton-node]:!h-24 [&_.ant-skeleton-node]:!w-full" />
        ))}
      </div>
      <Skeleton active paragraph={{ rows: 8 }} />
    </div>
  );
}
