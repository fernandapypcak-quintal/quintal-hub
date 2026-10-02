// app/api/reservas/route.ts
// Proxy server-side para o Apps Script de Reservas (Reservas.gs — Get In via Grafana).
// - evita CORS e guarda a API_KEY só no servidor
// - junta numa resposta só: reservas do mês + mês anterior, agenda futura, metas e meses disponíveis
// - enxuga as linhas (só os campos que o painel usa)
// - aplica a permissão por unidade: usuário restrito só recebe as casas liberadas

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { isUnitAllowed } from '@/lib/units'

// Configurar na Vercel (Settings > Environment Variables):
//   RESERVAS_GAS_URL -> URL /exec da implantação Web App do Reservas.gs
//   RESERVAS_GAS_KEY -> mesmo valor da propriedade API_KEY do script
const GAS_URL = process.env.RESERVAS_GAS_URL || ''
const GAS_KEY = process.env.RESERVAS_GAS_KEY || ''

export const maxDuration = 60

// Linha enxuta que vai pro navegador
export type LinhaReserva = {
  u: string      // unidade
  p: number      // pessoas
  dc: string     // data de criação (AAAA-MM-DD, horário SP)
  h: string      // hora de criação
  dr: string     // data da reserva
  c: string      // canal
  o: string      // operador (nome padrão)
  t: string      // time do operador: Reservas | Eventos | Online | Não Informado | Não Cadastrado | ...
  m: boolean     // conta na meta
  oc: string     // ocasião
  s: string      // status (código Get In)
  b: boolean     // B2B
}

type GasTabela = { ok?: boolean; erro?: string; status?: number; atualizado?: string; cols: string[]; rows: string[][] }

function enxugar(t: GasTabela): LinhaReserva[] {
  const i = (n: string) => t.cols.indexOf(n)
  const k = {
    u: i('unidade'), p: i('n_pessoas'), dc: i('data_criacao'), h: i('hora_criacao'), dr: i('data_reserva'),
    c: i('canal'), o: i('operador_padrao'), oraw: i('operador'), t: i('time_operador'), m: i('conta_meta'),
    oc: i('ocasiao'), s: i('status_cod'), b: i('segmento'),
  }
  return (t.rows || []).map(r => ({
    u: r[k.u] || '',
    p: Number(r[k.p]) || 0,
    dc: r[k.dc] || '',
    h: r[k.h] || '',
    dr: String(r[k.dr] || '').slice(0, 10),
    c: r[k.c] || '',
    o: (k.o >= 0 && r[k.o]) || r[k.oraw] || '',
    t: r[k.t] || '',
    m: r[k.m] === 'SIM',
    oc: r[k.oc] || '',
    s: r[k.s] || '',
    b: r[k.b] === 'B2B',
  }))
}

async function gas<T>(params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ ...params, key: GAS_KEY })
  const res = await fetch(`${GAS_URL}?${qs.toString()}`, { cache: 'no-store', signal: AbortSignal.timeout(55000) })
  const text = await res.text()
  let data: { ok?: boolean; erro?: string } & Record<string, unknown>
  try { data = JSON.parse(text) } catch {
    throw new Error(`Resposta inválida do Apps Script (${res.status}): ${text.slice(0, 200)}`)
  }
  if (data?.ok === false || data?.erro) throw new Error(data.erro || 'Erro no Apps Script')
  return data as unknown as T
}

function mesAnterior(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 2, 15))
  return d.toISOString().slice(0, 7)
}

function mesAtualSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).format(new Date())
}

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'reservas')) return NextResponse.json({ ok: false, erro: 'Acesso negado' }, { status: 403 })
  if (!GAS_URL || !GAS_KEY) {
    return NextResponse.json({ ok: false, erro: 'RESERVAS_GAS_URL / RESERVAS_GAS_KEY não configuradas na Vercel' }, { status: 500 })
  }

  const pedido = new URL(req.url).searchParams.get('mes') || ''
  const mes = /^\d{4}-\d{2}$/.test(pedido) ? pedido : mesAtualSP()
  const anterior = mesAnterior(mes)

  try {
    const [res, agenda, metas, meses] = await Promise.all([
      gas<GasTabela>({ acao: 'reservas', meses: `${anterior},${mes}` }),
      gas<GasTabela>({ acao: 'agenda' }),
      gas<{ metas: { mes: string; faixas: number[]; desafio: number | null }[] }>({ acao: 'metas' }),
      gas<{ meses: string[] }>({ acao: 'meses' }),
    ])

    const restrito = access.lojas !== '*'
    const filtra = (l: LinhaReserva[]) => (restrito ? l.filter(r => isUnitAllowed(r.u, access.lojas)) : l)

    return NextResponse.json({
      ok: true,
      atualizado: res.atualizado || agenda.atualizado || '',
      mes,
      anterior,
      restrito,
      meses: meses.meses || [],
      meta: (metas.metas || []).find(m => m.mes === mes) || null,
      reservas: filtra(enxugar(res)),
      agenda: filtra(enxugar(agenda)),
    })
  } catch (e) {
    const err = e as Error
    const msg = err?.name === 'TimeoutError' ? 'O Apps Script demorou demais para responder — tente de novo' : (err?.message || 'Erro desconhecido')
    return NextResponse.json({ ok: false, erro: msg }, { status: 504 })
  }
}
