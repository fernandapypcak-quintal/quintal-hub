// app/api/reservas/metas/route.ts
// Meta mensal do time de reservas (3 faixas + desafio, em nº de reservas),
// editada na aba "Editar metas" de Reservas e GRAVADA NA PLANILHA
// "Comercial e Marketing - Reservas B2C" (aba METAS), que o Reservas.gs já lê.
// Ver lib/metas-faixas-api.ts.

import { criarRotaMetasFaixas } from '@/lib/metas-faixas-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const { GET, POST } = criarRotaMetasFaixas({
  alvo: 'reservas',
  dashboard: 'reservas',
  permissaoEditar: 'reservas-metas-editar',
  inteiro: true,
  comDesafio: true,
})
