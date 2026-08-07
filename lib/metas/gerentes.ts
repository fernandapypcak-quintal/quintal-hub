// lib/metas/gerentes.ts
// Agrupamento gerente -> unidades, só para exibição (seções da tabela).
// Não controla acesso — quem entra vê o(s) grupo(s) cujas unidades estão
// dentro do allowedLojas do usuário (admin/diretor com '*' vê os 3).

import type { UnitId } from '@/lib/units'

export interface GerenteConfig {
  id: string
  nome: string
  unidades: UnitId[]
}

export const GERENTES: GerenteConfig[] = [
  { id: 'marco', nome: 'Marco', unidades: ['carinas', 'pavao', 'vila_madalena'] },
  { id: 'andre', nome: 'André', unidades: ['vila_mariana', 'santana', 'tatuape'] },
  { id: 'keylla', nome: 'Keylla', unidades: ['lapa', 'chacara', 'perdizes'] },
]
