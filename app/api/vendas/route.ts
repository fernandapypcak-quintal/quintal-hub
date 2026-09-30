import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { UNITS, unitIdFromString } from '@/lib/units'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const allowedParams = ['inicio', 'fim', 'dia', 'canais', 'categorias', 'skus', 'busca', 'adicoes']
const validDate = /^\d{4}-\d{2}-\d{2}$/
const gasNames: Record<string, string> = { chacara: 'Chácara Sto Antônio', santo_andre: 'Santo André' }
const gasName = (id: string, label: string) => gasNames[id] || label

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'vendas')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const endpoint = process.env.ZIG_VENDAS_GAS_URL
  const key = process.env.ZIG_VENDAS_API_KEY
  if (!endpoint || !key) return NextResponse.json({ erro: 'Integração de vendas ainda não configurada' }, { status: 503 })

  const input = req.nextUrl.searchParams
  const acao = input.get('acao') || 'resumo'
  if (!['meta', 'resumo', 'detalhe'].includes(acao)) return NextResponse.json({ erro: 'Ação inválida' }, { status: 400 })
  if (acao === 'detalhe' && !validDate.test(input.get('dia') || '')) return NextResponse.json({ erro: 'Dia inválido' }, { status: 400 })
  if (acao === 'resumo' && (!validDate.test(input.get('inicio') || '') || !validDate.test(input.get('fim') || ''))) {
    return NextResponse.json({ erro: 'Período inválido' }, { status: 400 })
  }

  // A lista de lojas enviada pelo navegador jamais pode ampliar a permissão.
  const allStores = UNITS.filter(u => u.id !== 'holding').map(u => gasName(u.id, u.label))
  const authorized = access.lojas === '*' ? allStores : UNITS.filter(u => access.lojas.includes(u.id) && u.id !== 'holding').map(u => gasName(u.id, u.label))
  const wanted = (input.get('lojas') || '').split('|').filter(Boolean)
  const selected = wanted.length ? authorized.filter(loja => wanted.some(raw => unitIdFromString(raw) === unitIdFromString(loja))) : authorized
  if (!selected.length) return NextResponse.json({ erro: 'Nenhuma loja autorizada para esta consulta' }, { status: 403 })

  const params = new URLSearchParams({ key, acao })
  if (acao !== 'meta') {
    params.set('lojas', selected.join('|'))
    for (const field of allowedParams) {
      const value = input.get(field)
      if (value) params.set(field, value.slice(0, 500))
    }
  }

  try {
    const response = await fetch(`${endpoint}?${params}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
    if (!response.ok) throw new Error(`Servidor de dados respondeu ${response.status}`)
    const result = await response.json()
    if (!result.ok) return NextResponse.json({ erro: result.erro || 'Falha ao consultar vendas' }, { status: result.status === 400 ? 400 : 502 })
    if (acao === 'meta') result.lojas = authorized
    return NextResponse.json(result, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    return NextResponse.json({ erro: error instanceof Error ? error.message : 'Falha de conexão' }, { status: 502 })
  }
}
