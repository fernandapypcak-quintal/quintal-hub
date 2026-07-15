// app/api/pipedrive/route.ts
// Proxy server-side para o Apps Script do Pipedrive
// Evita CORS ao chamar diretamente do browser

import { NextRequest, NextResponse } from 'next/server'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwbZLm21qAcguPxRYrHy22pbIXmHFShjmYcr6tJdoKCF1UE4zi1gryT1hwSZWwtnQXw/exec'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
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
