'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  type Config, type Filtros, type Linha, type Resumo, GRUPOS, DIAS_SEMANA, addDias, addMeses, agruparPor, aplicarFiltros,
  ativa, dataCurta, diaSemana, exportarExcel, listaDias, mesCurto, n0, n1, nk, nomeMes, pct, primeiroDia, resumir,
  taxa, ultimoDia, useLinhas, variacao,
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

export default function PorCasa({ config, filtros, hoje }: { config: Config; filtros: Filtros; hoje: string }) {
  const mesHoje = hoje.slice(0, 7)
  const [mes, setMes] = useState(addMeses(mesHoje, -1))
  const [casa, setCasa] = useState<string | null>(null)
  const meses = [addMeses(mes, -2), addMeses(mes, -1), mes]
  const dados = useLinhas('reserva', primeiroDia(meses[0]), ultimoDia(mes))

  const opcoes = useMemo(() => Array.from(new Set([...config.mesesDr.filter(m => m <= mesHoje), mesHoje])).sort().reverse(), [config.mesesDr, mesHoje])

  const tabela = useMemo(() => {
    if (!dados.linhas) return null
    const filtradas = aplicarFiltros(dados.linhas, filtros)
    const porCasa = agruparPor(filtradas, r => r.u)
    const linha = (l: Linha[]) => meses.map(m => metricas(l.filter(r => r.dr.startsWith(m)), hoje))
    const casas = Array.from(porCasa).map(([u, l]) => ({ u, m: linha(l) })).sort((a, b) => b.m[2].reservas - a.m[2].reservas)
    return { casas, rede: linha(filtradas), filtradas }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados.linhas, filtros, mes, hoje])

  const parcial = mes === mesHoje

  return (
    <>
      <Secao
        titulo={`Reservas por casa · ${meses.map(mesCurto).map(s => s[0].toUpperCase() + s.slice(1)).join(', ')}`}
        sub={`Por data da reserva · ${mesCurto(mes)} em negrito, colorido pela variação vs ${mesCurto(meses[1])}${parcial ? ' · mês em andamento: taxas só sobre datas que já passaram' : ''} · s/ reg. = nenhum no-show registrado · clique na casa para o resumo`}
        direita={
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={mes} onChange={e => { setMes(e.target.value); setCasa(null) }} style={{ ...pill(true), appearance: 'auto' }}>
              {opcoes.map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
            </select>
            {tabela && <button style={botao} onClick={() => exportarExcel(`reservas_por_casa_${meses[0]}_a_${mes}`, tabela.filtradas)}>Exportar Excel</button>}
          </div>
        }>
        {dados.erro && <Aviso>{dados.erro}</Aviso>}
        {!tabela ? <Spinner /> : <TabelaCasas meses={meses} casas={tabela.casas} rede={tabela.rede} selecionada={casa} onCasa={u => setCasa(c => (c === u ? null : u))} />}
      </Secao>

      {casa && dados.linhas && <ResumoCasa casa={casa} mes={mes} linhas={aplicarFiltros(dados.linhas, filtros).filter(r => r.u === casa)} hoje={hoje} filtros={filtros} />}
    </>
  )
}

// ─── Tabela no formato do relatório (3 meses × 4 métricas) ───────────────────
function TabelaCasas({ meses, casas, rede, selecionada, onCasa }: {
  meses: string[]; casas: { u: string; m: Metricas[] }[]; rede: Metricas[]; selecionada: string | null; onCasa: (u: string) => void
}) {
  const blocos: { titulo: string; val: (x: Metricas) => number | null; fmt: (v: number | null, x: Metricas) => string; inverso?: boolean }[] = [
    { titulo: 'Reservas', val: x => x.reservas, fmt: v => n0(v || 0) },
    { titulo: 'Pessoas', val: x => x.pessoas, fmt: v => nk(v || 0) },
    { titulo: 'Taxa sentada', val: x => taxa(x.sentadas, x.base), fmt: v => pct(v) },
    { titulo: 'No-show', val: x => taxa(x.noshow, x.base), fmt: (v, x) => (x.base && !x.noshow ? 's/ reg.' : pct(v)), inverso: true },
  ]
  const corVar = (atual: number | null, ant: number | null, inverso?: boolean) => {
    if (atual === null || ant === null || atual === ant) return C.texto
    const sobe = atual > ant
    return (inverso ? !sobe : sobe) ? '#6e7a1a' : C.vermelho
  }
  const cabBloco: React.CSSProperties = { background: '#0D0F14', color: '#fff', fontSize: 11, fontWeight: 600, letterSpacing: 0.5, textAlign: 'center', padding: '8px 0', borderRadius: 6 }

  const celulas = (m: Metricas[], negrito: boolean, branco = false) => blocos.map((b, bi) => (
    meses.map((_, i) => {
      const v = b.val(m[i])
      const ultimo = i === 2
      const cor = branco ? '#fff' : ultimo ? corVar(v, b.val(m[1]), b.inverso) : '#555'
      const sreg = b.fmt(v, m[i]) === 's/ reg.'
      return (
        <td key={`${bi}-${i}`} style={{
          ...tdNum, fontSize: ultimo ? 13.5 : 12, fontWeight: ultimo || negrito ? 700 : 400,
          color: sreg && !branco ? C.muito : cor, fontStyle: sreg ? 'italic' : 'normal',
          borderLeft: i === 0 && bi > 0 ? `1px solid ${branco ? 'rgba(255,255,255,.25)' : '#EDEDE8'}` : undefined,
        }}>{b.fmt(v, m[i])}</td>
      )
    })
  ))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ ...th, border: 'none' }} />
            {blocos.map(b => <th key={b.titulo} colSpan={3} style={{ padding: '0 4px 6px', border: 'none' }}><div style={cabBloco}>{b.titulo.toUpperCase()}</div></th>)}
          </tr>
          <tr>
            <th style={{ ...th, fontSize: 10.5 }}>CASA</th>
            {blocos.map(b => meses.map((m, i) => (
              <th key={b.titulo + m} style={{ ...thNum, fontSize: 10.5, color: i === 2 ? C.texto : C.suave }}>{mesCurto(m).toUpperCase()}</th>
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
  const anterior = addMeses(mes, -1)

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
        <Kpi label="Reservas" valor={n0(at.reservas)} anterior={n0(an.reservas)} v={variacao(at.reservas, an.reservas)} />
        <Kpi label="Pessoas" valor={n0(at.pessoas)} anterior={n0(an.pessoas)} v={variacao(at.pessoas, an.pessoas)} />
        <Kpi label="Mesa média" valor={n1(at.tam)} anterior={n1(an.tam)} v={variacao(at.tam, an.tam)} />
        <Kpi label="Taxa sentada" valor={pct(taxa(at.sentadas, at.base))} anterior={pct(taxa(an.sentadas, an.base))} />
        <Kpi label="No-show" valor={pct(taxa(at.noshow, at.base))} anterior={pct(taxa(an.noshow, an.base))} />
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
      <div style={{ fontSize: 11.5, color: C.suave }}>KPIs comparados com {nomeMes(anterior)}. Taxa sentada e no-show consideram só as datas que já passaram.</div>
    </>
  )
}
