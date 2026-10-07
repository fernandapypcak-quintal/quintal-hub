// app/api/zig-proxy/route.ts
// PONTE Apps Script → Vercel → ZIG.
// A ZIG passou a bloquear (firewall) as chamadas que saem dos servidores do Google.
// Os scripts continuam iguais, só que mandam cada chamada pra cá e a Vercel repassa
// pra ZIG — saindo por outro endereço. Não guarda nada; só repassa.
//
// Vercel (Settings > Environment Variables):
//   ZIG_PROXY_KEY -> uma senha longa qualquer; a MESMA vai na propriedade
//                    ZIG_PROXY_KEY dos Apps Scripts (Promoções e Descontos)
//   ZIG_ORIGIN    -> (opcional) endereço do painel da ZIG, ex.: https://painel.zig...
//                    (o "Origin" que aparece no DevTools quando você usa o painel)
//
// GET /api/zig-proxy (logada como admin) → diagnóstico: a ZIG aceita a Vercel?
//
// POST { metodo, corpo }   → repassa pra https://api.zigcore.com.br/enterprise-postgres/{metodo}
// POST { download: url }   → baixa um arquivo (ex.: xlsx de Contas em Aberto) e devolve em base64

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess } from '@/lib/permissions'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
// Roda em São Paulo: o firewall da ZIG barra endereços de fora do Brasil
// (a Vercel usa Washington/EUA por padrão).
export const preferredRegion = 'gru1'

const BASE = 'https://api.zigcore.com.br/enterprise-postgres'

// Cabeçalhos de navegador: o firewall da ZIG (Cloudflare) costuma barrar
// requisições que não parecem vir de um navegador.
const HEADERS_NAVEGADOR: Record<string, string> = {
  'Content-Type': 'application/sdkgen',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'pt-BR,pt;q=0.9,en;q=0.8',
}
if (process.env.ZIG_ORIGIN) {
  HEADERS_NAVEGADOR['Origin'] = process.env.ZIG_ORIGIN
  HEADERS_NAVEGADOR['Referer'] = process.env.ZIG_ORIGIN + '/'
}

function resumoHtml(texto: string) {
  const titulo = texto.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim()
  const codigo = texto.match(/error code[:\s]*(\d{3,4})/i)?.[1]
  return [titulo, codigo ? `código ${codigo}` : null].filter(Boolean).join(' · ') || texto.slice(0, 120)
}

// DIAGNÓSTICO: abra /api/zig-proxy logada como admin. Faz 1 chamada de login
// com usuário falso — se a ZIG responder "usuário inválido", a Vercel PASSA pelo
// firewall; se vier página HTML 403, a Vercel também está bloqueada.
export async function GET() {
  const access = await getUserAccess()
  if (!access || access.lojas !== '*') return NextResponse.json({ ok: false, erro: 'Só admin' }, { status: 403 })
  const corpo = JSON.stringify({
    args: { username: 'teste-ponte', password: 'x', organizationUsername: 'quintaldoespeto' },
    deviceInfo: { id: 'quintal-hub-ponte-diag', language: 'pt-BR', platform: { name: 'web', os: 'Vercel' } },
    extra: { tz: 'America/Sao_Paulo', lng: 'pt-BR' }, name: 'logIn', requestId: crypto.randomUUID().replace(/-/g, ''), version: 3,
  })
  const r = await fetch(`${BASE}/logIn`, { method: 'POST', headers: HEADERS_NAVEGADOR, body: corpo, cache: 'no-store' })
  const texto = await r.text()
  const html = /^\s*</.test(texto)
  return NextResponse.json({
    status: r.status,
    passouPeloFirewall: !html,
    diagnostico: html ? `❌ A ZIG também bloqueia a Vercel: ${resumoHtml(texto)}` : '✅ A Vercel passa pelo firewall da ZIG (o erro de usuário abaixo é esperado).',
    resposta: html ? null : texto.slice(0, 300),
    cfRay: r.headers.get('cf-ray'),
    regiaoVercel: process.env.VERCEL_REGION || null,
    usouOrigin: process.env.ZIG_ORIGIN || null,
  })
}

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
      const r = await fetch(url, { cache: 'no-store', headers: { 'User-Agent': HEADERS_NAVEGADOR['User-Agent'] }, signal: AbortSignal.timeout(50000) })
      const buf = Buffer.from(await r.arrayBuffer())
      return NextResponse.json({ status: r.status, contentType: r.headers.get('content-type') || '', base64: buf.toString('base64') })
    }

    const metodo = String(entrada.metodo || '')
    if (!PERMITIDOS.has(metodo)) return NextResponse.json({ status: 400, texto: `método não permitido: ${metodo}` }, { status: 400 })

    const r = await fetch(`${BASE}/${metodo}`, {
      method: 'POST',
      headers: HEADERS_NAVEGADOR,
      body: typeof entrada.corpo === 'string' ? entrada.corpo : JSON.stringify(entrada.corpo),
      cache: 'no-store',
      signal: AbortSignal.timeout(50000),
    })
    const texto = await r.text()
    if (r.status !== 200 && /^\s*</.test(texto)) console.warn(`[zig-proxy] ${metodo} → ${r.status} ${resumoHtml(texto)} cf-ray=${r.headers.get('cf-ray')}`)
    // Sempre 200 pra o Apps Script; o status real da ZIG vai dentro
    return NextResponse.json({ status: r.status, texto })
  } catch (e: any) {
    return NextResponse.json({ status: 599, texto: `falha de rede na Vercel: ${e?.message || e}` })
  }
}
