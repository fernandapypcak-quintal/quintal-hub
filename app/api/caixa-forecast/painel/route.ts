// app/api/caixa-forecast/painel/route.ts
// Serve o Painel de Caixa & Forecast já com os dados.
// - checa login + permissão do dashboard 'caixa-forecast' (o HTML tem números de todas as casas,
//   então NÃO fica em /public)
// - usa o template lib/caixa-forecast/painel.ts (HTML original, só com os JSON trocados por
//   __CF_DATA__["NOME"]) e injeta os dados numa <script> no <head>
// - template e snapshot entram no bundle via import (nada é lido do disco em tempo de execução)
// - dados: lib/caixa-forecast/dados.json (snapshot). Se CAIXA_FORECAST_GAS_URL estiver configurada,
//   as chaves que o Apps Script devolver substituem as do snapshot (dá pra migrar bloco a bloco).

import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import PAINEL_HTML from '@/lib/caixa-forecast/painel'
import SNAPSHOT from '@/lib/caixa-forecast/dados.json'

// Opcional (Vercel > Settings > Environment Variables):
//   CAIXA_FORECAST_GAS_URL -> URL /exec do Web App que devolve { ok: true, dados: { DATA: ..., PROJ: ... } }
//   CAIXA_FORECAST_GAS_KEY -> chave da propriedade API_KEY do script
const GAS_URL = process.env.CAIXA_FORECAST_GAS_URL || ''
const GAS_KEY = process.env.CAIXA_FORECAST_GAS_KEY || ''

export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

// Ajustes depois de juntar o Apps Script com o snapshot:
// - linhas de posição (agenda/aplicações) só vêm do snapshot se o script não mandou
// - estrutura fixa da Projeção (estrutura/saldo) vem do snapshot
// - o que a base do financeiro não tem (Orçamento, Visão Diretoria, GER) segue do snapshot pelo merge
const FD_POSICAO = ['(+) Aplicações financeiras (saldo)', '(+) Agenda de recebíveis (saldo a receber de cartão)']
const FD_DISP = 'DISPONIBILIDADE TOTAL (caixa + aplicação + agenda)'
const PROJ_POSICAO = ['Agenda de recebíveis (saldo no fim do mês)', 'Aplicações financeiras (saldo no fim do mês)']

type Obj = Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any

function completarComSnapshot(dados: Obj, snap: Obj) {
  const r2 = (x: number) => Math.round(x * 100) / 100
  const fd = dados.FDIARIO?.fd, sfd = snap.FDIARIO?.fd
  if (fd && sfd && dados.FDIARIO !== snap.FDIARIO) {
    for (const u of Object.keys(fd)) for (const m of Object.keys(fd[u])) {
      const L = fd[u][m].linhas, s = sfd[u]?.[m]
      if (L[FD_DISP] || !s || s.datas?.join() !== fd[u][m].datas?.join()) continue
      for (const k of FD_POSICAO) if (!L[k] && s.linhas[k]) L[k] = s.linhas[k]
      const fim: number[] = L['SALDO CAIXA FINAL'] || []
      L[FD_DISP] = fim.map((v, i) => r2(v + FD_POSICAO.reduce((a, k) => a + (L[k]?.[i] || 0), 0)))
    }
  }
  const P = dados.PROJ, SP = snap.PROJ
  if (P && SP && P !== SP) {
    if (!P.estrutura) P.estrutura = SP.estrutura
    if (!P.saldo) P.saldo = SP.saldo
    if (!P.meses) P.meses = SP.meses
    for (const u of Object.keys(P.unidades || {})) for (const k of PROJ_POSICAO) {
      const vazio = !P.unidades[u][k] || Object.keys(P.unidades[u][k]).length === 0
      if (vazio && SP.unidades?.[u]?.[k]) P.unidades[u][k] = SP.unidades[u][k]
    }
    for (const k of PROJ_POSICAO) if (!P.cons?.[k] && SP.cons?.[k]) P.cons[k] = SP.cons[k]
  }
  return dados
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
    const template = PAINEL_HTML
    const snapshot = SNAPSHOT as Record<string, unknown>
    const doGas = await dadosDoGas()
    const dados = doGas ? completarComSnapshot({ ...snapshot, ...doGas }, snapshot) : snapshot

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
