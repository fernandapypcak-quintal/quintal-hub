-- Regras do dashboard Metas Regionais, editáveis pela aba "Regras".
-- Cada linha = uma vigência (vale do mês `vigente_desde` até a próxima).
-- Acesso só pelo servidor (service role), via /api/metas/regras:
-- RLS ligado e sem policies = ninguém lê/escreve direto do navegador.

create table if not exists public.metas_vigencias (
  vigente_desde     text primary key check (vigente_desde ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  nome              text not null,
  indicadores       jsonb not null,
  regionais         jsonb not null,
  unidades_criticas jsonb not null default '[]'::jsonb,
  regra_criticas    jsonb,
  updated_at        timestamptz not null default now(),
  updated_by        text
);

alter table public.metas_vigencias enable row level security;

-- Histórico: uma foto a cada gravação/exclusão (quem, quando, o quê).
create table if not exists public.metas_vigencias_hist (
  id          bigint generated always as identity primary key,
  vigente_desde text not null,
  acao        text not null check (acao in ('salvar', 'excluir')),
  dados       jsonb,
  feito_por   text,
  feito_em    timestamptz not null default now()
);

alter table public.metas_vigencias_hist enable row level security;
