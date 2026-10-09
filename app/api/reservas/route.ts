// app/api/reservas/route.ts
// Proxy server-side para o Apps Script de Reservas (Reservas.gs — Get In via Grafana).
// - evita CORS e guarda a API_KEY só no servidor
// - aplica a permissão por unidade: usuário restrito só recebe as casas liberadas
// - devolve as linhas compactadas (dicionário de textos) pra caber no limite de resposta da Vercel
//
// Ações:
//   ?acao=config                               metas, meses disponíveis, unidades, hoje
//   ?acao=criacao&inicio=AAAA-MM-DD&fim=…      reservas CRIADAS no período
//   ?acao=reserva&inicio=AAAA-MM-DD&fim=…      reservas com DATA DA RESERVA no período
//   ?acao=historico                            agregado mensal (média histórica e ano anterior)

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { isUnitAllowed } from '@/lib/units'

// Configurar na Vercel (Settings > Environment Variables):
//   RESERVAS_GAS_URL -> URL /exec da implantação Web App do Reservas.gs
//   RESERVAS_GAS_KEY -> mesmo valor da propriedade API_KEY do script
const GAS_URL = process.env.RESERVAS_GAS_URL || ''
const GAS_KEY = process.env.RESERVAS_GAS_KEY || ''

export const maxDuration = 60

type GasResp = { ok?: boolean; erro?: string; status?: number } & Record<string, unknown>
type GasTabela = GasResp & { atualizado?: string; cols: string[]; rows: string[][] }
type GasHistorico = GasResp & {
  gerado?: string; primeiroMes?: string
  criacao?: Record<string, number[]>; reserva?: Record<string, number[]>
}
type GasConfig = GasResp & {
  atualizado?: string; hoje?: string; meses?: string[]; mesesDr?: string[]; unidades?: string[]
  metas?: { mes: string; faixas: number[]; desafio: number | null }[]
  metasSemanais?: { inicio: string; operador: string; base: number; pcts: number[] }[]
}

async function gas<T extends GasResp>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: GAS_KEY })
  const res = await fetch(`${GAS_URL}?${qs.toString()}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
  const text = await res.text()
  let data: T
  try { data = JSON.parse(text) } catch {
    throw new Error(`Resposta inválida do Apps Script (${res.status}): ${text.slice(0, 200)}`)
  }
  if (data?.ok === false || data?.erro) throw new Error(data.erro || 'Erro no Apps Script')
  return data
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

const DESATUALIZADO = 'O Apps Script publicado está desatualizado: no editor do Reservas.gs, vá em Implantar > Gerenciar implantações > editar > Nova versão > Implantar.'

// Linha compacta: [id, unidade*, pessoas, dataCriacao, hora, dataReserva, canal*, origem*, operador*,
//                  time*, contaMeta(0/1), ocasiao*, cardapio*, crianca*, status*, b2b(0/1)]   (* = índice no dicionário)
function compactar(t: GasTabela, permitida: (u: string) => boolean) {
  const i = (n: string) => t.cols.indexOf(n)
  const k = {
    id: i('reservation_id'), u: i('unidade'), p: i('n_pessoas'), dc: i('data_criacao'), h: i('hora_criacao'),
    dr: i('data_reserva'), c: i('canal'), og: i('origem'), op: i('operador_padrao'), oraw: i('operador'),
    t: i('time_operador'), m: i('conta_meta'), oc: i('ocasiao'), cd: i('cardapio'), cr: i('crianca'),
    s: i('status_cod'), b: i('segmento'),
  }
  const dict: string[] = []
  const pos = new Map<string, number>()
  const d = (v: unknown) => {
    const s = String(v ?? '')
    let x = pos.get(s)
    if (x === undefined) { x = dict.length; dict.push(s); pos.set(s, x) }
    return x
  }
  const rows: (string | number)[][] = []
  for (const r of t.rows || []) {
    if (!permitida(r[k.u])) continue
    rows.push([
      r[k.id], d(r[k.u]), Number(r[k.p]) || 0, r[k.dc] || '', r[k.h] || '', String(r[k.dr] || '').slice(0, 10),
      d(r[k.c]), d(r[k.og]), d((k.op >= 0 && r[k.op]) || r[k.oraw]), d(r[k.t]), r[k.m] === 'SIM' ? 1 : 0,
      d(r[k.oc]), d(r[k.cd]), d(r[k.cr]), d(r[k.s]), r[k.b] === 'B2B' ? 1 : 0,
    ])
  }
  return { dict, rows }
}

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'reservas')) return NextResponse.json({ ok: false, erro: 'Acesso negado' }, { status: 403 })
  if (!GAS_URL || !GAS_KEY) {
    return NextResponse.json({ ok: false, erro: 'RESERVAS_GAS_URL / RESERVAS_GAS_KEY não configuradas na Vercel' }, { status: 500 })
  }

  const sp = new URL(req.url).searchParams
  const acao = sp.get('acao') || 'config'
  const restrito = access.lojas !== '*'
  const permitida = (u: string) => !restrito || isUnitAllowed(u, access.lojas)

  try {
    if (acao === 'config') {
      const c = await gas<GasConfig>({ acao: 'config' })
      // versão antiga do script não conhece acao=config e devolve a lista de reservas
      if (!c.hoje || !Array.isArray(c.unidades)) throw new Error(DESATUALIZADO)
      const unidades = (c.unidades || []).filter(permitida)
      if (restrito && !unidades.length) {
        return NextResponse.json({ ok: false, erro: 'Nenhuma unidade liberada para o seu usuário' }, { status: 403 })
      }
      return NextResponse.json({
        ok: true, restrito, atualizado: c.atualizado || '', hoje: c.hoje || '',
        metas: c.metas || [], metasSemanais: c.metasSemanais || [], meses: c.meses || [], mesesDr: c.mesesDr || [], unidades,
      })
    }

    if (acao === 'historico') {
      const h = await gas<GasHistorico>({ acao: 'historico' })
      if (!h.criacao || !h.reserva) throw new Error(DESATUALIZADO)
      // chave = mes|unidade|grupo — remove unidades não liberadas
      const filtra = (o: Record<string, number[]>) =>
        Object.fromEntries(Object.entries(o).filter(([k]) => permitida(k.split('|')[1] || '')))
      return NextResponse.json({
        ok: true, gerado: h.gerado || '', primeiroMes: h.primeiroMes || '',
        criacao: filtra(h.criacao), reserva: filtra(h.reserva),
      })
    }

    if (acao === 'criacao' || acao === 'reserva') {
      const inicio = sp.get('inicio') || ''
      const fim = sp.get('fim') || ''
      if (!ISO.test(inicio) || !ISO.test(fim) || fim < inicio) {
        return NextResponse.json({ ok: false, erro: 'Período inválido' }, { status: 400 })
      }
      const t = await gas<GasTabela>({ acao, inicio, fim })
      if ('meses' in t || !Array.isArray(t.cols)) throw new Error(DESATUALIZADO)
      return NextResponse.json({ ok: true, atualizado: t.atualizado || '', ...compactar(t, permitida) })
    }

    return NextResponse.json({ ok: false, erro: 'Ação inválida' }, { status: 400 })
  } catch (e) {
    const err = e as Error
    const msg = err?.name === 'TimeoutError' ? 'O Apps Script demorou demais para responder — tente de novo' : (err?.message || 'Erro desconhecido')
    return NextResponse.json({ ok: false, erro: msg }, { status: 504 })
  }
}
