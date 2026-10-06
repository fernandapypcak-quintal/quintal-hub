// app/api/promocoes/route.ts
// Proxy server-side do Apps Script de Promoções (QuintalPromocoes.gs).
// - evita CORS
// - aplica a permissão por unidade no servidor
// - devolve tudo em formato colunar com strings "internadas" (bem mais leve)

import { NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { isUnitAllowed } from '@/lib/units'
import { URL_PROMOCOES_PACOTES } from '@/lib/promocoesConfig'

export const maxDuration = 60
export const dynamic = 'force-dynamic'

const GAS_URL = process.env.PROMOCOES_GAS_URL || URL_PROMOCOES_PACOTES

type Compacto = { cols: string[]; rows: any[][] }

async function buscar(tipo: string) {
  const res = await fetch(`${GAS_URL}?tipo=${tipo}`, { cache: 'no-store', signal: AbortSignal.timeout(50000) })
  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch {
    throw new Error(`Resposta inválida do Apps Script em ${tipo} (${res.status}): ${text.slice(0, 160)}`)
  }
  if (data?.erro) throw new Error(`Apps Script (${tipo}): ${data.erro}`)
  return data
}

// Filtra por unidade permitida e troca strings repetidas por índice num dicionário
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
    const unidade = iUnidade >= 0 ? r[iUnidade] : r[iLoja]
    if (lojas !== '*' && !isUnitAllowed(String(unidade || r[iLoja] || ''), lojas)) continue
    rows.push(r.map((v, i) => (textoIdx.has(i) ? intern(v) : v)))
  }
  return { cols: tabela.cols, rows, dict, texto: [...textoIdx] }
}

export async function GET() {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'promocoes')) return NextResponse.json({ ok: false, erro: 'Acesso negado' }, { status: 403 })

  try {
    const [tudo, status, ficha] = await Promise.all([
      buscar('tudo_v2'),
      buscar('status').catch(() => null),
      buscar('ficha_tecnica').catch(() => null), // ao vivo (o cache pode estar defasado)
    ])

    const texto = ['mes', 'data', 'loja', 'unidade', 'canal', 'promocao', 'categoria', 'produto', 'categoria_produto', 'nome_do_pacote']
    return NextResponse.json({
      ok: true,
      status,
      geradoEm: tudo.geradoEm || null,
      pacotes: compactar(tudo.pacotes, access.lojas, texto),
      promocoesMensal: compactar(tudo.promocoes_utilizadas, access.lojas, texto),
      promocoesDiario: compactar(tudo.promocoes_utilizadas_diario, access.lojas, texto),
      ficha: Array.isArray(ficha)
        ? ficha.map((f: any) => [f.produto, f.custo_unitario_r, f.preco_de_venda_r, f.categoria])
        : (tudo.ficha_tecnica?.rows || []).map((r: any[]) => [r[0], r[2], r[3], r[1]]),
      fichaAoVivo: Array.isArray(ficha),
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, erro: e.message || 'Falha ao buscar promoções' }, { status: 502 })
  }
}
