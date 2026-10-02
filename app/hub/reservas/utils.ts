// app/hub/reservas/utils.ts
// Tipos, datas, períodos, agregações, export e carregamento de dados da página de Reservas.

import { useEffect, useState } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────
export type Grupo = 'time' | 'online' | 'corp'
export type Linha = {
  id: string; u: string; p: number; dc: string; h: string; dr: string
  c: string; og: string; o: string; t: string; m: boolean
  oc: string; cd: string; cr: string; s: string; b: boolean; g: Grupo
}
export type Meta = { mes: string; faixas: number[]; desafio: number | null }
export type Config = {
  restrito: boolean; atualizado: string; hoje: string
  metas: Meta[]; meses: string[]; mesesDr: string[]; unidades: string[]
}
export type Filtros = { grupos: Grupo[]; unidades: string[] }

export const GRUPOS: { id: Grupo; label: string; cor: string }[] = [
  { id: 'time', label: 'Time de reservas', cor: '#0F766E' },
  { id: 'online', label: 'Online', cor: '#97A624' },
  { id: 'corp', label: 'Corporativo / outros', cor: '#0ea5e9' },
]
export const grupoLabel = (g: Grupo) => GRUPOS.find(x => x.id === g)?.label || g

export const STATUS: { id: string; label: string; cor: string }[] = [
  { id: 'seated', label: 'Sentada', cor: '#97A624' },
  { id: 'confirmed', label: 'Confirmada', cor: '#0F766E' },
  { id: 'pending', label: 'Pendente de confirmação', cor: '#D9B504' },
  { id: 'no-show', label: 'No-show', cor: '#8C1414' },
  { id: 'canceled-user', label: 'Cancelada pelo cliente', cor: '#999' },
  { id: 'canceled-agent', label: 'Cancelada pelo operador', cor: '#BBB' },
]
export const statusLabel = (s: string) => STATUS.find(x => x.id === s)?.label || s || 'Sem status'
export const CANCELADAS = new Set(['canceled-user', 'canceled-agent'])
export const ativa = (r: Linha) => !CANCELADAS.has(r.s)

// ─── Formatação ─────────────────────────────────────────────────────────
const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const decFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const n0 = (v: number) => intFmt.format(v || 0)
export const n1 = (v: number) => decFmt.format(v || 0)
export const pct = (v: number | null) => (v === null || !isFinite(v) ? '—' : `${decFmt.format(v * 100)}%`)
export const nk = (v: number) => (Math.abs(v) >= 1000 ? `${decFmt.format(v / 1000)}k` : intFmt.format(v || 0))
export const variacao = (atual: number, anterior: number) => (anterior ? (atual - anterior) / anterior : null)

// ─── Datas (sempre strings AAAA-MM-DD, sem fuso) ─────────────────────────
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
export const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
export const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`
export const mesCurto = (m: string) => MESES[Number(m.slice(5, 7)) - 1].slice(0, 3)
export const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
export const dataLonga = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`

export function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
export function addDias(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
export function diffDias(a: string, b: string) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)
}
export function diasNoMes(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
export const diaSemana = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay()
export const primeiroDia = (mes: string) => `${mes}-01`
export const ultimoDia = (mes: string) => `${mes}-${String(diasNoMes(mes)).padStart(2, '0')}`
export function addMeses(mes: string, n: number) {
  const [y, m] = mes.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + n, 15))
  return d.toISOString().slice(0, 7)
}
export const segunda = (iso: string) => addDias(iso, -((diaSemana(iso) + 6) % 7))
export function listaDias(ini: string, fim: string) {
  const out: string[] = []
  for (let d = ini; d <= fim; d = addDias(d, 1)) out.push(d)
  return out
}

// ─── Períodos (visões por data de criação) ───────────────────────────────
export type Preset = 'hoje' | 'ontem' | 'semana' | 'semana_ant' | '7d' | '30d' | 'mes' | 'mes_ant' | 'custom'
export const PRESETS: { id: Preset; label: string }[] = [
  { id: 'hoje', label: 'Hoje' }, { id: 'ontem', label: 'Ontem' },
  { id: 'semana', label: 'Semana atual' }, { id: 'semana_ant', label: 'Semana passada' },
  { id: '7d', label: '7 dias' }, { id: '30d', label: '30 dias' },
  { id: 'mes', label: 'Mês atual' }, { id: 'mes_ant', label: 'Mês anterior' },
  { id: 'custom', label: 'Personalizado' },
]
export type Periodo = { inicio: string; fim: string; antInicio: string; antFim: string; label: string; labelAnt: string }

export function calcularPeriodo(p: Preset, hoje: string, cIni: string, cFim: string): Periodo {
  const mk = (inicio: string, fim: string, antInicio: string, antFim: string, labelAnt: string): Periodo => ({
    inicio, fim, antInicio, antFim, labelAnt,
    label: inicio === fim ? dataLonga(inicio) : `${dataCurta(inicio)} a ${dataLonga(fim)}`,
  })
  const mes = hoje.slice(0, 7)
  const mesAnt = addMeses(mes, -1)
  switch (p) {
    case 'hoje': return mk(hoje, hoje, addDias(hoje, -7), addDias(hoje, -7), 'mesmo dia da semana passada')
    case 'ontem': return mk(addDias(hoje, -1), addDias(hoje, -1), addDias(hoje, -8), addDias(hoje, -8), 'mesmo dia da semana passada')
    case 'semana': { const s = segunda(hoje); return mk(s, hoje, addDias(s, -7), addDias(hoje, -7), 'mesmo período da semana passada') }
    case 'semana_ant': { const s = addDias(segunda(hoje), -7); return mk(s, addDias(s, 6), addDias(s, -7), addDias(s, -1), 'semana anterior') }
    case '7d': return mk(addDias(hoje, -6), hoje, addDias(hoje, -13), addDias(hoje, -7), '7 dias anteriores')
    case '30d': return mk(addDias(hoje, -29), hoje, addDias(hoje, -59), addDias(hoje, -30), '30 dias anteriores')
    case 'mes': {
      const dia = Math.min(Number(hoje.slice(8, 10)), diasNoMes(mesAnt))
      return mk(primeiroDia(mes), hoje, primeiroDia(mesAnt), `${mesAnt}-${String(dia).padStart(2, '0')}`, `mesmo período de ${nomeMes(mesAnt)}`)
    }
    case 'mes_ant': {
      const m2 = addMeses(mesAnt, -1)
      return mk(primeiroDia(mesAnt), ultimoDia(mesAnt), primeiroDia(m2), ultimoDia(m2), nomeMes(m2))
    }
    case 'custom': {
      const ini = cIni && cFim && cIni <= cFim ? cIni : primeiroDia(mes)
      const fim = cIni && cFim && cIni <= cFim ? cFim : hoje
      const n = diffDias(ini, fim) + 1
      return mk(ini, fim, addDias(ini, -n), addDias(ini, -1), `${n} dias anteriores`)
    }
  }
}

export type Grao = 'dia' | 'semana' | 'mes'
export function chaveGrao(iso: string, g: Grao) {
  return g === 'dia' ? iso : g === 'semana' ? segunda(iso) : iso.slice(0, 7)
}
export function rotuloGrao(k: string, g: Grao) {
  if (g === 'dia') return `${dataCurta(k)} ${DIAS_SEMANA[diaSemana(k)]}`
  if (g === 'semana') return `sem ${dataCurta(k)}`
  return `${mesCurto(k)}/${k.slice(2, 4)}`
}
export function chavesGrao(ini: string, fim: string, g: Grao) {
  const out: string[] = []
  for (const d of listaDias(ini, fim)) { const k = chaveGrao(d, g); if (out[out.length - 1] !== k) out.push(k) }
  return out
}

// ─── Agregações ─────────────────────────────────────────────────────────
export function aplicarFiltros(l: Linha[], f: Filtros) {
  return l.filter(r => f.grupos.includes(r.g) && (!f.unidades.length || f.unidades.includes(r.u)))
}

export type Resumo = {
  reservas: number; pessoas: number; tam: number; b2b: number; b2bPessoas: number
  sentadas: number; confirmadas: number; pendentes: number; noshow: number; canceladas: number
}
export function resumir(l: Linha[]): Resumo {
  const r: Resumo = { reservas: l.length, pessoas: 0, tam: 0, b2b: 0, b2bPessoas: 0, sentadas: 0, confirmadas: 0, pendentes: 0, noshow: 0, canceladas: 0 }
  for (const x of l) {
    r.pessoas += x.p
    if (x.b) { r.b2b++; r.b2bPessoas += x.p }
    if (x.s === 'seated') r.sentadas++
    else if (x.s === 'confirmed') r.confirmadas++
    else if (x.s === 'pending') r.pendentes++
    else if (x.s === 'no-show') r.noshow++
    else if (CANCELADAS.has(x.s)) r.canceladas++
  }
  r.tam = l.length ? r.pessoas / l.length : 0
  return r
}
export const taxa = (parte: number, total: number) => (total ? parte / total : null)

export function agruparPor<K extends string>(l: Linha[], chave: (r: Linha) => K) {
  const m = new Map<K, Linha[]>()
  for (const r of l) { const k = chave(r); const a = m.get(k); if (a) a.push(r); else m.set(k, [r]) }
  return m
}

// ─── Export Excel ─────────────────────────────────────────────────────────
export async function exportarExcel(nome: string, linhas: Linha[]) {
  if (!linhas.length) { alert('Nada para exportar com os filtros atuais.'); return }
  const XLSX = await import('xlsx')
  const dados = linhas.map(r => ({
    'ID reserva': r.id, Unidade: r.u, 'Data da reserva': r.dr ? dataLonga(r.dr) : '',
    'Data de criação': dataLonga(r.dc), 'Hora de criação': r.h, Pessoas: r.p,
    Grupo: grupoLabel(r.g), 'B2B': r.b ? 'Sim' : 'Não', Canal: r.c, Origem: r.og, Operador: r.o,
    'Time do operador': r.t, 'Conta na meta': r.m ? 'Sim' : 'Não', Ocasião: r.oc, Cardápio: r.cd,
    'Possui criança': r.cr, Status: statusLabel(r.s),
  }))
  const ws = XLSX.utils.json_to_sheet(dados)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Reservas')
  XLSX.writeFile(wb, `${nome}.xlsx`)
}

// ─── Dados (com cache em memória por consulta) ───────────────────────────
type Compacta = { dict: string[]; rows: (string | number)[][]; atualizado?: string }

function descompactar(c: Compacta): Linha[] {
  const d = c.dict
  return c.rows.map(r => {
    const m = r[10] === 1
    const t = d[r[9] as number]
    return {
      id: String(r[0]), u: d[r[1] as number], p: Number(r[2]) || 0, dc: String(r[3]), h: String(r[4]), dr: String(r[5]),
      c: d[r[6] as number], og: d[r[7] as number], o: d[r[8] as number], t, m,
      oc: d[r[11] as number], cd: d[r[12] as number], cr: d[r[13] as number], s: d[r[14] as number], b: r[15] === 1,
      g: m ? 'time' : t === 'Online' ? 'online' : 'corp',
    }
  })
}

async function getJSON<T>(qs: string): Promise<T> {
  const res = await fetch(`/api/reservas?${qs}`, { cache: 'no-store' })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok === false) throw new Error(data?.erro || `Erro ${res.status}`)
  return data as T
}

const cache = new Map<string, Promise<Linha[]>>()

export function carregar(acao: 'criacao' | 'reserva', inicio: string, fim: string, forcar = false) {
  const k = `${acao}|${inicio}|${fim}`
  if (forcar) cache.delete(k)
  let p = cache.get(k)
  if (!p) {
    p = getJSON<Compacta>(new URLSearchParams({ acao, inicio, fim }).toString()).then(descompactar)
    p.catch(() => cache.delete(k))
    cache.set(k, p)
  }
  return p
}

export function limparCache() { cache.clear() }

// Hook: carrega as linhas de um período (sem setState síncrono dentro do efeito)
export function useLinhas(acao: 'criacao' | 'reserva', inicio: string, fim: string, versao = 0) {
  const chave = `${acao}|${inicio}|${fim}|${versao}`
  const [estado, setEstado] = useState<{ chave: string; linhas: Linha[] | null; erro: string }>({ chave: '', linhas: null, erro: '' })
  useEffect(() => {
    if (!inicio || !fim) return
    let vivo = true
    carregar(acao, inicio, fim)
      .then(linhas => { if (vivo) setEstado({ chave, linhas, erro: '' }) })
      .catch(e => { if (vivo) setEstado({ chave, linhas: null, erro: (e as Error).message }) })
    return () => { vivo = false }
  }, [acao, inicio, fim, chave])
  const pronto = estado.chave === chave
  return { linhas: pronto ? estado.linhas : null, erro: pronto ? estado.erro : '', carregando: !pronto }
}

export function useConfig(versao = 0) {
  const [estado, setEstado] = useState<{ v: number; config: Config | null; erro: string }>({ v: -1, config: null, erro: '' })
  useEffect(() => {
    let vivo = true
    getJSON<Config>('acao=config')
      .then(config => { if (vivo) setEstado({ v: versao, config, erro: '' }) })
      .catch(e => { if (vivo) setEstado({ v: versao, config: null, erro: (e as Error).message }) })
    return () => { vivo = false }
  }, [versao])
  return { config: estado.config, erro: estado.erro, carregando: estado.v !== versao }
}
