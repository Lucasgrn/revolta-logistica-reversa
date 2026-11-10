-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('OPERADOR', 'ANALISTA', 'GESTOR');

-- CreateEnum
CREATE TYPE "Categoria" AS ENUM ('PAINEL_SOLAR', 'INVERSOR', 'BATERIA', 'MEDIDOR', 'ILUMINACAO_LED', 'CABOS_CONECTORES');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('POS_VENDA', 'POS_CONSUMO');

-- CreateEnum
CREATE TYPE "Motivo" AS ENUM ('ARREPENDIMENTO', 'DEFEITO', 'AVARIA_TRANSPORTE', 'ITEM_ERRADO', 'GARANTIA', 'FIM_DE_VIDA', 'TROCA_TECNOLOGICA');

-- CreateEnum
CREATE TYPE "StatusDevolucao" AS ENUM ('SOLICITADA', 'EM_TRANSITO', 'RECEBIDA', 'EM_TRIAGEM', 'DESTINADA', 'ENCERRADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "Origem" AS ENUM ('PORTAL', 'INTERNO');

-- CreateEnum
CREATE TYPE "Condicao" AS ENUM ('A', 'B', 'C', 'D');

-- CreateEnum
CREATE TYPE "Destinacao" AS ENUM ('RETORNO_ESTOQUE', 'RECONDICIONAMENTO', 'DEVOLUCAO_FORNECEDOR', 'DESMONTAGEM_PECAS', 'RECICLAGEM', 'DESCARTE');

-- CreateEnum
CREATE TYPE "TipoCusto" AS ENUM ('FRETE_REVERSO', 'TRIAGEM', 'REPARO', 'ARMAZENAGEM', 'TRANSPORTE_DESCARTE', 'EMBALAGEM');

-- CreateEnum
CREATE TYPE "TipoRecuperacao" AS ENUM ('REVENDA', 'CREDITO_FORNECEDOR', 'SUCATA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "uf" TEXT NOT NULL,

    CONSTRAINT "Cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Material" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "fatorCo2" DOUBLE PRECISION NOT NULL,
    "precoSucata" DOUBLE PRECISION NOT NULL,
    "reciclavel" BOOLEAN NOT NULL,
    "perigoso" BOOLEAN NOT NULL,

    CONSTRAINT "Material_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" SERIAL NOT NULL,
    "sku" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "Categoria" NOT NULL,
    "preco" DOUBLE PRECISION NOT NULL,
    "custo" DOUBLE PRECISION NOT NULL,
    "garantiaMeses" INTEGER NOT NULL,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComposicaoMaterial" (
    "produtoId" INTEGER NOT NULL,
    "materialId" INTEGER NOT NULL,
    "massaKg" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ComposicaoMaterial_pkey" PRIMARY KEY ("produtoId","materialId")
);

-- CreateTable
CREATE TABLE "Venda" (
    "id" SERIAL NOT NULL,
    "numero" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "dataEntrega" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Venda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemVenda" (
    "id" SERIAL NOT NULL,
    "vendaId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "quantidade" INTEGER NOT NULL,
    "precoUnitario" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ItemVenda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Devolucao" (
    "id" SERIAL NOT NULL,
    "protocolo" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "motivo" "Motivo" NOT NULL,
    "status" "StatusDevolucao" NOT NULL DEFAULT 'SOLICITADA',
    "origem" "Origem" NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "alertas" TEXT[],
    "clienteId" INTEGER NOT NULL,
    "vendaId" INTEGER,
    "transportadora" TEXT,
    "rastreio" TEXT,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recebidaEm" TIMESTAMP(3),
    "encerradaEm" TIMESTAMP(3),

    CONSTRAINT "Devolucao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemDevolvido" (
    "id" SERIAL NOT NULL,
    "devolucaoId" INTEGER NOT NULL,
    "produtoId" INTEGER NOT NULL,
    "numeroSerie" TEXT,
    "condicao" "Condicao",
    "observacao" TEXT,
    "destinacaoSugerida" "Destinacao",
    "destinacao" "Destinacao",
    "inspecionadoPor" TEXT,
    "destinadoEm" TIMESTAMP(3),

    CONSTRAINT "ItemDevolvido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustoReverso" (
    "id" SERIAL NOT NULL,
    "devolucaoId" INTEGER NOT NULL,
    "itemId" INTEGER,
    "tipo" "TipoCusto" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "descricao" TEXT NOT NULL DEFAULT '',
    "automatico" BOOLEAN NOT NULL DEFAULT false,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustoReverso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValorRecuperado" (
    "id" SERIAL NOT NULL,
    "devolucaoId" INTEGER NOT NULL,
    "itemId" INTEGER,
    "tipo" "TipoRecuperacao" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "estimado" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValorRecuperado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HistoricoStatus" (
    "id" SERIAL NOT NULL,
    "devolucaoId" INTEGER NOT NULL,
    "de" "StatusDevolucao",
    "para" "StatusDevolucao" NOT NULL,
    "usuario" TEXT NOT NULL,
    "observacao" TEXT NOT NULL DEFAULT '',
    "em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistoricoStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Parametros" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "prazoArrependimentoDias" INTEGER NOT NULL DEFAULT 7,
    "custoTriagemItem" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "custoArmazenagemDia" DOUBLE PRECISION NOT NULL DEFAULT 1.5,
    "custoEmbalagemItem" DOUBLE PRECISION NOT NULL DEFAULT 12,
    "custoReparoPercentual" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "custoDescarteKg" DOUBLE PRECISION NOT NULL DEFAULT 2.8,
    "custoTransporteKg" DOUBLE PRECISION NOT NULL DEFAULT 0.45,
    "pctRevendaEstoque" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "pctRevendaRecondicionado" DOUBLE PRECISION NOT NULL DEFAULT 0.6,
    "pctPecas" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "pctCreditoFornecedor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "Parametros_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_email_key" ON "Cliente"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Material_nome_key" ON "Material"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_sku_key" ON "Produto"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Venda_numero_key" ON "Venda"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Devolucao_protocolo_key" ON "Devolucao"("protocolo");

-- CreateIndex
CREATE INDEX "Devolucao_criadaEm_idx" ON "Devolucao"("criadaEm");

-- CreateIndex
CREATE INDEX "Devolucao_status_idx" ON "Devolucao"("status");

-- AddForeignKey
ALTER TABLE "ComposicaoMaterial" ADD CONSTRAINT "ComposicaoMaterial_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComposicaoMaterial" ADD CONSTRAINT "ComposicaoMaterial_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemVenda" ADD CONSTRAINT "ItemVenda_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucao" ADD CONSTRAINT "Devolucao_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Devolucao" ADD CONSTRAINT "Devolucao_vendaId_fkey" FOREIGN KEY ("vendaId") REFERENCES "Venda"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDevolvido" ADD CONSTRAINT "ItemDevolvido_devolucaoId_fkey" FOREIGN KEY ("devolucaoId") REFERENCES "Devolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemDevolvido" ADD CONSTRAINT "ItemDevolvido_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustoReverso" ADD CONSTRAINT "CustoReverso_devolucaoId_fkey" FOREIGN KEY ("devolucaoId") REFERENCES "Devolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustoReverso" ADD CONSTRAINT "CustoReverso_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemDevolvido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorRecuperado" ADD CONSTRAINT "ValorRecuperado_devolucaoId_fkey" FOREIGN KEY ("devolucaoId") REFERENCES "Devolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValorRecuperado" ADD CONSTRAINT "ValorRecuperado_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "ItemDevolvido"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HistoricoStatus" ADD CONSTRAINT "HistoricoStatus_devolucaoId_fkey" FOREIGN KEY ("devolucaoId") REFERENCES "Devolucao"("id") ON DELETE CASCADE ON UPDATE CASCADE;
