// app/api/custos/route.ts
// Proxy server-side para o Apps Script do Custos — evita CORS

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxVXc8MXLItuTmgRP8v2dlQj4UNyQSEHfX-snfAPfL5JBgrjhNIOsb4DikFrDm7H8OX/exec'

// Aumenta timeout do Vercel para 60s (necessário para Apps Script pesados)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'custos')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const params = searchParams.toString()

    const res = await fetch(`${GAS_URL}${params ? '?' + params : ''}`, {
      signal: AbortSignal.timeout(55000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ erro: `GAS ${res.status}: ${text.slice(0,200)}` }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
