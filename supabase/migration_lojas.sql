-- =============================================================
--  Quintal HUB — permissão de acesso por unidade
--  Rodar uma vez no SQL editor do Supabase (projeto do HUB)
-- =============================================================

-- Adiciona a coluna de unidades permitidas por usuário.
-- Guardamos os ids canônicos definidos em lib/units.ts
-- (ex: 'carinas', 'santo_andre', 'holding') ou ['*'] para "todas".
alter table user_permissions
  add column if not exists lojas jsonb not null default '["*"]'::jsonb;

-- Usuários já cadastrados continuam com acesso a todas as unidades
-- (comportamento igual ao de hoje) até você editar caso a caso pelo
-- painel /hub/admin.
update user_permissions
  set lojas = '["*"]'::jsonb
  where lojas is null;

-- ids válidos, pra referência rápida ao editar direto no SQL editor:
-- carinas, santana, tatuape, lapa, perdizes, vila_mariana,
-- vila_madalena, pavao, chacara, santo_andre, holding
