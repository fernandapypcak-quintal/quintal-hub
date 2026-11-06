// lib/metas-faixas-api.ts
// Rotas do hub para METAS MENSAIS EM 3 FAIXAS (Comercial, Reservas…), gravadas
// na planilha pelo Apps Script QuintalFaturamentoMetas.gs (?alvo=<alvo>).
// Mesma URL/senha das metas de Faturamento: FATURAMENTO_METAS_GAS_URL / _KEY.
//
//   GET  ?ano=AAAA        → { metas: [{ mes, faixa1, faixa2, faixa3, desafio, Atualizado_* }] }
//   POST { metas: [...] } → grava (admin ou a sub-permissão de edição)

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

const NAO_CONFIGURADO = 'A gravação de metas não está configurada (variáveis FATURAMENTO_METAS_GAS_URL/KEY na Vercel).'

export function criarRotaMetasFaixas(opts: {
  /** alvo no Apps Script (ALVOS_FAIXAS) */
  alvo: 'comercial' | 'reservas'
  /** quem pode LER: acesso a este dashboard */
  dashboard: string
  /** quem pode GRAVAR: admin ou esta sub-permissão */
  permissaoEditar: string
  /** valores inteiros (nº de reservas) em vez de R$ */
  inteiro?: boolean
  comDesafio?: boolean
}) {
  const gasUrl = () => process.env.FATURAMENTO_METAS_GAS_URL || ''
  const gasKey = () => process.env.FATURAMENTO_METAS_GAS_KEY || ''

  async function GET(req: NextRequest) {
    const access = await getUserAccess()
    if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (!hasDashboardAccess(access, opts.dashboard)) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
    if (!gasUrl()) return NextResponse.json({ erro: NAO_CONFIGURADO, naoConfigurado: true }, { status: 503 })
    try {
      const ano = (req.nextUrl.searchParams.get('ano') || '').replace(/\D/g, '').slice(0, 4)
      const qs = new URLSearchParams({ key: gasKey(), ano, alvo: opts.alvo })
      const res = await fetch(`${gasUrl()}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
      const json = await res.json()
      if (!json.ok) return NextResponse.json({ erro: json.erro || 'Erro no Apps Script' }, { status: 502 })
      return NextResponse.json({ metas: json.metas || [] })
    } catch (e: any) {
      return NextResponse.json({ erro: e.message }, { status: 502 })
    }
  }

  async function POST(req: NextRequest) {
    const access = await getUserAccess()
    if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
    if (!access.isAdmin && !hasDashboardAccess(access, opts.permissaoEditar)) {
      return NextResponse.json({ erro: 'Você não tem permissão para editar estas metas' }, { status: 403 })
    }
    if (!gasUrl()) return NextResponse.json({ erro: NAO_CONFIGURADO, naoConfigurado: true }, { status: 503 })
    try {
      const body = await req.json()
      const num = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v))
      const metas = (Array.isArray(body.metas) ? body.metas : []).map((m: any) => ({
        mes: String(m.mes || ''),
        faixa1: Number(m.faixa1),
        faixa2: Number(m.faixa2),
        faixa3: Number(m.faixa3),
        ...(opts.comDesafio ? { desafio: num(m.desafio) } : {}),
      }))
      if (!metas.length) return NextResponse.json({ erro: 'Nenhuma meta para gravar' }, { status: 400 })
      for (const m of metas) {
        if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(m.mes)) return NextResponse.json({ erro: `Mês inválido: ${m.mes}` }, { status: 400 })
        const vals = [m.faixa1, m.faixa2, m.faixa3]
        if (!vals.every((v) => Number.isFinite(v) && v > 0)) {
          return NextResponse.json({ erro: `${m.mes}: preencha as 3 faixas com valores maiores que zero` }, { status: 400 })
        }
        if (opts.inteiro && !vals.every(Number.isInteger)) {
          return NextResponse.json({ erro: `${m.mes}: use números inteiros` }, { status: 400 })
        }
        if (!(m.faixa1 <= m.faixa2 && m.faixa2 <= m.faixa3)) {
          return NextResponse.json({ erro: `${m.mes}: as faixas precisam ser crescentes (Faixa 1 ≤ Faixa 2 ≤ Faixa 3)` }, { status: 400 })
        }
        if (opts.comDesafio && m.desafio != null && !(Number.isFinite(m.desafio) && m.desafio >= m.faixa3)) {
          return NextResponse.json({ erro: `${m.mes}: o desafio precisa ser maior que a Faixa 3` }, { status: 400 })
        }
      }
      const res = await fetch(gasUrl(), {
        method: 'POST',
        body: JSON.stringify({ key: gasKey(), alvo: opts.alvo, usuario: access.email, metas }),
        signal: AbortSignal.timeout(55000),
      })
      const json = await res.json()
      if (!json.ok) return NextResponse.json({ erro: json.erro || 'Erro no Apps Script' }, { status: 502 })
      return NextResponse.json({ ok: true, gravadas: json.gravadas })
    } catch (e: any) {
      return NextResponse.json({ erro: e.message }, { status: 502 })
    }
  }

  return { GET, POST }
}
