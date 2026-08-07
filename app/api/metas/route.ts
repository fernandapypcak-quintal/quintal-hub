// app/api/metas/route.ts
// Proxy server-side para o Apps Script de Metas — evita CORS
// GET: qualquer usuário com acesso ao dashboard 'metas' (filtragem por
//      unidade acontece no client, igual ao padrão do Faturamento/Kids)
// POST: só admin — grava um indicador manual (upsert)

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

// TODO: cole aqui a URL /exec da implantação Web App do QuintalMetas.gs
const GAS_URL = 'https://script.google.com/macros/s/COLE_AQUI_A_URL_DO_APPS_SCRIPT/exec'

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'metas')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const params = searchParams.toString()

    const res = await fetch(`${GAS_URL}?tipo=metas${params ? '&' + params : ''}`, {
      signal: AbortSignal.timeout(55000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ erro: `GAS ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!access.isAdmin) return NextResponse.json({ erro: 'Só admin pode editar indicadores' }, { status: 403 })

  try {
    const body = await req.json()

    const res = await fetch(GAS_URL, {
      method: 'POST',
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ erro: `GAS ${res.status}: ${text.slice(0, 200)}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
