// app/api/kids/route.ts
// Proxy server-side para o Apps Script de Kids — evita CORS

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

// TODO: cole aqui a URL /exec da implantação Web App do projeto Kids
// (Apps Script > Implantar > Nova implantação > App da Web)
const GAS_URL = 'https://script.google.com/a/macros/quintaldoespeto.com.br/s/AKfycbw9uumq5r-FpsTm6QzcFYRopKe52hg_NRmUIRy_j4j6roBIc6628H3H-olGVWIEDk77Dg/exec'

// Aumenta timeout do Vercel para 60s (necessário para Apps Script pesados)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'kids')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const params = searchParams.toString()

    const res = await fetch(`${GAS_URL}${params ? '?' + params : ''}`, {
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
