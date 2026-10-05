'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  type Config, type Filtros, type HistMes, type Linha, type MediaHist, type Resumo, GRUPOS, DIAS_SEMANA, addDias, addMeses,
  agruparPor, aplicarFiltros, ativa, dataCurta, diaSemana, exportarExcel, histMensal, histPorCasa, listaDias, mediaHistorica,
  mesCurto, n0, n1, nk, nomeMes, pct, primeiroDia, resumir, taxa, ultimoDia, useHistorico, useLinhas, variacao,
} from '../utils'
import { Aviso, BarraH, C, Kpi, MONO, Secao, Spinner, botao, card, pill, td, tdNum, th, thNum } from '../ui'

type Metricas = Resumo & { base: number }

// Taxas sobre as reservas cuja data já passou (no mês corrente, as futuras ainda não podem estar sentadas)
function metricas(l: Linha[], hoje: string): Metricas {
  const r = resumir(l)
  const passadas = l.filter(x => x.dr < hoje)
  const p = resumir(passadas)
  return { ...r, sentadas: p.sentadas, noshow: p.noshow, base: passadas.length }
}

// Célula da tabela: vem das linhas (meses exibidos) ou do histórico agregado (ano anterior / média)
type Cel = { reservas: number; pessoas: number; sent: number | null; ns: number | null; base: number } | null
const deMetricas = (x: Metricas): Cel => ({ reservas: x.reservas, pessoas: x.pessoas, sent: taxa(x.sentadas, x.base), ns: taxa(x.noshow, x.base), base: x.base })
const deHist = (x: HistMes | undefined): Cel => (x ? { reservas: x.reservas, pessoas: x.pessoas, sent: taxa(x.sentadas, x.base), ns: taxa(x.noshow, x.base), base: x.base } : null)
const deMedia = (x: MediaHist | null): Cel => (x ? { reservas: x.reservas, pessoas: x.pessoas, sent: x.sentada, ns: x.noshow, base: 1 } : null)

export default function PorCasa({ config, filtros, hoje }: { config: Config; filtros: Filtros; hoje: string }) {
  const mesHoje = hoje.slice(0, 7)
  const [mes, setMes] = useState(addMeses(mesHoje, -1))
  const [casa, setCasa] = useState<string | null>(null)
  const meses = [addMeses(mes, -2), addMeses(mes, -1), mes]
  const dados = useLinhas('reserva', primeiroDia(meses[0]), ultimoDia(mes))
  const { hist } = useHistorico()

  const opcoes = useMemo(() => Array.from(new Set([...config.mesesDr.filter(m => m <= mesHoje), mesHoje])).sort().reverse(), [config.mesesDr, mesHoje])

  const tabela = useMemo(() => {
    if (!dados.linhas) return null
    const filtradas = aplicarFiltros(dados.linhas, filtros)
    const porCasa = agruparPor(filtradas, r => r.u)
    const mesAno = addMeses(mes, -12)
    const histCasa = hist ? histPorCasa(hist, 'reserva', filtros) : null
    const histRede = hist ? histMensal(hist, 'reserva', filtros) : null
    // [M-2, M-1, M, mesmo mês do ano anterior, média histórica]
    const linha = (l: Linha[], h: Map<string, HistMes> | null | undefined): Cel[] => [
      ...meses.map(m => deMetricas(metricas(l.filter(r => r.dr.startsWith(m)), hoje))),
      hist ? deHist(h?.get(mesAno)) : null,
      hist && h ? deMedia(mediaHistorica(h, hist, 'reserva', mesHoje)) : null,
    ]
    const casas = Array.from(porCasa).map(([u, l]) => ({ u, m: linha(l, histCasa?.get(u)) })).sort((a, b) => (b.m[2]?.reservas || 0) - (a.m[2]?.reservas || 0))
    return { casas, rede: linha(filtradas, histRede), filtradas, mesAno }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados.linhas, filtros, mes, hoje, hist])

  const parcial = mes === mesHoje

  return (
    <>
      <Secao
        titulo={`Reservas por casa · ${meses.map(mesCurto).map(s => s[0].toUpperCase() + s.slice(1)).join(', ')}`}
        sub={`Por data da reserva · ${mesCurto(mes)} em negrito, colorido pela variação vs ${mesCurto(meses[1])} · ano ant. = ${mesCurto(mes)}/${String(Number(mes.slice(2, 4)) - 1)} · média = meses fechados${parcial ? ' · mês em andamento: taxas só sobre datas que já passaram' : ''} · s/ reg. = nenhum no-show registrado · clique na casa para o resumo`}
        direita={
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={mes} onChange={e => { setMes(e.target.value); setCasa(null) }} style={{ ...pill(true), appearance: 'auto' }}>
              {opcoes.map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
            </select>
            {tabela && <button style={botao} onClick={() => exportarExcel(`reservas_por_casa_${meses[0]}_a_${mes}`, tabela.filtradas)}>Exportar Excel</button>}
          </div>
        }>
        {dados.erro && <Aviso>{dados.erro}</Aviso>}
        {!tabela ? <Spinner /> : <TabelaCasas meses={meses} mesAno={tabela.mesAno} casas={tabela.casas} rede={tabela.rede} selecionada={casa} onCasa={u => setCasa(c => (c === u ? null : u))} />}
      </Secao>

      {casa && dados.linhas && <ResumoCasa casa={casa} mes={mes} linhas={aplicarFiltros(dados.linhas, filtros).filter(r => r.u === casa)} hoje={hoje} filtros={filtros} />}
    </>
  )
}

// ─── Tabela no formato do relatório (3 meses + ano anterior + média × 4 métricas) ──
function TabelaCasas({ meses, mesAno, casas, rede, selecionada, onCasa }: {
  meses: string[]; mesAno: string; casas: { u: string; m: Cel[] }[]; rede: Cel[]; selecionada: string | null; onCasa: (u: string) => void
}) {
  const blocos: { titulo: string; val: (x: NonNullable<Cel>) => number | null; fmt: (v: number | null, x: NonNullable<Cel>) => string; inverso?: boolean }[] = [
    { titulo: 'Reservas', val: x => x.reservas, fmt: v => n0(v || 0) },
    { titulo: 'Pessoas', val: x => x.pessoas, fmt: v => nk(v || 0) },
    { titulo: 'Taxa sentada', val: x => x.sent, fmt: v => pct(v) },
    { titulo: 'No-show', val: x => x.ns, fmt: (v, x) => (x.base && v === 0 ? 's/ reg.' : pct(v)), inverso: true },
  ]
  const colunas = [...meses.map(m => mesCurto(m).toUpperCase()), `${mesCurto(mesAno).toUpperCase()}/${mesAno.slice(2, 4)}`, 'MÉDIA']
  const corVar = (atual: number | null, ant: number | null, inverso?: boolean) => {
    if (atual === null || ant === null || atual === ant) return C.texto
    const sobe = atual > ant
    return (inverso ? !sobe : sobe) ? '#6e7a1a' : C.vermelho
  }
  const cabBloco: React.CSSProperties = { background: '#0D0F14', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textAlign: 'center', padding: '8px 0', borderRadius: 6 }

  const celulas = (m: Cel[], negrito: boolean, branco = false) => blocos.map((b, bi) => (
    colunas.map((_, i) => {
      const x = m[i]
      const v = x ? b.val(x) : null
      const ehMes = i === 2
      const ref = i >= 3                       // ano anterior / média
      const ant = m[1] ? b.val(m[1]) : null
      const txt = x ? b.fmt(v, x) : '—'
      const sreg = txt === 's/ reg.'
      const cor = branco ? (ref ? 'rgba(255,255,255,.8)' : '#fff') : ehMes ? corVar(v, ant, b.inverso) : ref ? '#8a8a85' : '#555'
      return (
        <td key={`${bi}-${i}`} style={{
          ...tdNum, fontSize: ehMes ? 13.5 : 12, fontWeight: ehMes || (negrito && !ref) ? 700 : 400,
          color: (sreg || !x) && !branco ? C.muito : cor, fontStyle: sreg || ref ? 'italic' : 'normal',
          borderLeft: i === 0 && bi > 0 ? `1px solid ${branco ? 'rgba(255,255,255,.25)' : '#EDEDE8'}` : i === 3 ? `1px dashed ${branco ? 'rgba(255,255,255,.25)' : '#E2E2DC'}` : undefined,
        }}>{txt}</td>
      )
    })
  ))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ ...th, border: 'none' }} />
            {blocos.map(b => <th key={b.titulo} colSpan={colunas.length} style={{ padding: '0 4px 6px', border: 'none' }}><div style={cabBloco}>{b.titulo.toUpperCase()}</div></th>)}
          </tr>
          <tr>
            <th style={{ ...th, fontSize: 10.5 }}>CASA</th>
            {blocos.map(b => colunas.map((c, i) => (
              <th key={b.titulo + c} style={{ ...thNum, fontSize: 10.5, color: i === 2 ? C.texto : C.suave, fontStyle: i >= 3 ? 'italic' : 'normal' }}>{c}</th>
            )))}
          </tr>
        </thead>
        <tbody>
          {casas.map((c, k) => (
            <tr key={c.u} onClick={() => onCasa(c.u)}
              style={{ cursor: 'pointer', background: selecionada === c.u ? C.azulFundo : k % 2 === 0 ? C.zebra : '#fff' }}>
              <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.u}</td>
              {celulas(c.m, false)}
            </tr>
          ))}
          <tr style={{ background: C.verde }}>
            <td style={{ ...td, fontWeight: 700, color: '#fff', borderBottom: 'none' }}>Total · Rede</td>
            {celulas(rede, true, true)}
          </tr>
        </tbody>
      </table>
    </div>
  )
}

// ─── Resumo de uma casa ──────────────────────────────────────────────────
function ResumoCasa({ casa, mes, linhas, hoje, filtros }: { casa: string; mes: string; linhas: Linha[]; hoje: string; filtros: Filtros }) {
  const proximos = useLinhas('reserva', hoje, addDias(hoje, 13))
  const { hist } = useHistorico()
  const anterior = addMeses(mes, -1)
  const mesAno = addMeses(mes, -12)
  const ha = hist ? histMensal(hist, 'reserva', filtros, casa).get(mesAno) : undefined
  const anoTxt = (v: number | undefined | null, f: (n: number) => string) => (!hist ? '…' : v == null ? 'sem histórico' : f(v))

  const doMes = linhas.filter(r => r.dr.startsWith(mes))
  const doAnt = linhas.filter(r => r.dr.startsWith(anterior))
  const at = metricas(doMes, hoje)
  const an = metricas(doAnt, hoje)
  const ativasMes = doMes.filter(ativa)

  const porDia = listaDias(primeiroDia(mes), ultimoDia(mes)).map(d => {
    const l = ativasMes.filter(r => r.dr === d)
    return { rotulo: `${dataCurta(d)} ${DIAS_SEMANA[diaSemana(d)]}`, reservas: l.length, pessoas: l.reduce((s, r) => s + r.p, 0) }
  })
  const ocasioes = Array.from(agruparPor(doMes.filter(r => r.oc !== 'Não Informado'), r => r.oc)).map(([oc, l]) => [oc, l.length] as const).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const operadores = Array.from(agruparPor(doMes, r => r.o)).map(([o, l]) => [o, l.length] as const).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxOc = Math.max(1, ...ocasioes.map(o => o[1]))
  const maxOp = Math.max(1, ...operadores.map(o => o[1]))

  const prox = proximos.linhas ? aplicarFiltros(proximos.linhas, filtros).filter(r => r.u === casa && ativa(r)) : null
  const diasProx = listaDias(hoje, addDias(hoje, 13))

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{casa} <span style={{ fontSize: 13, color: C.suave, fontWeight: 400 }}>· {nomeMes(mes)} · por data da reserva</span></h2>
        <button style={botao} onClick={() => exportarExcel(`reservas_${casa.replace(/\W+/g, '_')}_${mes}`, doMes)}>Exportar {casa}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <Kpi label="Reservas" valor={n0(at.reservas)} anterior={n0(an.reservas)} v={variacao(at.reservas, an.reservas)}
          anoAnterior={anoTxt(ha?.reservas, n0)} vAno={ha ? variacao(at.reservas, ha.reservas) : null} />
        <Kpi label="Pessoas" valor={n0(at.pessoas)} anterior={n0(an.pessoas)} v={variacao(at.pessoas, an.pessoas)}
          anoAnterior={anoTxt(ha?.pessoas, n0)} vAno={ha ? variacao(at.pessoas, ha.pessoas) : null} />
        <Kpi label="Mesa média" valor={n1(at.tam)} anterior={n1(an.tam)} v={variacao(at.tam, an.tam)}
          anoAnterior={anoTxt(ha && ha.reservas ? ha.pessoas / ha.reservas : null, n1)} vAno={ha && ha.reservas ? variacao(at.tam, ha.pessoas / ha.reservas) : null} />
        <Kpi label="Taxa sentada" valor={pct(taxa(at.sentadas, at.base))} anterior={pct(taxa(an.sentadas, an.base))}
          anoAnterior={anoTxt(ha ? taxa(ha.sentadas, ha.base) : null, x => pct(x))} />
        <Kpi label="No-show" valor={pct(taxa(at.noshow, at.base))} anterior={pct(taxa(an.noshow, an.base))}
          anoAnterior={anoTxt(ha ? taxa(ha.noshow, ha.base) : null, x => pct(x))} inverso />
        <Kpi label="Canceladas" valor={pct(taxa(at.canceladas, at.reservas))} anterior={pct(taxa(an.canceladas, an.reservas))} />
        <Kpi label="B2B" valor={n0(at.b2b)} detalhe={`${n0(at.b2bPessoas)} pessoas`} cor={C.b2b} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {GRUPOS.map(g => {
          const l = doMes.filter(r => r.g === g.id)
          return (
            <div key={g.id} style={{ ...card, padding: '10px 14px', borderLeft: `3px solid ${g.cor}` }}>
              <div style={{ fontSize: 12, color: C.suave }}>{g.label}</div>
              <div style={{ ...MONO, fontSize: 20 }}>{n0(l.length)} <span style={{ fontSize: 12, color: C.suave }}>{pct(taxa(l.length, doMes.length))}</span></div>
            </div>
          )
        })}
      </div>

      <Secao titulo="Reservas por dia" sub={`${nomeMes(mes)} · por data da reserva · sem canceladas`}>
        <div style={{ height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={porDia} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="#F1F1F1" vertical={false} />
              <XAxis dataKey="rotulo" tick={{ fontSize: 10, fill: '#999' }} interval={1} tickLine={false} axisLine={{ stroke: '#E8E8E8' }} />
              <YAxis tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.borda}` }}
                formatter={(v, n) => [n0(Number(v)), n === 'reservas' ? 'Reservas' : 'Pessoas']} />
              <Bar dataKey="reservas" fill={C.azul} radius={[3, 3, 0, 0]} maxBarSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Secao>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
        <Secao titulo="Ocasiões" sub="Só reservas da central têm ocasião">
          {ocasioes.length ? ocasioes.map(([oc, q]) => <BarraH key={oc} label={oc} valor={q} max={maxOc} texto={n0(q)} cor={C.verde} />)
            : <div style={{ fontSize: 13, color: C.suave }}>Nenhuma ocasião informada.</div>}
        </Secao>
        <Secao titulo="Quem fez as reservas" sub="Operador ou Online">
          {operadores.map(([o, q]) => <BarraH key={o} label={o} valor={q} max={maxOp} texto={n0(q)} />)}
        </Secao>
      </div>

      <Secao titulo={`Próximos 14 dias — ${casa}`} sub="Por data da reserva · sem canceladas · todas as origens do filtro">
        {proximos.erro && <Aviso>{proximos.erro}</Aviso>}
        {!prox ? <Spinner texto="Carregando agenda..." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Data</th><th style={thNum}>Reservas</th><th style={thNum}>Pessoas</th>
                <th style={thNum}>B2B</th><th style={thNum}>B2B pess.</th><th style={thNum}>Pendentes</th>
              </tr></thead>
              <tbody>
                {diasProx.map(d => {
                  const r = resumir(prox.filter(x => x.dr === d))
                  const fds = [0, 5, 6].includes(diaSemana(d))
                  return (
                    <tr key={d}>
                      <td style={{ ...td, fontWeight: fds ? 600 : 400 }}>{dataCurta(d)} <span style={{ color: C.suave }}>{DIAS_SEMANA[diaSemana(d)]}</span></td>
                      <td style={tdNum}>{r.reservas ? n0(r.reservas) : <span style={{ color: '#DDD' }}>·</span>}</td>
                      <td style={tdNum}>{r.pessoas ? n0(r.pessoas) : ''}</td>
                      <td style={{ ...tdNum, color: r.b2b ? C.b2b : C.muito }}>{r.b2b ? n0(r.b2b) : ''}</td>
                      <td style={{ ...tdNum, color: C.b2b }}>{r.b2bPessoas ? n0(r.b2bPessoas) : ''}</td>
                      <td style={{ ...tdNum, color: '#8A6D00' }}>{r.pendentes ? n0(r.pendentes) : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Secao>
      <div style={{ fontSize: 11.5, color: C.suave }}>KPIs comparados com {nomeMes(anterior)} e com {nomeMes(mesAno)}. Taxa sentada e no-show consideram só as datas que já passaram.</div>
    </>
  )
}
