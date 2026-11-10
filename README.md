# ReVolta: Logística Reversa no Varejo de Energia

Sistema web de **gestão de devoluções, reaproveitamento de materiais, custos reversos e indicadores ambientais** para um e-commerce/varejo do setor de energia (painéis solares, inversores, baterias, medidores, iluminação LED, cabos e conectores). Ele aplica conceitos de **logística reversa** e **sustentabilidade** e está alinhado à Política Nacional de Resíduos Sólidos (PNRS, Lei 12.305/2010).

> Trabalho acadêmico. Stack: **Next.js 16** (App Router, Server Actions), **Ant Design 6**, **Tailwind CSS 4**, **Prisma 7** e **PostgreSQL (Neon)**. Publicável na **Vercel**.

---

## Sumário

1. [Propósito do software](#1-propósito-do-software)
2. [O problema logístico abordado](#2-o-problema-logístico-abordado)
3. [Principais funções](#3-principais-funções)
4. [Funcionamento detalhado](#4-funcionamento-detalhado)
   - [4.1 Dados de entrada](#41-dados-de-entrada)
   - [4.2 Processamento das informações](#42-processamento-das-informações)
   - [4.3 Resultados gerados](#43-resultados-gerados)
5. [Perfis de acesso e credenciais](#5-perfis-de-acesso-e-credenciais)
6. [Como executar localmente](#6-como-executar-localmente)
7. [Deploy na Vercel com Neon](#7-deploy-na-vercel-com-neon)
8. [Arquitetura e organização do código](#8-arquitetura-e-organização-do-código)
9. [Limitações e simplificações](#9-limitações-e-simplificações)
10. [Referências](#10-referências)

---

## 1. Propósito do software

O ReVolta organiza o **fluxo reverso** dos produtos, isto é, o caminho que eles fazem do cliente de volta à empresa, e transforma esse fluxo em informação gerencial. O sistema:

- **registra e rastreia** cada devolução, da solicitação ao encerramento;
- **apoia a decisão de destinação** de cada unidade devolvida, sempre buscando o maior reaproveitamento possível;
- **apura o custo** de operar o fluxo reverso e o **valor recuperado** com ele;
- **mede o impacto ambiental**: massa desviada de aterro, CO₂e evitado e resíduos perigosos tratados;
- **evidencia a conformidade** com a obrigação legal de logística reversa de baterias, lâmpadas e eletroeletrônicos.

O objetivo é que a logística reversa deixe de ser apenas um custo operacional e passe a ser **gerida como fonte de valor econômico e ambiental**.

## 2. O problema logístico abordado

No varejo de energia, produtos voltam por dois motivos muito diferentes:

| Canal | O que é | Exemplos |
|---|---|---|
| **Pós-venda** | Retorno logo após a compra | Arrependimento (CDC art. 49, 7 dias), defeito, avaria no transporte, item errado, garantia |
| **Pós-consumo** | Produto em fim de vida útil entregue para destinação adequada | Bateria esgotada, painel degradado, lâmpada queimada, inversor obsoleto |

Esses produtos têm características que tornam o fluxo reverso **caro, arriscado e regulado**:

- **Alto valor unitário** (uma bateria LiFePO4 custa mais de R$ 10 mil). Destinar mal uma unidade recuperável é desperdiçar dinheiro.
- **Massa elevada** (painéis de 20–30 kg, baterias de 30–100 kg). O frete reverso e a armazenagem pesam no custo.
- **Materiais perigosos** (lítio, chumbo, eletrólito ácido, placas eletrônicas), que exigem destinação ambientalmente adequada.
- **Obrigação legal**: a PNRS (art. 33) obriga comerciantes de pilhas e baterias, lâmpadas e eletroeletrônicos a estruturar sistemas de logística reversa. O Decreto 10.240/2020 regulamenta o caso dos eletroeletrônicos.

Sem um sistema, as empresas costumam ter **devoluções sem rastreabilidade**, **decisões de destinação ad hoc** (muitas vezes direto para descarte), **custos reversos invisíveis**, espalhados por várias contas, e **nenhuma evidência** do desempenho ambiental.

O ReVolta trata esse problema aplicando a **hierarquia de resíduos da PNRS (art. 9º)** a cada item devolvido: primeiro reutilizar, depois reciclar e só por último fazer a disposição final. Em cada decisão, ele mostra o custo, o valor recuperado e o impacto ambiental.

## 3. Principais funções

| Função | Descrição |
|---|---|
| **Portal do Cliente** (público) | O cliente abre uma devolução de pós-venda (com número do pedido e e-mail) ou de pós-consumo (com dados de contato) e recebe um **protocolo** para acompanhar o andamento. |
| **Registro interno** | O Operador registra devoluções recebidas no balcão, por telefone ou num ponto de entrega voluntária. |
| **Ciclo de vida com rastreabilidade** | Solicitada → Em trânsito → Recebida → Em triagem → Destinada → Encerrada (ou Recusada). Cada transição fica no histórico com responsável, data e observação. |
| **Alertas de política** | Avisa, sem bloquear, quando o arrependimento é pedido fora do prazo legal ou quando a garantia do produto já venceu. |
| **Triagem assistida** | O Analista classifica a **condição** (A–D) de cada item. O sistema **sugere a destinação** e mostra, em tempo real, os custos, o valor recuperado e o impacto ambiental da escolha. |
| **Custos reversos** | Custos **automáticos**, calculados por parâmetros (triagem, armazenagem por dia, reparo, reembalagem, transporte e taxa de descarte por kg), mais lançamentos **manuais** (frete reverso e outros). |
| **Valor recuperado** | Revenda, crédito do fornecedor ou venda de sucata, estimado por parâmetros e substituível pelo valor real. |
| **Painel de indicadores** | KPIs ambientais, operacionais e financeiros, com gráficos mensais e filtros por período, canal, categoria e motivo. Cada gráfico tem uma visão em tabela. |
| **Relatório de conformidade PNRS** | Massa recebida, destinada, desviada de aterro e perigosa, mais o CO₂e evitado, por categoria e canal. Pode ser impresso ou salvo em PDF. |
| **Cadastros** (Gestor) | Produtos com **composição de materiais**, materiais com **fatores ambientais** e **parâmetros de custo**. |

A distinção visual entre os canais é a mesma em todo o sistema: **azul com ícone de sacola** para pós-venda e **verde com ícone de ciclo** para pós-consumo, inclusive na faixa lateral das linhas das tabelas.

## 4. Funcionamento detalhado

```
 ENTRADAS                         PROCESSAMENTO                                SAÍDAS
 ─────────                        ─────────────                                ──────
 Catálogo + composição  ─┐
 Materiais + fatores    ─┤   ┌─ Alertas de política (prazo / garantia)
 Parâmetros de custo    ─┤   ├─ Máquina de estados + permissões por papel
 Vendas (referência)    ─┼──▶├─ Sugestão de destinação (condição → hierarquia) ─▶  Devolução rastreada
 Solicitação (portal /  ─┤   ├─ Custos reversos automáticos                     ─▶  Painel de indicadores
   registro interno)     │   ├─ Valor recuperado estimado                       ─▶  Relatório PNRS
 Eventos do fluxo       ─┤   ├─ Impacto ambiental por material                  ─▶  Protocolo para o cliente
 Inspeção (condição)    ─┘   └─ Consolidação de indicadores
```

### 4.1 Dados de entrada

**Dados mestres** (cadastrados pelo Gestor; o seed já traz um conjunto realista):

| Entrada | Campos | Uso |
|---|---|---|
| **Produto** | SKU, nome, categoria, preço de venda, custo de aquisição, garantia (meses) | Valor de revenda, crédito do fornecedor, validação de garantia |
| **Composição** | kg de cada material por unidade | Massa, sucata, CO₂e e resíduos perigosos |
| **Material** | fator de CO₂e evitado (kgCO₂e/kg), preço de sucata (R$/kg), reciclável?, perigoso? | Indicadores ambientais e valor de reciclagem |
| **Parâmetros** | prazo de arrependimento; custos de triagem, armazenagem, embalagem, reparo, transporte e descarte; percentuais de recuperação (incluindo a segunda vida do pós-consumo) | Cálculos automáticos |
| **Venda** (referência, importada do e-commerce) | número, cliente, data de entrega, itens | Prazos, garantia e taxa de devolução |

**Dados operacionais** (registrados durante o fluxo):

| Momento | Quem informa | Dados |
|---|---|---|
| Solicitação | Cliente (portal) ou Operador | canal, motivo, venda (pós-venda), produtos e quantidades, relato |
| Coleta/envio | Operador | transportadora, código de rastreio, **valor do frete reverso** |
| Recebimento | Operador | conferência física, observações (a data inicia a contagem de armazenagem) |
| Triagem | Analista | por item: **condição A–D**, número de série, laudo, **destinação** e valor real recuperado (opcional) |
| Financeiro | Operador / Analista / Gestor | custos manuais adicionais; confirmação de valores reais |
| Encerramento | Gestor | consolidação (bloqueia novos lançamentos) |

### 4.2 Processamento das informações

Todas as regras ficam em funções puras em `src/domain/`, cobertas por testes. Elas rodam no servidor ao gravar e no navegador para a pré-visualização da triagem, o que garante que a prévia mostrada é o mesmo valor que será salvo.

#### a) Alertas de política (`politica.ts`)

Valem só para o pós-venda e são comparados com a data de entrega da venda:

- **Arrependimento** solicitado depois de `prazoArrependimentoDias` (padrão de 7, CDC art. 49) gera um alerta.
- **Defeito/garantia** depois de `entrega + garantiaMeses` gera um alerta de garantia vencida.

Os alertas **não bloqueiam** a abertura. Eles aparecem para o Analista, que decide se recusa a devolução.

Já a **quantidade** é uma regra rígida: a soma devolvida de um produto, contando as solicitações anteriores da mesma venda (exceto as recusadas), não pode passar do que foi vendido.

#### b) Ciclo de vida e permissões (`fluxo.ts`)

Uma máquina de estados aceita apenas transições válidas (por exemplo, não é possível destinar antes da triagem). Cada transição grava um registro no histórico. As ações são autorizadas no servidor por papel (veja a [seção 5](#5-perfis-de-acesso-e-credenciais)). Quando **todos os itens** de uma devolução estão destinados, ela passa automaticamente a **Destinada**.

#### c) Sugestão de destinação (`destinacao.ts → sugerirDestinacao`)

| Condição | Regra | Destinação sugerida |
|---|---|---|
| **A**: como novo | sempre | Retorno ao estoque |
| **B**: uso aparente, funcional | sempre | Recondicionamento |
| **C**: defeituoso reparável | dentro da garantia | Devolução ao fornecedor |
| | fora da garantia e preço ≥ R$ 100 | Recondicionamento |
| | fora da garantia e preço < R$ 100 | Desmontagem para peças |
| **D**: irrecuperável | massa reciclável ≥ 50% | Reciclagem |
| | massa reciclável < 50% | Descarte adequado |

No **pós-consumo** a regra muda, porque o produto já cumpriu sua vida útil com o cliente:

| Condição (pós-consumo) | Destinação sugerida | Racional |
|---|---|---|
| **A** ou **B**: funcional | Recondicionamento para **segunda vida** | Nunca volta ao estoque como produto novo; é revendido como usado |
| **C**: defeituoso | Desmontagem para peças | Em fim de vida, o reparo não se justifica; aproveitam-se os componentes |
| **D**: irrecuperável | Reciclagem ou descarte | Mesma regra da massa reciclável usada no pós-venda |

O Analista pode divergir da sugestão. A divergência fica registrada, porque o sistema guarda a destinação sugerida junto da escolhida.

#### d) Valor recuperado estimado (`valorRecuperadoEstimado`)

| Destinação | Tipo | Fórmula (parâmetros padrão) |
|---|---|---|
| Retorno ao estoque | Revenda | preço × 100% |
| Recondicionamento (pós-venda) | Revenda | preço × 60% |
| Recondicionamento (pós-consumo, segunda vida) | Revenda | preço de novo × 25% |
| Devolução ao fornecedor | Crédito do fornecedor | custo de aquisição × 100% |
| Desmontagem para peças | Revenda | preço × 15% |
| Reciclagem | Sucata | Σ (massa de cada material **reciclável** × preço de sucata) |
| Descarte adequado | (nenhum) | 0 |

O usuário pode substituir a estimativa pelo valor real obtido; nesse caso o valor deixa de ser marcado como estimado.

#### e) Custos reversos automáticos por item (`custosAutomaticos`)

| Custo | Quando | Fórmula (parâmetros padrão) |
|---|---|---|
| Triagem e inspeção | sempre | R$ 18,00 por item |
| Armazenagem | sempre | max(1, dias entre recebimento e destinação) × R$ 1,50 |
| Reparo | recondicionamento | 15% do preço de venda |
| Reembalagem | estoque ou recondicionamento | R$ 12,00 |
| Transporte ao destino | fornecedor ou peças | massa × R$ 0,45/kg |
| Transporte + rejeito | reciclagem | massa × R$ 0,45 + massa **não reciclável** × R$ 2,80 |
| Transporte + disposição | descarte | massa × (R$ 0,45 + R$ 2,80) |

O **frete reverso** é lançado na coleta. Outros custos podem ser lançados manualmente, e cada papel só lança os tipos sob sua responsabilidade. Ao redestinar um item, os custos automáticos dele são recalculados, então a operação é idempotente.

#### f) Impacto ambiental por item (`impactoAmbiental`)

Para cada material da composição:

- **Reuso** (estoque, recondicionamento, fornecedor, peças): toda a massa é desviada de aterro.
- **Reciclagem**: só a massa dos materiais **recicláveis** é desviada; o resto vira rejeito.
- **Descarte**: nada é desviado.

```
massa desviada  = Σ massa dos materiais aproveitados
CO₂e evitado    = Σ (massa aproveitada do material × fator de CO₂e do material)
massa perigosa  = Σ massa dos materiais classificados como perigosos
```

#### g) Consolidação dos indicadores (`indicadores.ts`)

As devoluções do período (pela **data de solicitação**) são agregadas conforme os filtros. Com o filtro de categoria, os custos que pertencem à devolução como um todo são rateados pela fração de itens daquela categoria.

| Indicador | Fórmula |
|---|---|
| Taxa de reaproveitamento | massa desviada ÷ massa destinada |
| Resultado líquido | valor recuperado − custos reversos |
| Taxa de recuperação de valor | valor recuperado **no pós-venda** ÷ valor de venda dos itens devolvidos no pós-venda (no pós-consumo não houve venda de referência) |
| Custo médio por item | custo reverso total ÷ itens devolvidos |
| Tempo médio de ciclo | média (encerramento − solicitação), em dias, das encerradas |
| Taxa de recusa | recusadas ÷ devoluções |
| Taxa de devolução por produto | unidades devolvidas **no pós-venda** ÷ unidades vendidas no período |

### 4.3 Resultados gerados

1. **Devolução rastreada**: linha do tempo com etapas, responsáveis e datas, itens com condição e destinação, custos detalhados (automáticos e manuais), valores recuperados (estimados ou reais), resultado líquido e impacto ambiental da devolução.
2. **Protocolo e acompanhamento público**: o cliente consulta o andamento e a destinação dada aos seus itens.
3. **Painel de indicadores**:
   - *Ambientais*: massa desviada de aterro, taxa de reaproveitamento, CO₂e evitado, resíduos perigosos tratados, massa enviada a aterro.
   - *Operacionais e financeiros*: volume por canal, custo reverso total e por item, valor recuperado, resultado líquido, taxa de recuperação de valor, tempo médio de ciclo, taxa de recusa.
   - *Gráficos*: devoluções por mês e canal, massa por destinação (na ordem da hierarquia), taxa de reaproveitamento mensal, CO₂e evitado mensal, custo × recuperado mensal, composição do custo reverso, motivos e ranking de taxa de devolução por produto.
4. **Relatório de conformidade PNRS**: por categoria (com o enquadramento legal) e canal, mostra unidades, massa recebida, destinada, desviada de aterro e perigosa, CO₂e evitado e a distribuição da massa por destinação.

**Exemplo numérico.** Uma bateria LiFePO4 de 5 kWh (50 kg) chega em pós-consumo, condição D, e vai para reciclagem:

- Sucata: 34 kg de células × R$ 8 + 9,5 kg de aço × R$ 0,80 + … = **R$ 352,90** recuperados.
- Custos: frete de R$ 85,00 + triagem de R$ 18,00 + 1 dia de armazenagem (R$ 1,50) + transporte de 50 kg × R$ 0,45 (R$ 22,50) = **R$ 127,00**.
- Resultado líquido: **R$ 225,90**. Massa desviada: **50 kg** (100% reciclável). CO₂e evitado: **190 kgCO₂e**. Perigosos tratados: **34,9 kg**.

## 5. Perfis de acesso e credenciais

Contas criadas pelo seed, para demonstração:

| Papel | E-mail | Senha | Pode |
|---|---|---|---|
| **Operador de Recebimento** | `operador@reversa.dev` | `operador123` | Registrar devoluções, coleta e recebimento; lançar frete e embalagem; ver o painel |
| **Analista de Triagem** | `analista@reversa.dev` | `analista123` | Iniciar triagem, inspecionar e destinar itens, recusar; lançar custos de triagem, reparo e destinação; confirmar valores reais; ver o painel |
| **Gestor** | `gestor@reversa.dev` | `gestor123` | Tudo acima, mais **encerrar** devoluções e gerenciar **cadastros** e **parâmetros** |

O **Portal do Cliente** (`/portal`) é público. Para testar o pós-venda, pegue um número de pedido e o e-mail do cliente em **Vendas (referência)**, logado como qualquer papel.

## 6. Como executar localmente

Pré-requisitos: **Node.js ≥ 20.19** e **Docker ou Podman** (ou uma URL do Neon).

```bash
# 1. Dependências
npm install

# 2. Banco de dados local (Postgres na porta 5433)
docker compose up -d          # ou: podman compose up -d

# 3. Variáveis de ambiente
cp .env.example .env          # ajuste DATABASE_URL e SESSION_SECRET se necessário

# 4. Esquema + dados de demonstração
npx prisma migrate deploy
npm run db:seed

# 5. Servidor de desenvolvimento
npm run dev                   # http://localhost:3000
```

Outros comandos:

| Comando | O que faz |
|---|---|
| `npm test` | Testes unitários das regras de domínio (Vitest) |
| `npm run db:seed` | Recria todos os dados de demonstração (seed determinístico) |
| `npm run db:reset` | Apaga o banco, reaplica as migrations e roda o seed |
| `npm run build` | Gera o client Prisma, aplica migrations, popula o banco se estiver vazio e faz o build do Next.js |

## 7. Deploy na Vercel com Neon

1. Envie o repositório ao GitHub e **importe o projeto na Vercel** (o framework Next.js é detectado sozinho).
2. Na Vercel, abra **Storage → Create Database → Neon (Serverless Postgres)** e conecte o banco ao projeto. A integração cria `DATABASE_URL` (com pooler) e `DATABASE_URL_UNPOOLED` (conexão direta, usada pelas migrations).
3. Em **Settings → Environment Variables**, adicione `SESSION_SECRET` com um valor aleatório de 32 caracteres ou mais (por exemplo, `openssl rand -base64 32`).
4. Faça o deploy. O script `build` executa:
   ```
   prisma generate → prisma migrate deploy → seed (apenas se o banco estiver vazio) → next build
   ```
   No primeiro deploy, o banco já fica populado com os dados de demonstração.

Para restaurar os dados de demonstração em produção, rode `npm run db:seed` localmente com a `DATABASE_URL` do Neon.

> Por que Neon e não SQLite? Veja `docs/adr/0001-neon-postgres-em-vez-de-sqlite.md`: o sistema de arquivos das funções da Vercel é somente leitura e efêmero.

## 8. Arquitetura e organização do código

```
prisma/
  schema.prisma          Modelo de dados (devoluções, itens, custos, recuperações, histórico, catálogo…)
  migrations/            Migrations versionadas
  seed.ts                Dados determinísticos: 25 produtos, 14 materiais, 60 clientes, 420 vendas, 180 devoluções
src/
  domain/                Regras de negócio puras (sem banco) + testes
    destinacao.ts          sugestão, valor recuperado, custos automáticos, impacto ambiental
    politica.ts            alertas de prazo e garantia
    fluxo.ts               máquina de estados e permissões por papel
    indicadores.ts         consolidação dos KPIs e séries mensais
    rotulos.ts             rótulos pt-BR e cores
  servicos/
    devolucoes.ts          aplica as regras e persiste (transações); usado pelas actions e pelo seed
    consultas.ts           leituras: listagens, detalhe, indicadores, relatório PNRS
  app/
    acoes/                 Server Actions (autenticação, validação com Zod, autorização por papel)
    (sistema)/             Área autenticada: painel, devoluções, relatório PNRS, vendas, cadastros
    portal/                Portal do Cliente (público)
    login/
  components/            Componentes de interface (Ant Design + Tailwind; gráficos com Recharts)
  lib/                   Prisma client, sessão (JWT em cookie httpOnly), formatação pt-BR
  proxy.ts               Redireciona ao login nas rotas internas
GLOSSARY.md              Linguagem do domínio (termos canônicos)
docs/adr/                Registros de decisões de arquitetura
```

Decisões relevantes:

- **Domínio isolado**: as fórmulas não dependem de banco nem de framework e são compartilhadas entre servidor, navegador e seed.
- **Autenticação simples**: credenciais com hash bcrypt e sessão JWT (HS256) em cookie httpOnly. A autorização por papel é verificada em toda Server Action e página.
- **Tailwind + Ant Design**: os estilos do antd ficam numa *cascade layer* própria (`@layer antd`), entre o reset do Tailwind e os utilitários, para que as classes Tailwind ajustem componentes sem `!important` desnecessário.
- **Gráficos**: paleta categórica validada para daltonismo, cores fixas por entidade (canal e destinação), um único eixo Y por gráfico e alternância entre gráfico e tabela.

## 9. Limitações e simplificações

- **Fatores de CO₂e e preços de sucata** são **valores ilustrativos**, na ordem de grandeza de bases como EPA WARM e estudos de ACV, e servem a fins acadêmicos. São editáveis em *Cadastros › Materiais*.
- O CO₂e evitado aplica o mesmo fator por material tanto ao reuso quanto à reciclagem. É uma estimativa conservadora para o reuso, que normalmente evita mais emissões.
- O **reembolso ao cliente** não entra no custo reverso: ele desfaz a venda e não é custo de operar o fluxo reverso.
- **Vendas** são somente leitura, simulando uma integração com o e-commerce.
- Valores monetários usam ponto flutuante com arredondamento em 2 casas. Um sistema em produção usaria tipo decimal.
- A autenticação é deliberadamente simples (sem cadastro de usuários nem recuperação de senha).

## 10. Referências

- BRASIL. **Lei nº 12.305, de 2 de agosto de 2010**. Institui a Política Nacional de Resíduos Sólidos (arts. 9º e 33).
- BRASIL. **Decreto nº 10.240, de 12 de fevereiro de 2020**. Sistema de logística reversa de produtos eletroeletrônicos de uso doméstico.
- BRASIL. **Lei nº 8.078, de 11 de setembro de 1990** (Código de Defesa do Consumidor), art. 49: direito de arrependimento.
- CONAMA. **Resolução nº 401, de 4 de novembro de 2008**: pilhas e baterias.
- LEITE, P. R. **Logística Reversa: meio ambiente e competitividade**. São Paulo: Pearson.
- U.S. EPA. **Waste Reduction Model (WARM)**: fatores de emissão por material.
