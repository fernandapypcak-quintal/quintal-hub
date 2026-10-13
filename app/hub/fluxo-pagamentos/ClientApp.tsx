'use client'

// app/hub/fluxo-pagamentos/ClientApp.tsx
// Fluxo de Pagamentos — pagamentos operacionais por dia, pago (realizado) x a pagar (projeção).
// Mesmo layout do Comercial: sidebar (desktop) / bottom nav (mobile), topbar do HUB, header verde com selects.
// Dados: /api/fluxo-pagamentos (bloco FDIARIO do Painel de Caixa & Forecast).

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'

// ---------------------------------------------------------------- tipos
type MesDados = { datas: string[]; pago: Record<string, number[]>; aPagar: Record<string, number[]> }
type Resposta = {
  ok: boolean; erro?: string; fonte: string; atualizado: string
  meses: string[]; categorias: string[]; unidades: string[]
  corte: Record<string, string>
  dados: Record<string, Record<string, MesDados>>
}
type Dia = { d: string; pago: number; aPagar: number; cat: Record<string, { p: number; a: number }> }
type Aba = 'resumo' | 'calendario' | 'agenda' | 'casas'

const ABAS: { id: Aba; icon: string; label: string; curto: string }[] = [
  { id: 'resumo', icon: '🏠', label: 'Resumo', curto: 'Resumo' },
  { id: 'calendario', icon: '📅', label: 'Fluxo diário', curto: 'Diário' },
  { id: 'agenda', icon: '🗓️', label: 'Agenda a pagar', curto: 'Agenda' },
  { id: 'casas', icon: '🏪', label: 'Por casa', curto: 'Casas' },
]

// ---------------------------------------------------------------- estilo
const C = {
  borda: '#EBEBEB', texto: '#1a1a1a', suave: '#888', muito: '#BBB', fundo: '#FAFAF8', zebra: '#F8F8F4',
  pago: '#3E5A18', pagoFundo: '#EEF4DF', aPagar: '#C98A00', aPagarFundo: '#FFF6DC', vermelho: '#8C1414',
}
const MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 10 }
const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: C.suave, padding: '9px 12px',
  borderBottom: `1px solid ${C.borda}`, background: '#fff', whiteSpace: 'nowrap',
}
const thNum: React.CSSProperties = { ...th, textAlign: 'right' }
const td: React.CSSProperties = { fontSize: 13, padding: '8px 12px', borderBottom: '1px solid #F3F3F3' }
const tdNum: React.CSSProperties = { ...td, ...MONO, textAlign: 'right', whiteSpace: 'nowrap' }
const selectStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 12,
  background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
}
const opt: React.CSSProperties = { color: '#0D0F14' }
const botao = (ativo = false): React.CSSProperties => ({
  height: 30, padding: '0 12px', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
  border: `1px solid ${ativo ? C.texto : '#E2E2E2'}`, background: ativo ? C.texto : '#fff',
  color: ativo ? '#fff' : '#555', fontWeight: 500, whiteSpace: 'nowrap',
})

// ---------------------------------------------------------------- formatação
const z = (v: number) => Math.abs(v) < 0.005
const fmt = (v: number) => {
  if (z(v)) return '—'
  const s = Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
  return v < 0 ? `(${s})` : s
}
const fmtR = (v: number) => (v < 0 ? '-' : '') + 'R$ ' + Math.abs(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })
const fmtK = (v: number) => {
  const a = Math.abs(v), sinal = v < 0 ? '-' : ''
  const um = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  if (a >= 1e6) return `${sinal}R$ ${um(a / 1e6)}M`
  if (a >= 1e3) return `${sinal}R$ ${um(a / 1e3)}k`
  return `${sinal}R$ ${a.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}
const pct = (v: number) => (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
const br = (d: string) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}` : '—')
const SEM = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const diaSem = (d: string) => new Date(d + 'T12:00:00').getDay()
const fimDeSemana = (d: string) => { const w = diaSem(d); return w === 0 || w === 6 }
const somaDias = (d: string, n: number) => {
  const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n)
  return x.toISOString().slice(0, 10)
}
const MES_CURTO: Record<string, string> = { Setembro: 'Set', Outubro: 'Out', Novembro: 'Nov', Dezembro: 'Dez' }

// ---------------------------------------------------------------- dados
function linhaDoTempo(r: Resposta, unidade: string, meses: string[]): Dia[] {
  const out: Dia[] = []
  meses.forEach(m => {
    const x = r.dados[unidade]?.[m]
    if (!x) return
    x.datas.forEach((d, i) => {
      const cat: Dia['cat'] = {}
      let p = 0, a = 0
      r.categorias.forEach(c => {
        const vp = x.pago[c]?.[i] || 0, va = x.aPagar[c]?.[i] || 0
        cat[c] = { p: vp, a: va }; p += vp; a += va
      })
      out.push({ d, pago: p, aPagar: a, cat })
    })
  })
  return out
}

function totaisPorCategoria(dias: Dia[], categorias: string[]) {
  return categorias.map(c => {
    const p = dias.reduce((s, x) => s + x.cat[c].p, 0)
    const a = dias.reduce((s, x) => s + x.cat[c].a, 0)
    return { c, p, a, t: p + a }
  })
}

function useDados(versao: number) {
  const [r, setR] = useState<Resposta | null>(null)
  const [erro, setErro] = useState('')
  useEffect(() => {
    let vivo = true
    fetch(`/api/fluxo-pagamentos${versao ? '?fresco=1' : ''}`, { cache: 'no-store' })
      .then(res => res.json())
      .then((j: Resposta) => {
        if (!vivo) return
        if (!j.ok) setErro(j.erro || 'Erro ao carregar os dados.')
        else { setR(j); setErro('') }
      })
      .catch(e => vivo && setErro(String(e?.message || e)))
    return () => { vivo = false }
  }, [versao])
  return { r, erro }
}

// ---------------------------------------------------------------- componentes pequenos
function Secao({ titulo, sub, direita, children }: { titulo: string; sub?: string; direita?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section style={{ ...card, padding: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
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

function Kpi({ rotulo, valor, sub, cor }: { rotulo: string; valor: string; sub: string; cor?: string }) {
  return (
    <div style={{ ...card, padding: '14px 16px', borderTop: `3px solid ${cor || C.texto}` }}>
      <div style={{ fontSize: 11, color: C.suave, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>{rotulo}</div>
      <div style={{ ...MONO, fontSize: 22, fontWeight: 600, marginTop: 6, color: cor || C.texto }}>{valor}</div>
      <div style={{ fontSize: 11.5, color: C.suave, marginTop: 4 }}>{sub}</div>
    </div>
  )
}

function Legenda() {
  return (
    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#555', flexWrap: 'wrap' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: C.pago, display: 'inline-block' }} />Pago (realizado)</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><i style={{ width: 10, height: 10, borderRadius: 2, background: C.aPagar, display: 'inline-block' }} />A pagar (projeção)</span>
    </div>
  )
}

function Barra({ p, a, max }: { p: number; a: number; max: number }) {
  const w = (v: number) => `${max > 0 ? Math.max(0, v) / max * 100 : 0}%`
  return (
    <div style={{ display: 'flex', height: 8, background: '#F1F1EC', borderRadius: 4, overflow: 'hidden', minWidth: 120 }}>
      <div style={{ width: w(p), background: C.pago }} />
      <div style={{ width: w(a), background: C.aPagar }} />
    </div>
  )
}

// ---------------------------------------------------------------- abas
function Resumo({ r, unidade, meses }: { r: Resposta; unidade: string; meses: string[] }) {
  const dias = useMemo(() => linhaDoTempo(r, unidade, meses), [r, unidade, meses])
  const todos = useMemo(() => linhaDoTempo(r, unidade, r.meses), [r, unidade])
  const corte = r.corte[unidade] || ''
  const pago = dias.reduce((s, x) => s + x.pago, 0)
  const aPagar = dias.reduce((s, x) => s + x.aPagar, 0)
  const total = pago + aPagar
  const prox7Fim = somaDias(corte, 7)
  const prox7 = todos.filter(x => x.d > corte && x.d <= prox7Fim).reduce((s, x) => s + x.aPagar, 0)
  const futuros = dias.filter(x => x.aPagar > 0.005)
  const maior = futuros.reduce<Dia | null>((m, x) => (!m || x.aPagar > m.aPagar ? x : m), null)
  const ini = dias[0]?.d || '', fim = dias[dias.length - 1]?.d || ''

  const grafico = dias
    .filter(x => !(fimDeSemana(x.d) && z(x.pago) && z(x.aPagar)))
    .map(x => ({ dia: br(x.d), Pago: Math.round(x.pago), 'A pagar': Math.round(x.aPagar) }))

  const cats = totaisPorCategoria(dias, r.categorias).filter(x => !z(x.t)).sort((a, b) => b.t - a.t)
  const maxCat = Math.max(...cats.map(x => x.p + x.a), 1)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Kpi rotulo="Pago" valor={fmtK(pago)} sub={pago ? `realizado até ${br(corte < fim ? corte : fim)}` : 'nada realizado no período'} cor={C.pago} />
        <Kpi rotulo="A pagar" valor={fmtK(aPagar)} sub={aPagar ? `de ${br(corte >= ini ? somaDias(corte, 1) : ini)} a ${br(fim)}` : 'período já fechado'} cor={C.aPagar} />
        <Kpi rotulo="Total do período" valor={fmtK(total)} sub={total ? `${pct(pago / total)} já pago` : '—'} />
        <Kpi rotulo="Próximos 7 dias" valor={fmtK(prox7)} sub={`a pagar de ${br(somaDias(corte, 1))} a ${br(prox7Fim)}`} cor={C.aPagar} />
        <Kpi rotulo="Maior dia a pagar" valor={maior ? fmtK(maior.aPagar) : '—'} sub={maior ? `${SEM[diaSem(maior.d)]} ${br(maior.d)}` : 'sem pagamentos projetados'} cor={C.vermelho} />
      </div>

      <Secao titulo="Pagamentos por dia" sub={`${meses.length > 1 ? 'Setembro a dezembro' : meses[0]} de 2026 · dias sem movimento no fim de semana ficam de fora`} direita={<Legenda />}>
        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={grafico} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="#EEE" />
              <XAxis dataKey="dia" tick={{ fontSize: 10.5, fill: '#888' }} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tick={{ fontSize: 10.5, fill: '#888' }} tickFormatter={v => fmtK(Number(v)).replace('R$ ', '')} width={56} />
              <Tooltip formatter={(v) => fmtR(Number(v))} labelStyle={{ fontWeight: 600 }} />
              <Legend wrapperStyle={{ display: 'none' }} />
              <Bar dataKey="Pago" stackId="a" fill={C.pago} />
              <Bar dataKey="A pagar" stackId="a" fill={C.aPagar} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Secao>

      <Secao titulo="Por categoria" sub="Grupos dos pagamentos operacionais, mesma classificação do Painel de Caixa & Forecast">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Categoria</th><th style={th}></th>
              <th style={thNum}>Pago</th><th style={thNum}>A pagar</th><th style={thNum}>Total</th><th style={thNum}>% do total</th>
            </tr></thead>
            <tbody>
              {cats.map(x => (
                <tr key={x.c}>
                  <td style={td}>{x.c}</td>
                  <td style={{ ...td, width: '30%' }}><Barra p={x.p} a={x.a} max={maxCat} /></td>
                  <td style={{ ...tdNum, color: C.pago }}>{fmt(x.p)}</td>
                  <td style={{ ...tdNum, color: C.aPagar }}>{fmt(x.a)}</td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(x.t)}</td>
                  <td style={tdNum}>{total ? pct(x.t / total) : '—'}</td>
                </tr>
              ))}
              <tr style={{ background: C.zebra }}>
                <td style={{ ...td, fontWeight: 700 }}>Pagamentos operacionais</td><td style={td}></td>
                <td style={{ ...tdNum, fontWeight: 700, color: C.pago }}>{fmt(pago)}</td>
                <td style={{ ...tdNum, fontWeight: 700, color: C.aPagar }}>{fmt(aPagar)}</td>
                <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(total)}</td>
                <td style={tdNum}>{total ? '100,0%' : '—'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Secao>
    </>
  )
}

function FluxoDiario({ r, unidade, meses }: { r: Resposta; unidade: string; meses: string[] }) {
  const [fds, setFds] = useState(false)
  const [aberto, setAberto] = useState(true)
  const dias = useMemo(() => linhaDoTempo(r, unidade, meses), [r, unidade, meses])
  const porMes = meses.length > 1

  // colunas: dias (um mês) ou meses (Set a Dez)
  type Col = { k: string; rot: string; sub: string; status: 'pago' | 'aPagar' | 'misto'; ids: number[] }
  const cols: Col[] = useMemo(() => {
    if (porMes) {
      return meses.map(m => {
        const ids = dias.map((x, i) => (x.d.slice(5, 7) === String(r.meses.indexOf(m) + 9).padStart(2, '0') ? i : -1)).filter(i => i >= 0)
        const p = ids.reduce((s, i) => s + dias[i].pago, 0), a = ids.reduce((s, i) => s + dias[i].aPagar, 0)
        return { k: m, rot: MES_CURTO[m] + '/26', sub: '', status: z(a) ? 'pago' : z(p) ? 'aPagar' : 'misto', ids }
      })
    }
    return dias
      .map((x, i) => ({ x, i }))
      .filter(({ x }) => fds || !fimDeSemana(x.d))
      .map(({ x, i }) => ({
        k: x.d, rot: br(x.d), sub: SEM[diaSem(x.d)], ids: [i],
        status: (z(x.aPagar) && !z(x.pago) ? 'pago' : !z(x.aPagar) && z(x.pago) ? 'aPagar' : !z(x.aPagar) && !z(x.pago) ? 'misto' : (x.d <= (r.corte[unidade] || '') ? 'pago' : 'aPagar')) as Col['status'],
      }))
  }, [dias, fds, porMes, meses, r, unidade])

  const valCel = (ids: number[], c?: string) => ids.reduce((s, i) => {
    const x = dias[i]
    return s + (c ? x.cat[c].p + x.cat[c].a : x.pago + x.aPagar)
  }, 0)
  const cats = totaisPorCategoria(dias, r.categorias)
  const pagoT = dias.reduce((s, x) => s + x.pago, 0), aPagarT = dias.reduce((s, x) => s + x.aPagar, 0)

  const corHead = (s: Col['status']) => s === 'pago' ? C.pago : s === 'aPagar' ? C.aPagar : '#6B6B3A'
  const fundoCel = (s: Col['status']) => s === 'pago' ? 'transparent' : s === 'aPagar' ? '#FFFBEF' : '#FAFAEF'
  const stickyL: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 2, background: '#fff', minWidth: 210, borderRight: `1px solid ${C.borda}` }
  const thD: React.CSSProperties = { ...thNum, position: 'sticky', top: 0, zIndex: 3, color: '#fff', fontSize: 11, padding: '7px 10px' }
  const cel: React.CSSProperties = { ...tdNum, fontSize: 12, padding: '6px 10px' }

  return (
    <Secao
      titulo="Fluxo diário dos pagamentos"
      sub={`${unidade === '__CONS__' ? 'Consolidado das casas' : unidade} · ${porMes ? 'setembro a dezembro, por mês' : meses[0] + ' de 2026'} · realizado até ${br(r.corte[unidade] || '')}`}
      direita={
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Legenda />
          <button style={botao(!aberto)} onClick={() => setAberto(a => !a)}>{aberto ? 'Só o total' : 'Abrir categorias'}</button>
          {!porMes && <button style={botao(fds)} onClick={() => setFds(f => !f)}>{fds ? 'Ocultar fins de semana' : 'Mostrar fins de semana'}</button>}
        </div>
      }
    >
      <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 260px)', border: `1px solid ${C.borda}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: 'separate', borderSpacing: 0, width: '100%' }}>
          <thead>
            <tr>
              <th style={{ ...th, ...stickyL, position: 'sticky', top: 0, zIndex: 4, background: '#1F2A0C', color: '#fff' }}>Categoria</th>
              {cols.map(c => (
                <th key={c.k} style={{ ...thD, background: corHead(c.status) }}>
                  {c.rot}{c.sub && <div style={{ fontSize: 9.5, fontWeight: 400, opacity: 0.8 }}>{c.sub}</div>}
                </th>
              ))}
              <th style={{ ...thD, background: C.pago, borderLeft: '2px solid #fff' }}>Pago</th>
              <th style={{ ...thD, background: C.aPagar }}>A pagar</th>
              <th style={{ ...thD, background: '#1F2A0C' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {aberto && cats.filter(x => !z(x.t) || unidade === '__CONS__').map((x, k) => (
              <tr key={x.c} style={{ background: k % 2 ? C.zebra : '#fff' }}>
                <td style={{ ...td, ...stickyL, background: k % 2 ? C.zebra : '#fff', fontSize: 12.5, color: '#555', paddingLeft: 18 }}>{x.c}</td>
                {cols.map(c => {
                  const v = valCel(c.ids, x.c)
                  return <td key={c.k} style={{ ...cel, background: fundoCel(c.status), color: z(v) ? C.muito : v < 0 ? C.vermelho : C.texto }}>{fmt(v)}</td>
                })}
                <td style={{ ...cel, color: C.pago, borderLeft: `2px solid ${C.borda}` }}>{fmt(x.p)}</td>
                <td style={{ ...cel, color: C.aPagar }}>{fmt(x.a)}</td>
                <td style={{ ...cel, fontWeight: 600 }}>{fmt(x.t)}</td>
              </tr>
            ))}
            <tr>
              <td style={{ ...td, ...stickyL, background: '#EEF4DF', fontWeight: 700, fontSize: 12.5 }}>PAGAMENTOS OPERACIONAIS</td>
              {cols.map(c => <td key={c.k} style={{ ...cel, background: '#EEF4DF', fontWeight: 700 }}>{fmt(valCel(c.ids))}</td>)}
              <td style={{ ...cel, background: '#EEF4DF', fontWeight: 700, color: C.pago, borderLeft: `2px solid ${C.borda}` }}>{fmt(pagoT)}</td>
              <td style={{ ...cel, background: '#EEF4DF', fontWeight: 700, color: C.aPagar }}>{fmt(aPagarT)}</td>
              <td style={{ ...cel, background: '#EEF4DF', fontWeight: 700 }}>{fmt(pagoT + aPagarT)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: C.suave, marginTop: 10, lineHeight: 1.6 }}>
        Cabeçalho verde = dia pago (BASE de lançamentos, pela data de baixa). Cabeçalho amarelo = dia a pagar (Projetado, pela data prevista).
        No consolidado, um dia pode misturar os dois quando as casas têm datas de corte diferentes. Valores entre parênteses são estornos.
        {!porMes && !fds && ' Sábados e domingos ficam ocultos, mas os totais somam todos os dias do mês.'}
      </div>
    </Secao>
  )
}

function Agenda({ r, unidade, meses }: { r: Resposta; unidade: string; meses: string[] }) {
  const dias = useMemo(() => linhaDoTempo(r, unidade, meses).filter(x => !z(x.aPagar)), [r, unidade, meses])
  const total = dias.reduce((s, x) => s + x.aPagar, 0)
  const max = Math.max(...dias.map(x => x.aPagar), 1)
  const acumulado = dias.reduce<number[]>((a, x) => { a.push((a[a.length - 1] || 0) + x.aPagar); return a }, [])
  return (
    <Secao
      titulo="Agenda de pagamentos projetados"
      sub={`${unidade === '__CONS__' ? 'Consolidado das casas' : unidade} · dias com valor a pagar depois de ${br(r.corte[unidade] || '')} · ${dias.length} dias · ${fmtR(total)}`}
    >
      {!dias.length ? (
        <div style={{ fontSize: 13, color: C.suave, padding: 20, textAlign: 'center' }}>Nenhum pagamento projetado no período escolhido.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Data</th><th style={thNum}>A pagar</th><th style={th}></th><th style={thNum}>Acumulado</th><th style={th}>Principais categorias</th>
            </tr></thead>
            <tbody>
              {dias.map((x, i) => {
                const top = r.categorias.map(c => ({ c, v: x.cat[c].a })).filter(o => o.v > 0.5).sort((a, b) => b.v - a.v)
                const fds = fimDeSemana(x.d)
                return (
                  <tr key={x.d}>
                    <td style={{ ...td, whiteSpace: 'nowrap', fontWeight: 600 }}>
                      {br(x.d)} <span style={{ fontWeight: 400, color: fds ? C.vermelho : C.suave, fontSize: 12 }}>{SEM[diaSem(x.d)]}</span>
                    </td>
                    <td style={{ ...tdNum, fontWeight: 600, color: C.aPagar }}>{fmt(x.aPagar)}</td>
                    <td style={{ ...td, width: '18%' }}><Barra p={0} a={x.aPagar} max={max} /></td>
                    <td style={{ ...tdNum, color: C.suave }}>{fmt(acumulado[i])}</td>
                    <td style={{ ...td, fontSize: 12 }}>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {top.slice(0, 4).map(o => (
                          <span key={o.c} style={{ background: C.aPagarFundo, color: '#7A5600', borderRadius: 99, padding: '2px 9px', whiteSpace: 'nowrap' }}>
                            {o.c} <b style={MONO}>{fmtK(o.v)}</b>
                          </span>
                        ))}
                        {top.length > 4 && <span style={{ color: C.suave }}>+{top.length - 4}</span>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Secao>
  )
}

function PorCasa({ r, meses }: { r: Resposta; meses: string[] }) {
  const linhas = r.unidades.map(u => {
    const dias = linhaDoTempo(r, u, meses)
    const todos = linhaDoTempo(r, u, r.meses)
    const c = r.corte[u] || ''
    const p = dias.reduce((s, x) => s + x.pago, 0), a = dias.reduce((s, x) => s + x.aPagar, 0)
    const prox7 = todos.filter(x => x.d > c && x.d <= somaDias(c, 7)).reduce((s, x) => s + x.aPagar, 0)
    const cat = totaisPorCategoria(dias, r.categorias).sort((x, y) => y.a - x.a)[0]
    return { u, c, p, a, t: p + a, prox7, cat }
  }).sort((x, y) => y.t - x.t)
  const T = linhas.reduce((s, x) => ({ p: s.p + x.p, a: s.a + x.a, t: s.t + x.t, prox7: s.prox7 + x.prox7 }), { p: 0, a: 0, t: 0, prox7: 0 })
  const max = Math.max(...linhas.map(x => x.t), 1)
  return (
    <Secao titulo="Por casa" sub={`${meses.length > 1 ? 'Setembro a dezembro' : meses[0]} de 2026 · todas as casas liberadas pra você`} direita={<Legenda />}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Casa</th><th style={th}></th><th style={thNum}>Pago</th><th style={thNum}>A pagar</th><th style={thNum}>Total</th>
            <th style={thNum}>% pago</th><th style={thNum}>Próx. 7 dias</th><th style={th}>Maior a pagar</th><th style={thNum}>Realizado até</th>
          </tr></thead>
          <tbody>
            {linhas.map(x => (
              <tr key={x.u}>
                <td style={{ ...td, fontWeight: 600 }}>{x.u}</td>
                <td style={{ ...td, width: '18%' }}><Barra p={x.p} a={x.a} max={max} /></td>
                <td style={{ ...tdNum, color: C.pago }}>{fmt(x.p)}</td>
                <td style={{ ...tdNum, color: C.aPagar }}>{fmt(x.a)}</td>
                <td style={{ ...tdNum, fontWeight: 600 }}>{fmt(x.t)}</td>
                <td style={tdNum}>{x.t ? pct(x.p / x.t) : '—'}</td>
                <td style={tdNum}>{fmt(x.prox7)}</td>
                <td style={{ ...td, fontSize: 12, color: '#555' }}>{x.cat && x.cat.a > 0.5 ? <>{x.cat.c} <span style={MONO}>{fmtK(x.cat.a)}</span></> : '—'}</td>
                <td style={{ ...tdNum, color: C.suave }}>{br(x.c)}</td>
              </tr>
            ))}
            <tr style={{ background: C.zebra }}>
              <td style={{ ...td, fontWeight: 700 }}>Total</td><td style={td}></td>
              <td style={{ ...tdNum, fontWeight: 700, color: C.pago }}>{fmt(T.p)}</td>
              <td style={{ ...tdNum, fontWeight: 700, color: C.aPagar }}>{fmt(T.a)}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(T.t)}</td>
              <td style={tdNum}>{T.t ? pct(T.p / T.t) : '—'}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{fmt(T.prox7)}</td>
              <td style={td}></td><td style={td}></td>
            </tr>
          </tbody>
        </table>
      </div>
    </Secao>
  )
}

// ---------------------------------------------------------------- casca
function Sidebar({ aba, onAba }: { aba: Aba; onAba: (a: Aba) => void }) {
  return (
    <aside style={{ width: 220, background: '#fff', borderRight: '0.5px solid #E8E8E2', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #E8E8E2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#0D0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#97A624', fontWeight: 700, fontFamily: 'monospace' }}>QE</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Fluxo de Pagamentos</div>
          <div style={{ fontSize: 10, color: '#9a9c9f' }}>Pago × a pagar · 2026</div>
        </div>
      </div>
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {ABAS.map(p => (
          <button key={p.id} onClick={() => onAba(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '8px 14px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left', marginBottom: 2,
              background: aba === p.id ? '#f0f4e0' : 'transparent', color: aba === p.id ? '#6e7a1a' : '#5a5c5f', fontWeight: aba === p.id ? 500 : 400,
            }}>
            <span>{p.icon}</span>{p.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}

function BottomNav({ aba, onAba }: { aba: Aba; onAba: (a: Aba) => void }) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #E8E8E2', display: 'flex', zIndex: 50 }}>
      {ABAS.map(p => (
        <button key={p.id} onClick={() => onAba(p.id)}
          style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, fontFamily: 'inherit', color: aba === p.id ? '#97A624' : '#9a9c9f', fontWeight: aba === p.id ? 600 : 400 }}>
          <span style={{ fontSize: 18 }}>{p.icon}</span>{p.curto}
        </button>
      ))}
    </nav>
  )
}

export default function FluxoPagamentosClientApp() {
  const [versao, setVersao] = useState(0)
  const { r, erro } = useDados(versao)
  const [aba, setAba] = useState<Aba>('resumo')
  const [unidade, setUnidade] = useState('__CONS__')
  const [mes, setMes] = useState('')

  // mês padrão = mês do corte (o mês "corrente" do realizado)
  const mesPadrao = r ? (r.meses[Number((r.corte.__CONS__ || '').slice(5, 7)) - 9] || r.meses[0]) : ''
  const mesEf = mes || mesPadrao
  const meses = useMemo(() => (!r ? [] : mesEf === '__TODOS__' ? r.meses : [mesEf]), [r, mesEf])
  const unidadeEf = aba === 'casas' ? '__CONS__' : unidade

  let conteudo: React.ReactNode
  if (erro && !r) conteudo = <div style={{ maxWidth: 560, margin: '40px auto', padding: '10px 14px', borderRadius: 8, background: '#FBEFEF', color: C.vermelho, fontSize: 13 }}>Não foi possível abrir o painel: {erro}</div>
  else if (!r) conteudo = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: 50 }}>
      <div style={{ width: 26, height: 26, border: '2px solid #E8E8E8', borderTopColor: C.texto, borderRadius: '50%', animation: 'fpspin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#999' }}>Carregando pagamentos...</div>
      <style>{`@keyframes fpspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  else conteudo = (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1440, margin: '0 auto' }}>
      {erro && <div style={{ padding: '10px 14px', borderRadius: 8, background: '#FBEFEF', color: C.vermelho, fontSize: 13 }}>{erro}</div>}
      {aba === 'resumo' && <Resumo r={r} unidade={unidadeEf} meses={meses} />}
      {aba === 'calendario' && <FluxoDiario r={r} unidade={unidadeEf} meses={meses} />}
      {aba === 'agenda' && <Agenda r={r} unidade={unidadeEf} meses={meses} />}
      {aba === 'casas' && <PorCasa r={r} meses={meses} />}
      <div style={{ fontSize: 11.5, color: C.suave, lineHeight: 1.6 }}>
        Só os <b>pagamentos operacionais</b> do Painel de Caixa &amp; Forecast (CMV, pessoal, ocupação etc.). Fica de fora CAPEX, resultado financeiro,
        empréstimos, aplicações, mútuos e transferências. <b>Pago</b> = BASE de lançamentos pela data de baixa, até o último dia realizado de cada casa.{' '}
        <b>A pagar</b> = Projetado pela data prevista, depois desse dia. Fonte: {r.fonte === 'apps-script' ? 'planilhas do financeiro (Apps Script)' : 'snapshot do painel'} ·
        atualizado {new Date(r.atualizado).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}.
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <div className="hidden lg:flex">
        <Sidebar aba={aba} onAba={setAba} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar HUB */}
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">Fluxo de Pagamentos</span>
          <div className="ml-auto flex items-center gap-3">
            <Link href="/hub/caixa-forecast" className="text-xs text-zinc-400 hover:text-white transition-colors">Painel de Caixa ↗</Link>
            <button onClick={() => setVersao(v => v + 1)} className="text-xs text-zinc-400 hover:text-white transition-colors" title="Buscar de novo nas planilhas">↻ Atualizar</button>
          </div>
        </div>

        {/* Header verde */}
        <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>💸</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Fluxo de Pagamentos</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                Pagamentos operacionais · pago e a pagar{r ? ` · realizado até ${br(r.corte[unidadeEf] || '')}` : ''}
              </div>
            </div>
          </div>

          {r && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select value={mesEf} onChange={e => setMes(e.target.value)} style={selectStyle}>
                {r.meses.map(m => <option key={m} value={m} style={opt}>{m}</option>)}
                <option value="__TODOS__" style={opt}>Setembro a dezembro</option>
              </select>
              <select value={unidadeEf} onChange={e => setUnidade(e.target.value)} style={{ ...selectStyle, opacity: aba === 'casas' ? 0.5 : 1 }} disabled={aba === 'casas'}>
                <option value="__CONS__" style={opt}>{r.unidades.length > 1 ? 'Consolidado' : 'Todas'}</option>
                {r.unidades.map(u => <option key={u} value={u} style={opt}>{u}</option>)}
              </select>
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {conteudo}
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav aba={aba} onAba={setAba} />
      </div>
    </div>
  )
}
