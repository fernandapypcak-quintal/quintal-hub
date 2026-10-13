// app/api/caixa-forecast/painel/route.ts
// Serve o Painel de Caixa & Forecast já com os dados.
// - checa login + permissão do dashboard 'caixa-forecast' (o HTML tem números de todas as casas,
//   então NÃO fica em /public)
// - lê o template lib/caixa-forecast/painel.html (HTML original, só com os JSON trocados por
//   __CF_DATA__["NOME"]) e injeta os dados numa <script> no <head>
// - dados: lib/caixa-forecast/dados.json (snapshot). Se CAIXA_FORECAST_GAS_URL estiver configurada,
//   as chaves que o Apps Script devolver substituem as do snapshot (dá pra migrar bloco a bloco).

import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

// Opcional (Vercel > Settings > Environment Variables):
//   CAIXA_FORECAST_GAS_URL -> URL /exec do Web App que devolve { ok: true, dados: { DATA: ..., PROJ: ... } }
//   CAIXA_FORECAST_GAS_KEY -> chave da propriedade API_KEY do script
const GAS_URL = process.env.CAIXA_FORECAST_GAS_URL || ''
const GAS_KEY = process.env.CAIXA_FORECAST_GAS_KEY || ''

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const DIR = path.join(process.cwd(), 'lib', 'caixa-forecast')
let templateCache: string | null = null
let snapshotCache: Record<string, unknown> | null = null

async function carregarBase(): Promise<{ template: string; snapshot: Record<string, unknown> }> {
  const template = templateCache ?? await readFile(path.join(DIR, 'painel.html'), 'utf8')
  const snapshot = snapshotCache ?? JSON.parse(await readFile(path.join(DIR, 'dados.json'), 'utf8'))
  templateCache = template
  snapshotCache = snapshot
  return { template, snapshot }
}

async function dadosDoGas(): Promise<Record<string, unknown> | null> {
  if (!GAS_URL) return null
  try {
    const qs = new URLSearchParams({ acao: 'dados', key: GAS_KEY })
    const res = await fetch(`${GAS_URL}?${qs}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
    const json = await res.json()
    if (json?.ok === false || !json?.dados) return null
    return json.dados as Record<string, unknown>
  } catch {
    return null // Apps Script fora do ar -> segue com o snapshot
  }
}

function pagina(titulo: string, msg: string, status: number) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><body style="font-family:system-ui;padding:40px;color:#26320F;background:#EEF6DC"><h3>${titulo}</h3><p>${msg}</p></body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  )
}

export async function GET() {
  const access = await getUserAccess()
  if (!access) return pagina('Sessão expirada', 'Entre de novo no HUB.', 401)
  if (!hasDashboardAccess(access, 'caixa-forecast')) return pagina('Sem acesso', 'Você não tem acesso a este painel.', 403)

  try {
    const { template, snapshot } = await carregarBase()
    const doGas = await dadosDoGas()
    const dados = doGas ? { ...snapshot, ...doGas } : snapshot

    // "<" vira \u003c pra nenhum texto dos dados fechar a <script> no meio
    const json = JSON.stringify(dados).replace(/</g, '\\u003c')
    const html = template.replace(
      '/*__CF_DATA__*/',
      `window.__CF_DATA__=${json};var __CF_DATA__=window.__CF_DATA__;`,
    )

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-store',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Caixa-Forecast-Fonte': doGas ? 'apps-script+snapshot' : 'snapshot',
      },
    })
  } catch (e) {
    return pagina('Erro ao abrir o painel', String((e as Error)?.message || e), 500)
  }
}
