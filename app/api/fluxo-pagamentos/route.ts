// app/api/fluxo-pagamentos/route.ts
// Fluxo de Pagamentos — só os PAGAMENTOS OPERACIONAIS do Painel de Caixa & Forecast, por dia.
// - mesma fonte do painel: snapshot lib/caixa-forecast/dados.json + Apps Script CaixaForecast.gs
//   (CAIXA_FORECAST_GAS_URL / CAIXA_FORECAST_GAS_KEY). Nada novo pra configurar.
// - usa o bloco FDIARIO (fluxo diário Set–Dez) e o FD_CORTE (último dia realizado de cada casa).
//   Dia <= corte da casa = PAGO (BASE, data de baixa). Dia > corte = A PAGAR (Projetado, data prevista).
// - o split pago / a pagar é feito casa a casa e só depois somado no consolidado,
//   então funciona mesmo se as casas tiverem cortes diferentes.
// - respeita a permissão por unidade (coluna lojas do user_permissions).

import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { unitIdFromString } from '@/lib/units'
import SNAPSHOT from '@/lib/caixa-forecast/dados.json'

const GAS_URL = process.env.CAIXA_FORECAST_GAS_URL || ''
const GAS_KEY = process.env.CAIXA_FORECAST_GAS_KEY || ''

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CATEGORIAS = [
  'CMV', 'Materiais Operacionais', 'Pessoal', 'Encargos Sociais', 'Benefícios', 'Entretenimento',
  'Marketing', 'Serviços Terceiros', 'Manutenção Predial', 'Ocupação', 'TI e Telecom',
  'Despesas Administrativas', 'Tributos s/ Receita', 'Rateio Holding', 'Parcelamentos', 'Outros',
]
const MESES = ['Setembro', 'Outubro', 'Novembro', 'Dezembro']

type FDMes = { datas: string[]; linhas: Record<string, number[]> }
type FD = Record<string, Record<string, FDMes>>
type MesSaida = { datas: string[]; pago: Record<string, number[]>; aPagar: Record<string, number[]> }

// cache curto por instância (o Apps Script devolve o painel inteiro, é pesado)
let cache: { t: number; dados: Record<string, unknown>; fonte: string } | null = null
const CACHE_MS = 5 * 60 * 1000

async function carregar(fresco: boolean) {
  if (!fresco && cache && Date.now() - cache.t < CACHE_MS) return cache
  let doGas: Record<string, unknown> | null = null
  if (GAS_URL) {
    try {
      const qs = new URLSearchParams({ acao: 'dados', key: GAS_KEY })
      const res = await fetch(`${GAS_URL}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
      const json = await res.json()
      if (json?.ok !== false && json?.dados) doGas = json.dados as Record<string, unknown>
    } catch {
      doGas = null // Apps Script fora do ar -> segue com o snapshot
    }
  }
  const snap = SNAPSHOT as Record<string, unknown>
  cache = {
    t: Date.now(),
    dados: doGas ? { ...snap, ...doGas } : snap,
    fonte: doGas ? 'apps-script' : 'snapshot',
  }
  return cache
}

const r2 = (v: number) => Math.round(v * 100) / 100

export async function GET(req: Request) {
  const access = await getUserAccess()
  if (!access) return Response.json({ ok: false, erro: 'Sessão expirada. Entre de novo no HUB.' }, { status: 401 })
  if (!hasDashboardAccess(access, 'fluxo-pagamentos') && !hasDashboardAccess(access, 'caixa-forecast')) {
    return Response.json({ ok: false, erro: 'Você não tem acesso a este painel.' }, { status: 403 })
  }

  try {
    const fresco = new URL(req.url).searchParams.get('fresco') === '1'
    const { dados, fonte, t } = await carregar(fresco)
    const fd = ((dados.FDIARIO as { fd?: FD } | undefined)?.fd || {}) as FD
    const corteRaw = (dados.FD_CORTE || {}) as Record<string, string>
    const hojeRaw = String(dados.FD_HOJE || '')

    const lojas = access.lojas
    const unidades = Object.keys(fd)
      .filter(u => u !== '__CONS__')
      .filter(u => {
        if (lojas === '*') return true
        const id = unitIdFromString(u)
        return !!id && lojas.includes(id)
      })
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))

    if (!unidades.length) {
      return Response.json({ ok: false, erro: 'Nenhuma unidade liberada pra você neste painel.' }, { status: 403 })
    }

    const saida: Record<string, Record<string, MesSaida>> = {}
    const corte: Record<string, string> = {}

    unidades.forEach(u => {
      const c = corteRaw[u] || hojeRaw
      corte[u] = c
      saida[u] = {}
      MESES.forEach(m => {
        const base = fd[u]?.[m]
        if (!base) return
        const pago: Record<string, number[]> = {}
        const aPagar: Record<string, number[]> = {}
        CATEGORIAS.forEach(cat => {
          const v = base.linhas[cat] || base.datas.map(() => 0)
          pago[cat] = base.datas.map((d, i) => (d <= c ? r2(v[i] || 0) : 0))
          aPagar[cat] = base.datas.map((d, i) => (d > c ? r2(v[i] || 0) : 0))
        })
        saida[u][m] = { datas: base.datas.slice(), pago, aPagar }
      })
    })

    // consolidado das casas liberadas
    const cons: Record<string, MesSaida> = {}
    MESES.forEach(m => {
      const ref = unidades.map(u => saida[u][m]).find(Boolean)
      if (!ref) return
      const z = () => ref.datas.map(() => 0)
      const pago: Record<string, number[]> = {}
      const aPagar: Record<string, number[]> = {}
      CATEGORIAS.forEach(cat => { pago[cat] = z(); aPagar[cat] = z() })
      unidades.forEach(u => {
        const x = saida[u][m]
        if (!x) return
        CATEGORIAS.forEach(cat => {
          x.pago[cat].forEach((v, i) => { pago[cat][i] += v })
          x.aPagar[cat].forEach((v, i) => { aPagar[cat][i] += v })
        })
      })
      CATEGORIAS.forEach(cat => { pago[cat] = pago[cat].map(r2); aPagar[cat] = aPagar[cat].map(r2) })
      cons[m] = { datas: ref.datas.slice(), pago, aPagar }
    })
    saida.__CONS__ = cons
    corte.__CONS__ = unidades.reduce((a, u) => (corte[u] > a ? corte[u] : a), '')

    return Response.json(
      {
        ok: true,
        fonte,
        atualizado: new Date(t).toISOString(),
        meses: MESES,
        categorias: CATEGORIAS,
        unidades,
        corte,
        dados: saida,
      },
      { headers: { 'Cache-Control': 'private, no-store' } },
    )
  } catch (e) {
    return Response.json({ ok: false, erro: String((e as Error)?.message || e) }, { status: 500 })
  }
}
