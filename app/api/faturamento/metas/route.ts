// app/api/faturamento/metas/route.ts
// Metas de faturamento por casa e mês (salão + delivery), editadas na tela
// "Metas" do dashboard de Faturamento e GRAVADAS NA PLANILHA do Google
// (a planilha continua sendo a fonte de verdade) via apps-script/QuintalFaturamentoMetas.gs.
//
//   GET  ?ano=2026            → metas do ano, direto da planilha (sem atraso do CSV publicado)
//   POST { anoMes, metas[] }  → grava um mês (permissão 'faturamento-metas' ou admin)
//
// Vercel (Settings > Environment Variables):
//   FATURAMENTO_METAS_GAS_URL → URL /exec do QuintalFaturamentoMetas.gs
//   FATURAMENTO_METAS_GAS_KEY → mesmo valor da propriedade API_KEY do script

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { UNITS, isUnitAllowed } from '@/lib/units'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GAS_URL = process.env.FATURAMENTO_METAS_GAS_URL || ''
const GAS_KEY = process.env.FATURAMENTO_METAS_GAS_KEY || ''
const NAO_CONFIGURADO =
  'A gravação de metas ainda não foi configurada (falta instalar o script QuintalFaturamentoMetas.gs e as variáveis FATURAMENTO_METAS_GAS_URL/KEY na Vercel).'

const LOJAS_VALIDAS = new Set(UNITS.map((u) => u.zigLabel).filter(Boolean) as string[])

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  // Faturamento (tela Metas) e Metas Regionais (meta de salão/delivery) leem daqui
  if (!hasDashboardAccess(access, 'faturamento') && !hasDashboardAccess(access, 'metas')) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }
  if (!GAS_URL) return NextResponse.json({ erro: NAO_CONFIGURADO, naoConfigurado: true }, { status: 503 })

  try {
    const ano = (req.nextUrl.searchParams.get('ano') || '').replace(/\D/g, '').slice(0, 4)
    const qs = new URLSearchParams({ key: GAS_KEY, ano })
    const res = await fetch(`${GAS_URL}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
    const json = await res.json()
    if (!json.ok) return NextResponse.json({ erro: json.erro || 'Erro no Apps Script' }, { status: 502 })
    // só as casas liberadas pro usuário
    const metas = (json.metas || []).filter((m: any) => isUnitAllowed(m.Loja, access.lojas))
    return NextResponse.json({ metas })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!access.isAdmin && !hasDashboardAccess(access, 'faturamento-metas')) {
    return NextResponse.json({ erro: 'Você não tem permissão para editar as metas de faturamento' }, { status: 403 })
  }
  if (!GAS_URL) return NextResponse.json({ erro: NAO_CONFIGURADO, naoConfigurado: true }, { status: 503 })

  try {
    const body = await req.json()
    const anoMes = String(body.anoMes || '')
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(anoMes)) return NextResponse.json({ erro: 'Mês inválido' }, { status: 400 })

    const metas = (Array.isArray(body.metas) ? body.metas : [])
      .map((m: any) => ({ loja: String(m.loja || ''), salao: Number(m.salao) || 0, delivery: Number(m.delivery) || 0 }))
      .filter((m: any) => LOJAS_VALIDAS.has(m.loja))
    if (!metas.length) return NextResponse.json({ erro: 'Nenhuma meta válida para gravar' }, { status: 400 })
    if (metas.some((m: any) => m.salao < 0 || m.delivery < 0)) return NextResponse.json({ erro: 'Meta não pode ser negativa' }, { status: 400 })

    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ key: GAS_KEY, usuario: access.email, anoMes, metas }),
      signal: AbortSignal.timeout(55000),
    })
    const json = await res.json()
    if (!json.ok) return NextResponse.json({ erro: json.erro || 'Erro no Apps Script' }, { status: 502 })
    return NextResponse.json({ ok: true, gravadas: json.gravadas })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 502 })
  }
}
