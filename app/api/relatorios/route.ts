// app/api/relatorios/route.ts
// Proxy server-side para o Apps Script de Relatórios ZIG — evita CORS

import { NextRequest, NextResponse } from 'next/server'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbw8w6Uwzg6WhkMJdn5SGSbW9iUyJgfRdFNKGfiGBSr-84vDNjS2vka245wPqohjsPvOjg/exec'

// Aumenta timeout do Vercel para 60s (necessário para Apps Script pesados)
export const maxDuration = 60

export async function GET(req: NextRequest) {
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
