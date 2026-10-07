// app/api/zig-proxy/route.ts
// PONTE Apps Script → Vercel → ZIG.
// A ZIG passou a bloquear (firewall) as chamadas que saem dos servidores do Google.
// Os scripts continuam iguais, só que mandam cada chamada pra cá e a Vercel repassa
// pra ZIG — saindo por outro endereço. Não guarda nada; só repassa.
//
// Vercel (Settings > Environment Variables):
//   ZIG_PROXY_KEY -> uma senha longa qualquer; a MESMA vai na propriedade
//                    ZIG_PROXY_KEY dos Apps Scripts (Promoções e Descontos)
//
// POST { metodo, corpo }   → repassa pra https://api.zigcore.com.br/enterprise-postgres/{metodo}
// POST { download: url }   → baixa um arquivo (ex.: xlsx de Contas em Aberto) e devolve em base64

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const BASE = 'https://api.zigcore.com.br/enterprise-postgres'

// Só os métodos que os nossos scripts usam (a ponte não fica aberta pra qualquer coisa)
const PERMITIDOS = new Set([
  'logIn',
  'getPromotionsUsedAtPlace',
  'getReserveReportAtPlace',
  'getReserveReportDetail',
  'getDiscountsAtPlaceByEmployee',
  'getRefundedProductsAtPlace',
  'getDebtorsXls',
  'getBonusReportForPlace',
  'getUsedBonusReportForPlace',
])

export async function POST(req: NextRequest) {
  const chave = process.env.ZIG_PROXY_KEY
  if (!chave || req.headers.get('x-proxy-key') !== chave) {
    return NextResponse.json({ status: 401, texto: 'chave inválida' }, { status: 401 })
  }

  let entrada: any
  try { entrada = await req.json() } catch { return NextResponse.json({ status: 400, texto: 'JSON inválido' }, { status: 400 }) }

  try {
    // Download de arquivo gerado pela ZIG
    if (entrada.download) {
      const url = String(entrada.download)
      if (!/^https:\/\//i.test(url)) return NextResponse.json({ status: 400, texto: 'url inválida' }, { status: 400 })
      const r = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(50000) })
      const buf = Buffer.from(await r.arrayBuffer())
      return NextResponse.json({ status: r.status, contentType: r.headers.get('content-type') || '', base64: buf.toString('base64') })
    }

    const metodo = String(entrada.metodo || '')
    if (!PERMITIDOS.has(metodo)) return NextResponse.json({ status: 400, texto: `método não permitido: ${metodo}` }, { status: 400 })

    const r = await fetch(`${BASE}/${metodo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/sdkgen' },
      body: typeof entrada.corpo === 'string' ? entrada.corpo : JSON.stringify(entrada.corpo),
      cache: 'no-store',
      signal: AbortSignal.timeout(50000),
    })
    const texto = await r.text()
    // Sempre 200 pra o Apps Script; o status real da ZIG vai dentro
    return NextResponse.json({ status: r.status, texto })
  } catch (e: any) {
    return NextResponse.json({ status: 599, texto: `falha de rede na Vercel: ${e?.message || e}` })
  }
}
