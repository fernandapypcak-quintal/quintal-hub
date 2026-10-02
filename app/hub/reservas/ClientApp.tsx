'use client'

// app/hub/reservas/ClientApp.tsx
// Reservas (Get In) — onepage: meta do time de reservas, KPIs do mês vs mês anterior,
// reservas por dia, operadoras, unidades, antecedência, ocasiões e agenda das casas.
// Dados via /api/reservas (Apps Script Reservas.gs). Toda a agregação é feita aqui.

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

// ─── Tipos ────────────────────────────────────────────────────────────
type Linha = {
  u: string; p: number; dc: string; h: string; dr: string; c: string
  o: string; t: string; m: boolean; oc: string; s: string; b: boolean
}
type Meta = { mes: string; faixas: number[]; desafio: number | null }
type Resp = {
  ok: boolean; atualizado: string; mes: string; anterior: string; restrito: boolean
  meses: string[]; meta: Meta | null; reservas: Linha[]; agenda: Linha[]
}
type Escopo = 'time' | 'todas' | 'online'

// ─── Utilitários ────────────────────────────────────────────────────────
const intFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })
const decFmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const n0 = (v: number) => intFmt.format(v || 0)
const n1 = (v: number) => decFmt.format(v || 0)
const pct = (v: number | null) => (v === null || !isFinite(v) ? '—' : `${decFmt.format(v * 100)}%`)

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const nomeMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]}/${m.slice(0, 4)}`
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`

function hojeSP() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date())
}
function addDias(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function diffDias(a: string, b: string) {
  return Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000)
}
function diasNoMes(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}
const diaSemana = (iso: string) => new Date(iso + 'T12:00:00Z').getUTCDay()
const dia = (iso: string) => Number(iso.slice(8, 10))

const CANCELADAS = new Set(['canceled-user', 'canceled-agent'])
const CONFIRMADAS = new Set(['confirmed', 'seated'])

function variacao(atual: number, anterior: number) {
  return anterior ? (atual - anterior) / anterior : null
}

// ─── Estilo ─────────────────────────────────────────────────────────────
const C = {
  borda: '#EBEBEB', bordaForte: '#1a1a1a', texto: '#1a1a1a', suave: '#888', muito: '#BBB',
  verde: '#97A624', verdeFundo: '#F4F6E6', vermelho: '#8C1414', vermelhoFundo: '#FBEFEF', fundo: '#FAFAF8',
  azul: '#0F766E', azulFundo: '#E6F2F1', amarelo: '#D9B504', b2b: '#0ea5e9',
}
const MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 10 }
const pill = (ativo: boolean): React.CSSProperties => ({
  height: 30, padding: '0 12px', borderRadius: 99, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
  border: `1px solid ${ativo ? C.bordaForte : '#E8E8E8'}`, background: '#fff',
  color: ativo ? C.texto : '#666', fontWeight: ativo ? 600 : 400, outline: 'none', whiteSpace: 'nowrap',
})
const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: C.suave, padding: '9px 12px',
  borderBottom: `1px solid ${C.borda}`, background: '#fff', whiteSpace: 'nowrap',
}
const thNum: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { fontSize: 13, padding: '8px 12px', borderBottom: '1px solid #F3F3F3' }
const tdNum: React.CSSProperties = { ...td, ...MONO, textAlign: 'right', whiteSpace: 'nowrap' }

// ─── Componentes pequenos ───────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E8E8E8', borderTopColor: C.texto, borderRadius: '50%', animation: 'rspin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#999' }}>Carregando reservas...</div>
      <style>{`@keyframes rspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'info'; children: React.ReactNode }) {
  const erro = tipo === 'erro'
  return (
    <div style={{ fontSize: 13, padding: '10px 14px', borderRadius: 8, background: erro ? C.vermelhoFundo : '#F5F5F2', color: erro ? C.vermelho : '#555' }}>
      {children}
    </div>
  )
}

function Var({ v, inverso = false }: { v: number | null; inverso?: boolean }) {
  if (v === null || !isFinite(v)) return <span style={{ color: C.muito }}>—</span>
  const bom = inverso ? v < 0 : v > 0
  const cor = Math.abs(v) < 0.005 ? C.suave : bom ? C.verde : C.vermelho
  return <span style={{ ...MONO, color: cor }}>{v > 0 ? '▲' : v < 0 ? '▼' : ''} {pct(Math.abs(v))}</span>
}

function Secao({ titulo, sub, children, direita }: { titulo: string; sub?: string; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <section style={{ ...card, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div>
          {sub && <div style={{ fontSize: 12, color: C.suave, marginTop: 2 }}>{sub}</div>}
        </div>
        {direita}
      </div>
      {children}
    </section>
  )
}

function Kpi({ label, valor, anterior, v, inverso }: { label: string; valor: string; anterior?: string; v?: number | null; inverso?: boolean }) {
  return (
    <div style={{ ...card, padding: '14px 16px' }}>
      <div style={{ fontSize: 12, color: C.suave }}>{label}</div>
      <div style={{ ...MONO, fontSize: 26, fontWeight: 500, marginTop: 4, letterSpacing: -0.5 }}>{valor}</div>
      {anterior !== undefined && (
        <div style={{ fontSize: 12, color: C.suave, marginTop: 4, display: 'flex', gap: 8 }}>
          <span>ant. <span style={MONO}>{anterior}</span></span>
          <Var v={v ?? null} inverso={inverso} />
        </div>
      )}
    </div>
  )
}

function BarraH({ label, valor, max, texto, cor = C.azul }: { label: string; valor: number; max: number; texto: string; cor?: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr 90px', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '4px 0' }}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</div>
      <div style={{ background: '#F3F3F0', borderRadius: 4, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${max ? (valor / max) * 100 : 0}%`, height: '100%', background: cor, borderRadius: 4 }} />
      </div>
      <div style={{ ...MONO, textAlign: 'right' }}>{texto}</div>
    </div>
  )
}

// ─── Meta ────────────────────────────────────────────────────────────────
function BlocoMeta({ dados, hoje }: { dados: Resp; hoje: string }) {
  const { mes, meta } = dados
  const ehAtual = mes === hoje.slice(0, 7)
  const ultimoDia = `${mes}-${String(diasNoMes(mes)).padStart(2, '0')}`

  const calc = useMemo(() => {
    const doTime = dados.reservas.filter(r => r.m)
    const doMes = doTime.filter(r => r.dc.startsWith(mes))
    const realizado = doMes.length
    const hojeQtd = doMes.filter(r => r.dc === hoje).length

    // Média por dia da semana nos últimos 28 dias completos (4 de cada)
    const porData: Record<string, number> = {}
    doTime.forEach(r => { porData[r.dc] = (porData[r.dc] || 0) + 1 })
    const somaDow = [0, 0, 0, 0, 0, 0, 0]
    const qtdDow = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 1; i <= 28; i++) {
      const d = addDias(hoje, -i)
      somaDow[diaSemana(d)] += porData[d] || 0
      qtdDow[diaSemana(d)] += 1
    }
    const mediaDow = somaDow.map((s, i) => (qtdDow[i] ? s / qtdDow[i] : 0))
    const ritmoAtual = mediaDow.reduce((a, b) => a + b, 0) / 7

    let projecao = realizado
    let diasRestantes = 0
    if (ehAtual) {
      projecao += Math.max(0, mediaDow[diaSemana(hoje)] - hojeQtd)
      for (let d = addDias(hoje, 1); d <= ultimoDia; d = addDias(d, 1)) projecao += mediaDow[diaSemana(d)]
      diasRestantes = diffDias(hoje, ultimoDia) + 1
    }
    return { realizado, projecao: Math.round(projecao), diasRestantes, ritmoAtual }
  }, [dados, mes, hoje, ehAtual, ultimoDia])

  if (!meta) {
    return (
      <Secao titulo={`Meta do time de reservas — ${nomeMes(mes)}`}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
          <span style={{ ...MONO, fontSize: 34 }}>{n0(calc.realizado)}</span>
          <span style={{ color: C.suave, fontSize: 13 }}>reservas do time no mês</span>
        </div>
        <Aviso tipo="info">Sem meta cadastrada para {nomeMes(mes)}. Preencha a aba METAS da planilha de reservas.</Aviso>
      </Secao>
    )
  }

  const faixas = [...meta.faixas].sort((a, b) => a - b)
  const marcos = [
    ...faixas.map((v, i) => ({ v, label: `Faixa ${i + 1}`, desafio: false })),
    ...(meta.desafio ? [{ v: meta.desafio, label: 'Desafio', desafio: true }] : []),
  ].sort((a, b) => a.v - b.v)
  const topo = Math.max(...marcos.map(m => m.v), calc.projecao, calc.realizado) * 1.06
  const proximo = marcos.find(m => m.v > calc.realizado)
  const atingidos = marcos.filter(m => m.v <= calc.realizado)
  const necessario = proximo && calc.diasRestantes ? (proximo.v - calc.realizado) / calc.diasRestantes : null
  const projAting = [...marcos].reverse().find(m => m.v <= calc.projecao)

  return (
    <Secao
      titulo={`Meta do time de reservas — ${nomeMes(mes)}`}
      sub={`Reservas criadas pelo time, todas as casas${dados.restrito ? ' liberadas para você' : ''}`}
    >
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 28, alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: C.suave }}>Realizado</div>
          <div style={{ ...MONO, fontSize: 38, letterSpacing: -1 }}>{n0(calc.realizado)}</div>
          <div style={{ fontSize: 12, color: C.suave }}>{pct(faixas[0] ? calc.realizado / faixas[0] : null)} da faixa 1</div>
        </div>
        {ehAtual && (
          <div>
            <div style={{ fontSize: 12, color: C.suave }}>Projeção de fechamento</div>
            <div style={{ ...MONO, fontSize: 26, color: projAting ? C.verde : C.vermelho }}>{n0(calc.projecao)}</div>
            <div style={{ fontSize: 12, color: C.suave }}>{projAting ? `bate ${projAting.label.toLowerCase()}` : 'abaixo da faixa 1'}</div>
          </div>
        )}
        {ehAtual && proximo && (
          <div>
            <div style={{ fontSize: 12, color: C.suave }}>Ritmo necessário p/ {proximo.label.toLowerCase()}</div>
            <div style={{ ...MONO, fontSize: 26 }}>{n1(necessario || 0)}<span style={{ fontSize: 13, color: C.suave }}>/dia</span></div>
            <div style={{ fontSize: 12, color: C.suave }}>
              ritmo atual <span style={MONO}>{n1(calc.ritmoAtual)}</span>/dia · faltam {n0(proximo.v - calc.realizado)} em {calc.diasRestantes} dias
            </div>
          </div>
        )}
        {atingidos.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {atingidos.map(m => (
              <span key={m.label} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99, background: m.desafio ? '#FFF6D6' : C.verdeFundo, color: m.desafio ? '#8A6D00' : '#5d6a10', fontWeight: 600 }}>
                ✓ {m.label}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Barra de progresso com marcos */}
      <div style={{ position: 'relative', height: 64, marginTop: 6 }}>
        <div style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 16, background: '#F1F1EC', borderRadius: 99, overflow: 'hidden' }}>
          {ehAtual && calc.projecao > calc.realizado && (
            <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(calc.projecao / topo) * 100}%`, background: 'repeating-linear-gradient(45deg,#E2E8C6,#E2E8C6 6px,#EEF2DA 6px,#EEF2DA 12px)' }} />
          )}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(calc.realizado / topo) * 100}%`, background: C.verde, borderRadius: 99 }} />
        </div>
        {marcos.map(m => (
          <div key={m.label} style={{ position: 'absolute', left: `${(m.v / topo) * 100}%`, top: 0, transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: m.desafio ? '#8A6D00' : C.suave, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</div>
            <div style={{ width: 2, height: 26, background: m.desafio ? C.amarelo : C.texto, margin: '2px auto 0' }} />
            <div style={{ ...MONO, fontSize: 11, color: C.suave }}>{n0(m.v)}</div>
          </div>
        ))}
      </div>
    </Secao>
  )
}

// ─── Página ─────────────────────────────────────────────────────────────
export default function ReservasClientApp() {
  const [mes, setMes] = useState('')
  const [dados, setDados] = useState<Resp | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [escopo, setEscopo] = useState<Escopo>('time')
  const [unidades, setUnidades] = useState<string[]>([])

  const hoje = hojeSP()

  useEffect(() => {
    const ctrl = new AbortController()
    const qs = mes ? `?mes=${mes}` : ''
    fetch(`/api/reservas${qs}`, { cache: 'no-store', signal: ctrl.signal })
      .then(async r => {
        const d = await r.json().catch(() => null)
        if (!r.ok || !d || d.ok === false) throw new Error(d?.erro || `Erro ${r.status}`)
        setDados(d as Resp)
        if (!mes) setMes((d as Resp).mes)
      })
      .catch(e => { if (e.name !== 'AbortError') setErro(e.message) })
      .finally(() => setCarregando(false))
    return () => ctrl.abort()
  }, [mes])

  const calc = useMemo(() => {
    if (!dados) return null
    const { mes: m, anterior } = dados
    const ehAtual = m === hoje.slice(0, 7)
    const corte = ehAtual ? dia(hoje) : diasNoMes(m)
    const corteAnt = Math.min(corte, diasNoMes(anterior))

    const porUnidade = (r: Linha) => !unidades.length || unidades.includes(r.u)
    const noEscopo = (r: Linha) => (escopo === 'time' ? r.m : escopo === 'online' ? r.t === 'Online' : true)
    const base = dados.reservas.filter(r => porUnidade(r))

    const atual = base.filter(r => r.dc.startsWith(m) && dia(r.dc) <= corte && noEscopo(r))
    const ant = base.filter(r => r.dc.startsWith(anterior) && dia(r.dc) <= corteAnt && noEscopo(r))

    const resumo = (l: Linha[]) => {
      const pessoas = l.reduce((s, r) => s + r.p, 0)
      return {
        reservas: l.length, pessoas, tam: l.length ? pessoas / l.length : 0,
        conf: l.length ? l.filter(r => CONFIRMADAS.has(r.s)).length / l.length : null,
        canc: l.length ? l.filter(r => CANCELADAS.has(r.s)).length / l.length : null,
        noshow: l.length ? l.filter(r => r.s === 'no-show').length / l.length : null,
      }
    }

    // Por dia (mês inteiro, anterior alinhado pelo dia do mês)
    const nDias = diasNoMes(m)
    const contDia = (l: Linha[]) => { const c: Record<number, number> = {}; l.forEach(r => { c[dia(r.dc)] = (c[dia(r.dc)] || 0) + 1 }); return c }
    const cAt = contDia(base.filter(r => r.dc.startsWith(m) && noEscopo(r)))
    const cAn = contDia(base.filter(r => r.dc.startsWith(anterior) && noEscopo(r)))
    const porDia = Array.from({ length: nDias }, (_, i) => {
      const d = i + 1
      const iso = `${m}-${String(d).padStart(2, '0')}`
      return {
        d, rotulo: `${String(d).padStart(2, '0')} ${DIAS_SEMANA[diaSemana(iso)]}`,
        atual: ehAtual && d > corte ? null : (cAt[d] || 0),
        anterior: d <= diasNoMes(anterior) ? (cAn[d] || 0) : null,
      }
    })

    // Operadoras do time
    const timeAt = base.filter(r => r.dc.startsWith(m) && dia(r.dc) <= corte && r.m)
    const timeAn = base.filter(r => r.dc.startsWith(anterior) && dia(r.dc) <= corteAnt && r.m)
    const nomesOp = Array.from(new Set(timeAt.map(r => r.o).concat(timeAn.map(r => r.o))))
    const operadoras = nomesOp.map(o => {
      const a = timeAt.filter(r => r.o === o)
      const b = timeAn.filter(r => r.o === o)
      return { o, ...resumo(a), ant: b.length }
    }).sort((x, y) => y.reservas - x.reservas)

    // Unidades
    const nomesUn = Array.from(new Set(dados.reservas.map(r => r.u))).sort((a, b) => a.localeCompare(b))
    const porUnid = nomesUn.filter(u => !unidades.length || unidades.includes(u)).map(u => {
      const a = atual.filter(r => r.u === u)
      return { u, ...resumo(a), ant: ant.filter(r => r.u === u).length, b2b: a.filter(r => r.b).length }
    }).sort((x, y) => y.reservas - x.reservas)

    // Antecedência
    const faixasAnt = [
      { label: 'Mesmo dia', min: -9999, max: 0 }, { label: '1 a 3 dias', min: 1, max: 3 },
      { label: '4 a 7 dias', min: 4, max: 7 }, { label: '8 a 14 dias', min: 8, max: 14 },
      { label: '15 a 30 dias', min: 15, max: 30 }, { label: 'Mais de 30 dias', min: 31, max: 99999 },
    ]
    const comData = atual.filter(r => r.dr)
    const antecedencia = faixasAnt.map(f => ({
      label: f.label,
      qtd: comData.filter(r => { const x = diffDias(r.dc, r.dr); return x >= f.min && x <= f.max }).length,
    }))
    const mediaAntecedencia = comData.length ? comData.reduce((s, r) => s + Math.max(0, diffDias(r.dc, r.dr)), 0) / comData.length : 0

    // Ocasiões (só existem nas reservas da central)
    const contOc: Record<string, number> = {}
    atual.filter(r => r.oc && r.oc !== 'Não Informado').forEach(r => { contOc[r.oc] = (contOc[r.oc] || 0) + 1 })
    const ocasioes = Object.entries(contOc).sort((a, b) => b[1] - a[1]).slice(0, 10)
    const semOcasiao = atual.filter(r => !r.oc || r.oc === 'Não Informado').length

    // Agenda: próximos 14 dias, sem canceladas, todas as origens
    const fimAgenda = addDias(hoje, 13)
    const ag = dados.agenda.filter(r => porUnidade(r) && r.dr >= hoje && r.dr <= fimAgenda && !CANCELADAS.has(r.s))
    const datasAg = Array.from({ length: 14 }, (_, i) => addDias(hoje, i))
    const unAg = nomesUn.filter(u => !unidades.length || unidades.includes(u))
    const celula: Record<string, { p: number; r: number; b2b: number }> = {}
    ag.forEach(r => {
      const k = r.dr + '|' + r.u
      const c = celula[k] || (celula[k] = { p: 0, r: 0, b2b: 0 })
      c.p += r.p; c.r += 1; if (r.b) c.b2b += r.p
    })
    const maxCel = Math.max(1, ...Object.values(celula).map(c => c.p))

    return {
      ehAtual, corte, corteAnt, resAt: resumo(atual), resAn: resumo(ant), porDia, operadoras, porUnid,
      antecedencia, mediaAntecedencia, ocasioes, semOcasiao, totalAtual: atual.length,
      datasAg, unAg, celula, maxCel, nomesUn,
    }
  }, [dados, escopo, unidades, hoje])

  // ─── Render ───
  const topo = (
    <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
      <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">← Voltar ao HUB</Link>
      <span className="text-zinc-700 text-xs">|</span>
      <span className="text-xs text-zinc-500">Reservas</span>
    </div>
  )

  if (erro && !dados) {
    return (
      <div style={{ minHeight: '100vh', background: C.fundo }}>{topo}
        <div style={{ maxWidth: 560, margin: '60px auto', padding: 20 }}><Aviso>Não foi possível abrir o painel: {erro}</Aviso></div>
      </div>
    )
  }
  if (!dados || !calc) return <div style={{ minHeight: '100vh', background: C.fundo, display: 'flex', flexDirection: 'column' }}>{topo}<Spinner /></div>

  const rotEscopo = escopo === 'time' ? 'time de reservas' : escopo === 'online' ? 'online' : 'todas as origens'
  const periodoTxt = calc.ehAtual
    ? `1 a ${calc.corte} de ${nomeMes(dados.mes)} vs 1 a ${calc.corteAnt} de ${nomeMes(dados.anterior)}`
    : `${nomeMes(dados.mes)} vs ${nomeMes(dados.anterior)}`
  const maxAnt = Math.max(1, ...calc.antecedencia.map(a => a.qtd))
  const maxOc = Math.max(1, ...calc.ocasioes.map(o => o[1]))
  const mesesOpc = Array.from(new Set([...dados.meses, dados.mes])).sort().reverse()

  return (
    <div style={{ minHeight: '100vh', background: C.fundo, display: 'flex', flexDirection: 'column' }}>
      {topo}

      {/* Cabeçalho + filtros */}
      <header style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '14px 24px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Reservas</h1>
            <span style={{ fontSize: 12, color: C.suave }}>
              Get In · atualizado {dados.atualizado ? `${dataCurta(dados.atualizado.slice(0, 10))} às ${dados.atualizado.slice(11, 16)}` : '—'}
              {carregando && ' · carregando…'}
            </span>
          </div>
          <select value={dados.mes} onChange={e => { setCarregando(true); setErro(''); setMes(e.target.value) }}
            style={{ ...pill(true), paddingRight: 8, appearance: 'auto' }}>
            {mesesOpc.map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {(['time', 'todas', 'online'] as Escopo[]).map(e => (
            <button key={e} onClick={() => setEscopo(e)} style={pill(escopo === e)}>
              {e === 'time' ? 'Time de reservas' : e === 'todas' ? 'Todas as origens' : 'Online'}
            </button>
          ))}
          <span style={{ width: 1, height: 20, background: '#E8E8E8', margin: '0 6px' }} />
          <button onClick={() => setUnidades([])} style={pill(!unidades.length)}>Todas as casas</button>
          {calc.nomesUn.map(u => (
            <button key={u} style={pill(unidades.includes(u))}
              onClick={() => setUnidades(s => (s.includes(u) ? s.filter(x => x !== u) : [...s, u]))}>{u}</button>
          ))}
        </div>
        {erro && <div style={{ marginTop: 10 }}><Aviso>{erro}</Aviso></div>}
      </header>

      <main style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, width: '100%', margin: '0 auto' }}>
        <BlocoMeta dados={dados} hoje={hoje} />

        {/* KPIs */}
        <div>
          <div style={{ fontSize: 12, color: C.suave, marginBottom: 8 }}>Reservas criadas · {rotEscopo} · {periodoTxt}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
            <Kpi label="Reservas" valor={n0(calc.resAt.reservas)} anterior={n0(calc.resAn.reservas)} v={variacao(calc.resAt.reservas, calc.resAn.reservas)} />
            <Kpi label="Pessoas" valor={n0(calc.resAt.pessoas)} anterior={n0(calc.resAn.pessoas)} v={variacao(calc.resAt.pessoas, calc.resAn.pessoas)} />
            <Kpi label="Tamanho médio de mesa" valor={n1(calc.resAt.tam)} anterior={n1(calc.resAn.tam)} v={variacao(calc.resAt.tam, calc.resAn.tam)} />
            <Kpi label="Confirmadas / sentadas" valor={pct(calc.resAt.conf)} anterior={pct(calc.resAn.conf)} />
            <Kpi label="Canceladas" valor={pct(calc.resAt.canc)} anterior={pct(calc.resAn.canc)} />
            <Kpi label="No-show" valor={pct(calc.resAt.noshow)} anterior={pct(calc.resAn.noshow)} />
          </div>
        </div>

        {/* Por dia */}
        <Secao titulo="Reservas criadas por dia" sub={`${rotEscopo} · barras ${nomeMes(dados.mes)}, linha ${nomeMes(dados.anterior)} (mesmo dia do mês)`}>
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={calc.porDia} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#F1F1F1" vertical={false} />
                <XAxis dataKey="rotulo" tick={{ fontSize: 10, fill: '#999' }} interval={1} tickLine={false} axisLine={{ stroke: '#E8E8E8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.borda}` }}
                  formatter={(v, name) => [n0(Number(v)), name === 'atual' ? nomeMes(dados.mes) : nomeMes(dados.anterior)]}
                />
                <Bar dataKey="atual" fill={C.azul} radius={[3, 3, 0, 0]} maxBarSize={22} />
                <Line dataKey="anterior" stroke="#BBB" strokeWidth={2} dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Secao>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 16 }}>
          {/* Operadoras */}
          <Secao titulo="Time de reservas — contribuição para a meta" sub={periodoTxt}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Operadora</th><th style={thNum}>Reservas</th><th style={thNum}>% do time</th>
                  <th style={thNum}>Pessoas</th><th style={thNum}>vs ant.</th><th style={thNum}>Confirm.</th><th style={thNum}>No-show</th>
                </tr></thead>
                <tbody>
                  {calc.operadoras.map(o => {
                    const totTime = calc.operadoras.reduce((s, x) => s + x.reservas, 0)
                    return (
                      <tr key={o.o}>
                        <td style={td}>{o.o}</td>
                        <td style={tdNum}>{n0(o.reservas)}</td>
                        <td style={tdNum}>{pct(totTime ? o.reservas / totTime : null)}</td>
                        <td style={tdNum}>{n0(o.pessoas)}</td>
                        <td style={tdNum}><Var v={variacao(o.reservas, o.ant)} /></td>
                        <td style={tdNum}>{pct(o.conf)}</td>
                        <td style={tdNum}>{pct(o.noshow)}</td>
                      </tr>
                    )
                  })}
                  {!calc.operadoras.length && <tr><td style={{ ...td, color: C.suave }} colSpan={7}>Nenhuma reserva do time no período.</td></tr>}
                </tbody>
              </table>
            </div>
          </Secao>

          {/* Unidades */}
          <Secao titulo="Por unidade" sub={`${rotEscopo} · ${periodoTxt}`}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Unidade</th><th style={thNum}>Reservas</th><th style={thNum}>vs ant.</th>
                  <th style={thNum}>Pessoas</th><th style={thNum}>Mesa média</th><th style={thNum}>B2B</th>
                </tr></thead>
                <tbody>
                  {calc.porUnid.map(u => (
                    <tr key={u.u}>
                      <td style={td}>{u.u}</td>
                      <td style={tdNum}>{n0(u.reservas)}</td>
                      <td style={tdNum}><Var v={variacao(u.reservas, u.ant)} /></td>
                      <td style={tdNum}>{n0(u.pessoas)}</td>
                      <td style={tdNum}>{n1(u.tam)}</td>
                      <td style={{ ...tdNum, color: u.b2b ? C.b2b : C.muito }}>{n0(u.b2b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Secao>

          {/* Antecedência */}
          <Secao titulo="Antecedência" sub={`Dias entre a criação e a data da reserva · média ${n1(calc.mediaAntecedencia)} dias`}>
            {calc.antecedencia.map(a => (
              <BarraH key={a.label} label={a.label} valor={a.qtd} max={maxAnt}
                texto={`${n0(a.qtd)} · ${pct(calc.totalAtual ? a.qtd / calc.totalAtual : null)}`} />
            ))}
          </Secao>

          {/* Ocasiões */}
          <Secao titulo="Ocasiões" sub={`Só reservas feitas pela central têm ocasião · ${n0(calc.semOcasiao)} sem ocasião no período`}>
            {calc.ocasioes.length
              ? calc.ocasioes.map(([oc, q]) => <BarraH key={oc} label={oc} valor={q} max={maxOc} texto={n0(q)} cor={C.verde} />)
              : <div style={{ fontSize: 13, color: C.suave }}>Nenhuma ocasião informada no período.</div>}
          </Secao>
        </div>

        {/* Agenda */}
        <Secao titulo="Agenda das casas — próximos 14 dias"
          sub="Pessoas reservadas por data da reserva, todas as origens, sem canceladas · em azul, quanto é B2B">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', minWidth: '100%' }}>
              <thead><tr>
                <th style={th}>Data</th>
                {calc.unAg.map(u => <th key={u} style={thNum}>{u}</th>)}
                <th style={thNum}>Total</th>
              </tr></thead>
              <tbody>
                {calc.datasAg.map(d => {
                  const fds = [0, 5, 6].includes(diaSemana(d))
                  let tot = 0, totB2b = 0
                  return (
                    <tr key={d}>
                      <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: fds ? 600 : 400 }}>
                        {dataCurta(d)} <span style={{ color: C.suave }}>{DIAS_SEMANA[diaSemana(d)]}</span>
                      </td>
                      {calc.unAg.map(u => {
                        const c = calc.celula[d + '|' + u]
                        if (c) { tot += c.p; totB2b += c.b2b }
                        const alfa = c ? 0.08 + 0.5 * (c.p / calc.maxCel) : 0
                        return (
                          <td key={u} title={c ? `${c.r} reservas` : ''} style={{ ...tdNum, background: c ? `rgba(15,118,110,${alfa})` : undefined }}>
                            {c ? n0(c.p) : <span style={{ color: '#DDD' }}>·</span>}
                            {c && c.b2b > 0 && <div style={{ fontSize: 10.5, color: C.b2b }}>{n0(c.b2b)} B2B</div>}
                          </td>
                        )
                      })}
                      <td style={{ ...tdNum, fontWeight: 600 }}>
                        {n0(tot)}
                        {totB2b > 0 && <div style={{ fontSize: 10.5, color: C.b2b, fontWeight: 400 }}>{n0(totB2b)} B2B</div>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Secao>
      </main>
    </div>
  )
}
