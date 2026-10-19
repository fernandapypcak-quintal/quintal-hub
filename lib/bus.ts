// lib/bus.ts
// =============================================================
//  QUINTAL HUB — áreas (BUs) do dashboard de custos
//  Os nomes precisam ser iguais aos da aba "BUs" da planilha de custos.
//  Usado na permissão por área (user_permissions.bus).
// =============================================================

export const AREAS_CUSTOS = [
  'Compras',
  'Pessoal',
  'Administrativo',
  'Operações',
  'Eventos',
  'Marketing',
  'Financeiro',
  'Jurídico',
  'Inventário',
  'Kids',
] as const

export type AreaCustos = typeof AREAS_CUSTOS[number]
