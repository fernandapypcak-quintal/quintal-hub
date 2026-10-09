// app/hub/reservas/utils.ts
// Tipos, datas, períodos, agregações, export e carregamento de dados da página de Reservas.

import { useEffect, useState } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────
// Origem atual: quem fez a reserva (lista de operadores da aba OPERADORES). Os 3 somam o total.
export type Grupo = 'time' | 'online' | 'corp'
// Para o passado não temos a equipe registrada: o histórico usa atributos da própria reserva
// e cada origem atual é comparada com o equivalente mais próximo (HIST_DE).
export type GrupoHist = 'central' | 'online' | 'b2b'
export const HIST_DE: Record<Grupo, GrupoHist> = { time: 'central', online: 'online', corp: 'b2b' }
export const HIST_LABEL: Record<GrupoHist, string> = { central: 'Central sem B2B', online: 'Online', b2b: 'B2B / corporativo' }
export type Linha = {
  id: string; u: string; p: number; dc: string; h: string; dr: string
  c: string; og: string; o: string; t: string; m: boolean
  oc: string; cd: string; cr: string; s: string; b: boolean; g: Grupo; gh: GrupoHist
}
export type Meta = { mes: string; faixas: number[]; desafio: number | null }
export type MetaSemanal = { inicio: string; operador: string; base: number; pcts: number[] }
export type Config = {
  restrito: boolean; atualizado: string; hoje: string
  metas: Meta[]; metasSemanais: MetaSemanal[]; meses: string[]; mesesDr: string[]; unidades: string[]
}
export type Filtros = { grupos: Grupo[]; unidades: string[] }

export const GRUPOS: { id: Grupo; label: string; cor: string; hist: string }[] = [
  { id: 'time', label: 'Time de reservas', cor: '#0F766E', hist: 'no passado: central sem B2B' },
  { id: 'online', label: 'Online', cor: '#97A624', hist: 'no passado: online' },
  { id: 'corp', label: 'Corporativo / outros', cor: '#0ea5e9', hist: 'no passado: B2B' },
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
export type Periodo = {
  inicio: string; fim: string; label: string
  antInicio: string; antFim: string; labelAnt: string
  anoInicio: string; anoFim: string; labelAno: string
}

// Mesmo dia do ano anterior (29/02 vira 28/02)
export function addAnos(iso: string, n: number) {
  const y = Number(iso.slice(0, 4)) + n
  const m = iso.slice(5, 7)
  const d = Math.min(Number(iso.slice(8, 10)), diasNoMes(`${y}-${m}`))
  return `${y}-${m}-${String(d).padStart(2, '0')}`
}

export function calcularPeriodo(p: Preset, hoje: string, cIni: string, cFim: string): Periodo {
  // ano anterior: períodos curtos alinham o dia da semana (364 dias); meses usam as mesmas datas do calendário
  const semanaAno = (i: string, f: string, labelAno: string) => ({ anoInicio: addDias(i, -364), anoFim: addDias(f, -364), labelAno })
  const calAno = (i: string, f: string, labelAno: string) => ({ anoInicio: addAnos(i, -1), anoFim: addAnos(f, -1), labelAno })
  const mk = (inicio: string, fim: string, antInicio: string, antFim: string, labelAnt: string,
    ano: { anoInicio: string; anoFim: string; labelAno: string }): Periodo => ({
    inicio, fim, antInicio, antFim, labelAnt, ...ano,
    label: inicio === fim ? dataLonga(inicio) : `${dataCurta(inicio)} a ${dataLonga(fim)}`,
  })
  const mes = hoje.slice(0, 7)
  const mesAnt = addMeses(mes, -1)
  switch (p) {
    case 'hoje': return mk(hoje, hoje, addDias(hoje, -7), addDias(hoje, -7), 'mesmo dia da semana passada',
      semanaAno(hoje, hoje, 'mesmo dia da semana do ano passado'))
    case 'ontem': { const o = addDias(hoje, -1); return mk(o, o, addDias(o, -7), addDias(o, -7), 'mesmo dia da semana passada', semanaAno(o, o, 'mesmo dia da semana do ano passado')) }
    case 'semana': { const s = segunda(hoje); return mk(s, hoje, addDias(s, -7), addDias(hoje, -7), 'mesmo período da semana passada', semanaAno(s, hoje, 'mesma semana do ano passado')) }
    case 'semana_ant': { const s = addDias(segunda(hoje), -7); return mk(s, addDias(s, 6), addDias(s, -7), addDias(s, -1), 'semana anterior', semanaAno(s, addDias(s, 6), 'mesma semana do ano passado')) }
    case '7d': return mk(addDias(hoje, -6), hoje, addDias(hoje, -13), addDias(hoje, -7), '7 dias anteriores', semanaAno(addDias(hoje, -6), hoje, 'mesmos 7 dias do ano passado'))
    case '30d': return mk(addDias(hoje, -29), hoje, addDias(hoje, -59), addDias(hoje, -30), '30 dias anteriores', semanaAno(addDias(hoje, -29), hoje, 'mesmos 30 dias do ano passado'))
    case 'mes': {
      const dia = Math.min(Number(hoje.slice(8, 10)), diasNoMes(mesAnt))
      return mk(primeiroDia(mes), hoje, primeiroDia(mesAnt), `${mesAnt}-${String(dia).padStart(2, '0')}`, `mesmo período de ${nomeMes(mesAnt)}`,
        calAno(primeiroDia(mes), hoje, `mesmo período de ${nomeMes(addMeses(mes, -12))}`))
    }
    case 'mes_ant': {
      const m2 = addMeses(mesAnt, -1)
      return mk(primeiroDia(mesAnt), ultimoDia(mesAnt), primeiroDia(m2), ultimoDia(m2), nomeMes(m2),
        calAno(primeiroDia(mesAnt), ultimoDia(mesAnt), nomeMes(addMeses(mesAnt, -12))))
    }
    case 'custom': {
      const ok = cIni && cFim && cIni <= cFim
      const ini = ok ? cIni : primeiroDia(mes)
      const fim = ok ? cFim : hoje
      const n = diffDias(ini, fim) + 1
      return mk(ini, fim, addDias(ini, -n), addDias(ini, -1), `${n} dias anteriores`, calAno(ini, fim, 'mesmo período do ano passado'))
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

// ─── Projeção do mês (média de cada dia da semana nas últimas 4 semanas) ─────
// `linhas` precisa cobrir pelo menos os 28 dias antes de hoje + o mês atual.
// `peso` permite projetar pessoas em vez de reservas.
export function projetarMes(linhas: Linha[], hoje: string, peso: (r: Linha) => number = () => 1) {
  const mes = hoje.slice(0, 7)
  const fimMes = ultimoDia(mes)
  const porData: Record<string, number> = {}
  linhas.forEach(r => { porData[r.dc] = (porData[r.dc] || 0) + peso(r) })
  const realizado = linhas.filter(r => r.dc.startsWith(mes)).reduce((s, r) => s + peso(r), 0)
  const soma = [0, 0, 0, 0, 0, 0, 0], qtd = [0, 0, 0, 0, 0, 0, 0]
  for (let i = 1; i <= 28; i++) { const d = addDias(hoje, -i); soma[diaSemana(d)] += porData[d] || 0; qtd[diaSemana(d)]++ }
  const media = soma.map((x, i) => (qtd[i] ? x / qtd[i] : 0))
  let projecao = realizado + Math.max(0, media[diaSemana(hoje)] - (porData[hoje] || 0))
  for (let d = addDias(hoje, 1); d <= fimMes; d = addDias(d, 1)) projecao += media[diaSemana(d)]
  return { realizado, projecao: Math.round(projecao), ritmo: media.reduce((a, b) => a + b, 0) / 7, diasRestantes: diffDias(hoje, fimMes) + 1 }
}

// ─── Meta semanal (bônus) ─────────────────────────────────────────────────
const normNome = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toUpperCase()

// Meta da semana (segunda) para a operadora: a linha mais recente com início até aquela semana;
// meta própria da operadora tem prioridade sobre a geral (operador vazio).
export function metaSemanalDe(metas: MetaSemanal[], operador: string, semana: string) {
  const validas = (metas || []).filter(m => segunda(m.inicio) <= semana).sort((a, b) => a.inicio.localeCompare(b.inicio))
  const alvo = normNome(operador)
  const propria = validas.filter(m => m.operador && normNome(m.operador) === alvo).pop()
  const geral = validas.filter(m => !m.operador).pop()
  const m = propria || geral
  if (!m) return null
  const pcts = m.pcts.length ? m.pcts : [100, 120, 140]
  return { base: m.base, pcts, faixas: pcts.map(p => Math.floor((m.base * p) / 100)), propria: !!propria }
}

// ─── Agregações ─────────────────────────────────────────────────────────
export function aplicarFiltros(l: Linha[], f: Filtros) {
  return l.filter(r => f.grupos.includes(r.g) && (!f.unidades.length || f.unidades.includes(r.u)))
}
// Para linhas do ano anterior: aplica a origem pelo equivalente histórico (a equipe era outra)
export function aplicarFiltrosHist(l: Linha[], f: Filtros) {
  const hs = f.grupos.map(g => HIST_DE[g])
  return l.filter(r => hs.includes(r.gh) && (!f.unidades.length || f.unidades.includes(r.u)))
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

// ─── Histórico mensal (agregado do Apps Script) ──────────────────────────
// criacao[mes|unidade|grupo] = [reservas, pessoas, b2b]
// reserva[mes|unidade|grupo] = [reservas, pessoas, b2b, canceladas, base, sentadas, noshow]
export type Historico = { gerado: string; primeiroMes: string; criacao: Record<string, number[]>; reserva: Record<string, number[]> }
export type HistMes = { reservas: number; pessoas: number; b2b: number; canceladas: number; base: number; sentadas: number; noshow: number }
const vazio = (): HistMes => ({ reservas: 0, pessoas: 0, b2b: 0, canceladas: 0, base: 0, sentadas: 0, noshow: 0 })

export function histMensal(h: Historico, base: 'criacao' | 'reserva', f: Filtros, casa?: string) {
  const out = new Map<string, HistMes>()
  const hs: string[] = f.grupos.map(g => HIST_DE[g])
  for (const [k, v] of Object.entries(h[base])) {
    const [mes, u, g] = k.split('|')
    if (!hs.includes(g)) continue
    if (f.unidades.length && !f.unidades.includes(u)) continue
    if (casa && u !== casa) continue
    const a = out.get(mes) || vazio()
    a.reservas += v[0] || 0; a.pessoas += v[1] || 0; a.b2b += v[2] || 0
    a.canceladas += v[3] || 0; a.base += v[4] || 0; a.sentadas += v[5] || 0; a.noshow += v[6] || 0
    out.set(mes, a)
  }
  return out
}

// Por casa: Map<unidade, Map<mes, HistMes>>
export function histPorCasa(h: Historico, base: 'criacao' | 'reserva', f: Filtros) {
  const out = new Map<string, Map<string, HistMes>>()
  const hs: string[] = f.grupos.map(g => HIST_DE[g])
  for (const [k, v] of Object.entries(h[base])) {
    const [mes, u, g] = k.split('|')
    if (!hs.includes(g)) continue
    if (f.unidades.length && !f.unidades.includes(u)) continue
    const porMes = out.get(u) || new Map<string, HistMes>()
    const a = porMes.get(mes) || vazio()
    a.reservas += v[0] || 0; a.pessoas += v[1] || 0; a.b2b += v[2] || 0
    a.canceladas += v[3] || 0; a.base += v[4] || 0; a.sentadas += v[5] || 0; a.noshow += v[6] || 0
    porMes.set(mes, a)
    out.set(u, porMes)
  }
  return out
}

// Início do histórico: janeiro do ano passado (meses antes disso têm só reservas soltas na base).
export function inicioHistorico(h: Historico, mesAtual: string) {
  const jan = `${Number(mesAtual.slice(0, 4)) - 1}-01`
  return h.primeiroMes && h.primeiroMes > jan ? h.primeiroMes : jan
}

// Média dos meses FECHADOS (antes do mês atual), a partir de janeiro do ano passado.
// Na base "reserva", se o histórico começa nesse mesmo mês, ele fica de fora
// (reservas daquele mês feitas antes do início da carga não estão na base).
export type MediaHist = { reservas: number; pessoas: number; sentada: number | null; noshow: number | null; meses: number; desde: string }
export function mediaHistorica(mapa: Map<string, HistMes>, h: Historico, base: 'criacao' | 'reserva', mesAtual: string): MediaHist | null {
  if (!h.primeiroMes) return null
  // casa sem reservas num mês conta como zero; começa no 1º mês em que a casa (ou o filtro) teve reserva
  const ini = inicioHistorico(h, mesAtual)
  const comDado = Array.from(mapa.keys()).filter(m => m >= ini && mapa.get(m)!.reservas > 0).sort()
  const inicioBase = base === 'reserva' && ini <= h.primeiroMes ? addMeses(ini, 1) : ini
  const desde = comDado[0] && comDado[0] > inicioBase ? comDado[0] : inicioBase
  const meses: string[] = []
  for (let m = desde; m < mesAtual; m = addMeses(m, 1)) meses.push(m)
  if (!meses.length) return null
  let r = 0, p = 0, b = 0, s = 0, n = 0
  for (const m of meses) { const x = mapa.get(m); if (!x) continue; r += x.reservas; p += x.pessoas; b += x.base; s += x.sentadas; n += x.noshow }
  return { reservas: r / meses.length, pessoas: p / meses.length, sentada: b ? s / b : null, noshow: b ? n / b : null, meses: meses.length, desde }
}

// Existe base para comparar com o ano anterior?
export const temHistoricoDesde = (config: Config, inicio: string) => !!config.meses[0] && inicio >= primeiroDia(config.meses[0])

let cacheHist: Promise<Historico> | null = null
export function useHistorico(versao = 0) {
  const [estado, setEstado] = useState<{ v: number; hist: Historico | null; erro: string }>({ v: -1, hist: null, erro: '' })
  useEffect(() => {
    let vivo = true
    if (!cacheHist) {
      cacheHist = getJSON<Historico>('acao=historico')
      cacheHist.catch(() => { cacheHist = null })
    }
    cacheHist
      .then(hist => { if (vivo) setEstado({ v: versao, hist, erro: '' }) })
      .catch(e => { if (vivo) setEstado({ v: versao, hist: null, erro: (e as Error).message }) })
    return () => { vivo = false }
  }, [versao])
  return { hist: estado.hist, erro: estado.erro }
}

// Exporta o histórico mensal (mês × origem × casa) nas duas bases de data
export async function exportarHistorico(h: Historico, mesAtual: string) {
  const XLSX = await import('xlsx')
  const ini = inicioHistorico(h, mesAtual)
  const linhas = (base: 'criacao' | 'reserva') => Object.entries(h[base])
    .map(([k, v]) => { const [mes, u, g] = k.split('|'); return { mes, u, g: g as GrupoHist, v } })
    .filter(x => x.mes >= ini)
    .sort((a, b) => a.mes.localeCompare(b.mes) || a.u.localeCompare(b.u) || a.g.localeCompare(b.g))
  const criacao = linhas('criacao').map(({ mes, u, g, v }) => ({
    Mês: mes, Origem: HIST_LABEL[g], Unidade: u, Reservas: v[0], Pessoas: v[1], 'Mesa média': v[0] ? +(v[1] / v[0]).toFixed(1) : 0, 'Reservas B2B': v[2],
  }))
  const reserva = linhas('reserva').map(({ mes, u, g, v }) => ({
    Mês: mes, Origem: HIST_LABEL[g], Unidade: u, Reservas: v[0], Pessoas: v[1], 'Mesa média': v[0] ? +(v[1] / v[0]).toFixed(1) : 0,
    'Reservas B2B': v[2], Canceladas: v[3], 'Datas já passadas': v[4], Sentadas: v[5], 'No-show': v[6],
    'Taxa sentada': v[4] ? +(v[5] / v[4]).toFixed(4) : null, 'Taxa no-show': v[4] ? +(v[6] / v[4]).toFixed(4) : null,
  }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(reserva), 'Por data da reserva')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(criacao), 'Por data de criação')
  XLSX.writeFile(wb, `historico_reservas_${ini}_a_${mesAtual}.xlsx`)
}

// ─── Export Excel ─────────────────────────────────────────────────────────
export async function exportarExcel(nome: string, linhas: Linha[]) {
  if (!linhas.length) { alert('Nada para exportar com os filtros atuais.'); return }
  const XLSX = await import('xlsx')
  const dados = linhas.map(r => ({
    'ID reserva': r.id, Unidade: r.u, 'Data da reserva': r.dr ? dataLonga(r.dr) : '',
    'Data de criação': dataLonga(r.dc), 'Hora de criação': r.h, Pessoas: r.p,
    Origem: grupoLabel(r.g), 'B2B': r.b ? 'Sim' : 'Não', 'Canal da central': r.c === 'Painel Operacional' ? 'Sim' : 'Não', Canal: r.c, 'Origem (Get In)': r.og, Operador: r.o,
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
      gh: r[15] === 1 ? 'b2b' : d[r[6] as number] === 'Painel Operacional' ? 'central' : 'online',
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

export function limparCache() { cache.clear(); cacheHist = null }

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
  const desligado = !inicio || !fim
  const pronto = estado.chave === chave
  return { linhas: pronto ? estado.linhas : null, erro: pronto ? estado.erro : '', carregando: !pronto && !desligado }
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
