// app/api/pipedrive/route.ts
// Proxy server-side para o Apps Script do Pipedrive
// Evita CORS ao chamar diretamente do browser

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { allowedNativeLabels } from '@/lib/units'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwbZLm21qAcguPxRYrHy22pbIXmHFShjmYcr6tJdoKCF1UE4zi1gryT1hwSZWwtnQXw/exec'

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'comercial')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)

    // Backstop de unidade: se o usuário não tem acesso a todas as
    // unidades, o Apps Script exige um `unidade=` explícito e dentro do
    // permitido — evita que alguém monte a URL na mão e puxe a rede toda.
    if (access.lojas !== '*') {
      const idsPermitidos = allowedNativeLabels(access.lojas, 'comercialId') as string[]
      const unidadeReq = searchParams.get('unidade')
      if (!unidadeReq || !idsPermitidos.includes(unidadeReq)) {
        return NextResponse.json({ erro: 'Unidade não permitida' }, { status: 403 })
      }
    }

    const params = searchParams.toString()
    
    const res = await fetch(`${GAS_URL}${params ? '?' + params : ''}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30000),
    })
    
    if (!res.ok) {
      return NextResponse.json({ erro: `GAS error ${res.status}` }, { status: 500 })
    }
    
    const data = await res.json()
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
