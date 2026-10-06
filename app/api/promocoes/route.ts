// app/api/promocoes/route.ts
// Proxy server-side do Apps Script de Promoções (PromocoesApi.gs), no mesmo
// padrão do /api/vendas:
//   - guarda a chave do Apps Script só no servidor
//   - aplica a permissão por unidade
//   - devolve tabelas em formato colunar com strings "internadas" (leve)
//
//   GET /api/promocoes?acao=meta              meses, resumo mensal, status
//   GET /api/promocoes?acao=periodo&mes=AAAA-MM   mês escolhido + mês anterior
//
// Vercel (Settings > Environment Variables):
//   PROMOCOES_GAS_URL -> URL /exec da implantação do Apps Script de Promoções
//   PROMOCOES_GAS_KEY -> mesmo valor da propriedade API_KEY do script

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { isUnitAllowed } from '@/lib/units'
import { URL_PROMOCOES_PACOTES } from '@/lib/promocoesConfig'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const GAS_URL = process.env.PROMOCOES_GAS_URL || URL_PROMOCOES_PACOTES
const GAS_KEY = process.env.PROMOCOES_GAS_KEY || ''

type Compacto = { cols: string[]; rows: any[][] }

async function chamar(params: Record<string, string>) {
  const qs = new URLSearchParams({ ...params, key: GAS_KEY })
  const res = await fetch(`${GAS_URL}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch {
    throw new Error(`Resposta inválida do Apps Script (${res.status}): ${text.slice(0, 160)}`)
  }
  if (data?.ok === false) throw new Error(data.erro || 'Erro no Apps Script')
  return data
}

function compactar(tabela: Compacto | undefined, lojas: any, colunasTexto: string[]) {
  if (!tabela?.cols?.length) return { cols: [], rows: [], dict: [] }
  const idx = (c: string) => tabela.cols.indexOf(c)
  const iUnidade = idx('unidade')
  const iLoja = idx('loja')
  const textoIdx = new Set(colunasTexto.map(idx).filter(i => i >= 0))
  const dict: string[] = []
  const mapa = new Map<string, number>()
  const intern = (v: any) => {
    const s = v == null ? '' : String(v)
    let i = mapa.get(s)
    if (i === undefined) { i = dict.length; dict.push(s); mapa.set(s, i) }
    return i
  }
  const rows: any[][] = []
  for (const r of tabela.rows) {
    const unidade = iUnidade >= 0 ? r[iUnidade] : iLoja >= 0 ? r[iLoja] : ''
    if (lojas !== '*' && !isUnitAllowed(String(unidade || ''), lojas)) continue
    rows.push(r.map((v, i) => (textoIdx.has(i) ? intern(v) : v)))
  }
  return { cols: tabela.cols, rows, dict, texto: [...textoIdx] }
}

function mesAnterior(mes: string) {
  const [a, m] = mes.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${String(m - 1).padStart(2, '0')}`
}

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'promocoes')) return NextResponse.json({ ok: false, erro: 'Acesso negado' }, { status: 403 })

  const sp = new URL(req.url).searchParams
  const acao = sp.get('acao') || 'meta'

  try {
    if (acao === 'meta') {
      const meta = await chamar({ acao: 'meta' })
      const resumo: Record<string, Record<string, any>> = {}
      for (const [mes, porUni] of Object.entries<any>(meta.resumo || {})) {
        resumo[mes] = {}
        for (const [uni, v] of Object.entries<any>(porUni)) {
          if (access.lojas === '*' || isUnitAllowed(uni, access.lojas)) resumo[mes][uni] = v
        }
      }
      return NextResponse.json({ ok: true, meses: meta.meses || [], resumo, resumoGeradoEm: meta.resumoGeradoEm, status: meta.status || {} })
    }

    if (acao === 'periodo') {
      const mes = sp.get('mes') || ''
      if (!/^\d{4}-\d{2}$/.test(mes)) return NextResponse.json({ ok: false, erro: 'Informe mes=AAAA-MM' }, { status: 400 })
      const data = await chamar({ acao: 'periodo', de: mesAnterior(mes), ate: mes })
      const texto = ['mes', 'data', 'loja', 'unidade', 'canal', 'promocao', 'categoria', 'produto', 'categoria_produto', 'nome_do_pacote', 'promocoes', 'reserva', 'status']
      return NextResponse.json({
        ok: true,
        meses: data.meses,
        status: data.status || {},
        pacotes: compactar(data.pacotes, access.lojas, texto),
        pacotesReservas: compactar(data.pacotesReservas, access.lojas, texto),
        pacotesConsumo: compactar(data.pacotesConsumo, access.lojas, texto),
        promocoesDiario: compactar(data.promocoesDiario, access.lojas, texto),
        promocoesMensal: compactar(data.promocoesMensal, access.lojas, texto),
        ficha: data.ficha || [],
        fichaAoVivo: true,
      })
    }

    return NextResponse.json({ ok: false, erro: 'acao inválida' }, { status: 400 })
  } catch (e: any) {
    const msg = e?.name === 'TimeoutError' ? 'O Apps Script demorou demais para responder' : (e?.message || 'Falha ao buscar promoções')
    return NextResponse.json({ ok: false, erro: msg }, { status: 502 })
  }
}
