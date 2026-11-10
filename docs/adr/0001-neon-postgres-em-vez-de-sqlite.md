# 0001 — Neon Postgres em vez de SQLite

**Status:** aceita · 2026-11-10

## Contexto
O sistema é um trabalho acadêmico que precisa rodar localmente com pouco atrito **e** estar publicado na Vercel. A primeira escolha foi SQLite (arquivo local, zero instalação), mas o sistema de arquivos das funções serverless da Vercel é somente leitura e efêmero: qualquer gravação se perderia entre invocações e deploys.

## Decisão
Usar **PostgreSQL hospedado no Neon** (integração nativa pela aba *Storage* da Vercel), acessado via **Prisma** com o driver adapter `pg`. Em desenvolvimento local, usa-se um Postgres em contêiner (ou uma branch do Neon) — apenas a `DATABASE_URL` muda.

## Alternativas consideradas
- **SQLite** — descartado: incompatível com escrita na Vercel.
- **Turso (libSQL)** — mantém o dialeto SQLite, mas as migrations do Prisma precisam ser aplicadas manualmente pela CLI do Turso.
- **Supabase** — equivalente técnico, porém com recursos (auth, storage) que não serão usados.

## Consequências
- Migrations versionadas (`prisma migrate deploy`) rodam no build da Vercel.
- Desenvolvimento local exige um Postgres (há `compose.yaml` no repositório).
