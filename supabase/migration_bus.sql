-- =============================================================
--  Quintal HUB — permissão por área (BU) no dashboard de custos
--  Rodar uma vez no SQL editor do Supabase (projeto do HUB),
--  ANTES de subir o código novo.
-- =============================================================

-- ["*"]            = vê o dashboard de custos completo (como hoje)
-- ["Compras", ...] = gestor de área: vê só a página "Minha área"
--                    dessas áreas (nomes iguais aos da aba BUs)
alter table user_permissions
  add column if not exists bus jsonb not null default '["*"]'::jsonb;

update user_permissions
  set bus = '["*"]'::jsonb
  where bus is null;
