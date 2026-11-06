// app/api/comercial/metas/route.ts
// Meta mensal do Comercial B2B (3 faixas em R$, empresa toda), editada na tela
// "Metas" do Comercial e GRAVADA NA PLANILHA "Comercial & Marketing — Quintal HUB"
// (aba metas_b2b_mensal), que o script do Pipedrive já lê. Ver lib/metas-faixas-api.ts.

import { criarRotaMetasFaixas } from '@/lib/metas-faixas-api'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export const { GET, POST } = criarRotaMetasFaixas({
  alvo: 'comercial',
  dashboard: 'comercial',
  permissaoEditar: 'comercial-metas',
})
