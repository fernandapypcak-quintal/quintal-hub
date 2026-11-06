// app/api/reservas/cadastros/route.ts
// Operadores, metas semanais e escala de Reservas — lidos e gravados nas abas
// OPERADORES / METAS_SEMANAIS / ESCALA da planilha de Reservas pelo Apps Script
// QuintalFaturamentoMetas.gs (?tabela=...). Regras em lib/reservas-cadastros.ts.
//
//   GET  ?tabela=reservas_escala            → { colunas, linhas }
//   POST { tabela, linhas: string[][] }     → regrava a tabela (admin ou 'reservas-metas-editar')

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { TABELAS_RESERVAS, mapaOperadores, validarTabela, type TabelaReservas } from '@/lib/reservas-cadastros'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const gasUrl = () => process.env.FATURAMENTO_METAS_GAS_URL || ''
const gasKey = () => process.env.FATURAMENTO_METAS_GAS_KEY || ''

async function lerDaPlanilha(tabela: TabelaReservas): Promise<{ colunas: string[]; linhas: string[][] }> {
  const qs = new URLSearchParams({ key: gasKey(), tabela })
  const res = await fetch(`${gasUrl()}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
  const json = await res.json()
  if (!json.ok) throw new Error(json.erro || 'Erro no Apps Script')
  return { colunas: json.colunas || [], linhas: json.linhas || [] }
}

function tabelaDe(v: unknown): TabelaReservas | null {
  return TABELAS_RESERVAS.includes(v as TabelaReservas) ? (v as TabelaReservas) : null
}

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'reservas')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  const tabela = tabelaDe(req.nextUrl.searchParams.get('tabela'))
  if (!tabela) return NextResponse.json({ erro: 'Tabela inválida' }, { status: 400 })
  if (!gasUrl()) return NextResponse.json({ erro: 'Gravação não configurada (FATURAMENTO_METAS_GAS_URL/KEY).' }, { status: 503 })
  try {
    return NextResponse.json(await lerDaPlanilha(tabela))
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 502 })
  }
}

export async function POST(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!access.isAdmin && !hasDashboardAccess(access, 'reservas-metas-editar')) {
    return NextResponse.json({ erro: 'Você não tem permissão para editar os cadastros de Reservas' }, { status: 403 })
  }
  if (!gasUrl()) return NextResponse.json({ erro: 'Gravação não configurada (FATURAMENTO_METAS_GAS_URL/KEY).' }, { status: 503 })
  try {
    const body = await req.json()
    const tabela = tabelaDe(body.tabela)
    if (!tabela) return NextResponse.json({ erro: 'Tabela inválida' }, { status: 400 })
    const brutas: string[][] = (Array.isArray(body.linhas) ? body.linhas : []).filter((l: unknown) => Array.isArray(l))

    // escala e metas semanais só aceitam operadoras que estão no cadastro
    const ops = tabela === 'reservas_operadores' ? undefined : mapaOperadores((await lerDaPlanilha('reservas_operadores')).linhas)
    const { linhas, erros } = validarTabela(tabela, brutas, ops)
    if (erros.length) {
      return NextResponse.json({ erro: erros.map((e) => `Linha ${e.linha + 1}: ${e.msg}`).join(' · '), erros }, { status: 400 })
    }
    if (tabela === 'reservas_operadores' && !linhas.length) {
      return NextResponse.json({ erro: 'O cadastro de operadores não pode ficar vazio' }, { status: 400 })
    }

    const res = await fetch(gasUrl(), {
      method: 'POST',
      body: JSON.stringify({ key: gasKey(), tabela, linhas, usuario: access.email }),
      signal: AbortSignal.timeout(55000),
    })
    const json = await res.json()
    if (!json.ok) return NextResponse.json({ erro: json.erro || 'Erro no Apps Script' }, { status: 502 })
    return NextResponse.json({ ok: true, gravadas: json.gravadas })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 502 })
  }
}
