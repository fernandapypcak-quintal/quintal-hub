// app/api/comercial/metas/route.ts
// Meta mensal do Comercial B2B (3 faixas, empresa toda), editada na tela
// "Metas" do Comercial e GRAVADA NA PLANILHA "Comercial & Marketing — Quintal HUB"
// (aba metas_b2b_mensal), que o script do Pipedrive já lê.
// Usa o mesmo Apps Script das metas de Faturamento (apps-script/QuintalFaturamentoMetas.gs),
// com alvo=comercial — mesma URL e senha (FATURAMENTO_METAS_GAS_URL / _KEY).
//
//   GET  ?ano=2026         → metas do ano
//   POST { metas: [...] }  → grava (permissão 'comercial-metas' ou admin)

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const GAS_URL = process.env.FATURAMENTO_METAS_GAS_URL || ''
const GAS_KEY = process.env.FATURAMENTO_METAS_GAS_KEY || ''
const NAO_CONFIGURADO = 'A gravação de metas não está configurada (variáveis FATURAMENTO_METAS_GAS_URL/KEY na Vercel).'

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'comercial')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  if (!GAS_URL) return NextResponse.json({ erro: NAO_CONFIGURADO, naoConfigurado: true }, { status: 503 })

  try {
    const ano = (req.nextUrl.searchParams.get('ano') || '').replace(/\D/g, '').slice(0, 4)
    const qs = new URLSearchParams({ key: GAS_KEY, ano, alvo: 'comercial' })
    const res = await fetch(`${GAS_URL}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
    const json = await res.json()
    if (!json.ok) return NextResponse.json({ erro: json.erro || 'Erro no Apps Script' }, { status: 502 })
    return NextResponse.json({ metas: json.metas || [] })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!access.isAdmin && !hasDashboardAccess(access, 'comercial-metas')) {
    return NextResponse.json({ erro: 'Você não tem permissão para editar as metas do Comercial' }, { status: 403 })
  }
  if (!GAS_URL) return NextResponse.json({ erro: NAO_CONFIGURADO, naoConfigurado: true }, { status: 503 })

  try {
    const body = await req.json()
    const metas = (Array.isArray(body.metas) ? body.metas : []).map((m: any) => ({
      mes: String(m.mes || ''),
      faixa1: Number(m.faixa1),
      faixa2: Number(m.faixa2),
      faixa3: Number(m.faixa3),
    }))
    if (!metas.length) return NextResponse.json({ erro: 'Nenhuma meta para gravar' }, { status: 400 })
    for (const m of metas) {
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.mes)) return NextResponse.json({ erro: `Mês inválido: ${m.mes}` }, { status: 400 })
      if (![m.faixa1, m.faixa2, m.faixa3].every((v) => Number.isFinite(v) && v > 0)) {
        return NextResponse.json({ erro: `${m.mes}: preencha as 3 faixas com valores maiores que zero` }, { status: 400 })
      }
      if (!(m.faixa1 <= m.faixa2 && m.faixa2 <= m.faixa3)) {
        return NextResponse.json({ erro: `${m.mes}: as faixas precisam ser crescentes (Faixa 1 ≤ Faixa 2 ≤ Faixa 3)` }, { status: 400 })
      }
    }

    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify({ key: GAS_KEY, alvo: 'comercial', usuario: access.email, metas }),
      signal: AbortSignal.timeout(55000),
    })
    const json = await res.json()
    if (!json.ok) return NextResponse.json({ erro: json.erro || 'Erro no Apps Script' }, { status: 502 })
    return NextResponse.json({ ok: true, gravadas: json.gravadas })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 502 })
  }
}
