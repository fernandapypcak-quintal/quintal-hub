// app/api/gorjeta/route.ts
// Proxy server-side para o Apps Script de Gorjeta (Gorjeta_Pipeline.gs) — evita CORS

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

// TODO: cole aqui a URL do Web App do Gorjeta_Pipeline.gs (Implantar > Nova
// implantação > Aplicativo da web > Executar como você > Acesso: Qualquer pessoa)
const GAS_URL = 'https://script.google.com/macros/s/AKfycby1patg1sWnWKvLrmJ8Kc0ca4eguqfyvpnaIVMx2DkIgLUBDAPtSv68gq1b21pF9jh-/exec'

// Aumenta timeout do Vercel para 60s (a busca de Gorjeta faz um loop dia a dia)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'gorjeta')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const { UNITS, unitIdFromString } = await import('@/lib/units')

    // "unidade" vem como o id canônico (ex: "vila_madalena") — resolve pro
    // zigLabel (ex: "VILA MADALENA") antes de repassar pro Apps Script, que
    // não conhece o esquema de ids do HUB, só os nomes de loja da própria Zig.
    const unidade = searchParams.get('unidade')
    let loja: string | null = null
    if (unidade) {
      const unit = UNITS.find(u => u.id === unidade)
      if (!unit || !unit.zigLabel) {
        return NextResponse.json({ erro: 'Unidade sem zigLabel configurado: ' + unidade }, { status: 400 })
      }
      // Trava por permissão: se a pessoa não tem acesso a essa unidade, nem
      // chega a chamar o Apps Script.
      if (access.lojas !== '*' && !access.lojas.includes(unit.id)) {
        return NextResponse.json({ erro: 'Sem acesso a essa unidade' }, { status: 403 })
      }
      loja = unit.zigLabel
    }

    const forwardParams = new URLSearchParams(searchParams)
    forwardParams.delete('unidade')
    if (loja) forwardParams.set('loja', loja)

    const params = forwardParams.toString()
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
