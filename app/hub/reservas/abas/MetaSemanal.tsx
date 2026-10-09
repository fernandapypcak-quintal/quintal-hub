'use client'

// Meta semanal do time de reservas (bônus).
// Semanas = blocos de 7 dias dentro do mês (1–7, 8–14, 15–21, 22–28, 29–fim; a última é curta e tem meta proporcional).
// Conta as reservas CRIADAS por cada operadora do time (as mesmas da meta do mês), em todas as casas.
// Meta do time na semana = soma das metas das operadoras. Metas na aba METAS_SEMANAIS.
//   modo="resumo":     card compacto da semana atual (Resumo)
//   modo="operadores": tabela completa por operadora, com navegação entre semanas (Operadores)

import { useMemo, useState } from 'react'
import {
  type Config, type Linha, DIAS_SEMANA, addDias, addMeses, dataCurta, dataLonga, diaSemana, diffDias, metaSemanalDe,
  n0, n1, nomeMes, pct, primeiroDia, semanaAnterior, semanaDoMes, semanaSeguinte, useLinhas,
} from '../utils'
import { Aviso, C, MONO, Secao, Spinner, botao, card, pill, td, tdNum, th, thNum } from '../ui'

export const CORES_FAIXA = [
  { bg: '#FFF2CC', fg: '#8A6D00' },   // faixa 1
  { bg: '#D9EAD3', fg: '#38761D' },   // faixa 2
  { bg: '#C9DAF8', fg: '#1C4587' },   // faixa 3
]

type Res = {
  op: string; dias: number[]; total: number; mes: number; semanasBonus: number; semanasFechadas: number
  meta: ReturnType<typeof metaSemanalDe>; faixa: number; falta: number | null; ating: number | null
}

const faixaDe = (total: number, faixas: number[]) => faixas.filter(f => total >= f).length
const faltaDe = (total: number, faixas: number[]) => { const p = faixas.find(f => f > total); return p !== undefined ? p - total : null }

function calcular(linhas: Linha[], config: Config, semana: string, hoje: string) {
  const sem = semanaDoMes(semana)
  const mes = semana.slice(0, 7)
  const doTime = linhas.filter(r => r.m)
  // semanas do mês já encerradas (para contar semanas com bônus)
  const semanasMes: string[] = []
  for (let s = primeiroDia(mes); s.startsWith(mes); s = semanaSeguinte(s).ini) semanasMes.push(s)
  const fechadas = semanasMes.filter(s => semanaDoMes(s).fim < hoje)

  const ops = Array.from(new Set([
    ...doTime.filter(r => r.dc.startsWith(mes)).map(r => r.o),
    ...config.metasSemanais.filter(m => m.operador).map(m => m.operador),
  ])).filter(Boolean)

  const res: Res[] = ops.map(op => {
    const daOp = doTime.filter(r => r.o === op)
    const daSemana = daOp.filter(r => r.dc >= sem.ini && r.dc <= sem.fim)
    const dias = Array.from({ length: sem.dias }, (_, i) => daSemana.filter(r => r.dc === addDias(sem.ini, i)).length)
    const total = daSemana.length
    const meta = metaSemanalDe(config.metasSemanais, op, sem.ini)
    const semanasBonus = fechadas.filter(s => {
      const m = metaSemanalDe(config.metasSemanais, op, s)
      const t = daOp.filter(r => r.dc >= s && r.dc <= semanaDoMes(s).fim).length
      return m ? faixaDe(t, m.faixas) > 0 : false
    }).length
    return {
      op, dias, total, mes: daOp.filter(r => r.dc.startsWith(mes)).length, semanasBonus, semanasFechadas: fechadas.length,
      meta, faixa: meta ? faixaDe(total, meta.faixas) : 0, falta: meta ? faltaDe(total, meta.faixas) : null,
      ating: meta ? total / meta.faixas[0] : null,
    }
  }).filter(r => r.mes > 0 || r.meta?.propria).sort((a, b) => b.total - a.total || b.mes - a.mes)

  // time = soma das operadoras com meta
  const comMeta = res.filter(r => r.meta)
  const nFaixas = Math.max(0, ...comMeta.map(r => r.meta!.faixas.length))
  const faixasTime = Array.from({ length: nFaixas }, (_, i) => comMeta.reduce((s, r) => s + (r.meta!.faixas[i] ?? r.meta!.faixas[r.meta!.faixas.length - 1]), 0))
  const totalTime = res.reduce((s, r) => s + r.total, 0)
  const diasTime = Array.from({ length: sem.dias }, (_, i) => res.reduce((s, r) => s + r.dias[i], 0))
  const time = {
    total: totalTime, dias: diasTime, faixas: faixasTime, mes: res.reduce((s, r) => s + r.mes, 0),
    faixa: faixaDe(totalTime, faixasTime), falta: faixasTime.length ? faltaDe(totalTime, faixasTime) : null,
    ating: faixasTime[0] ? totalTime / faixasTime[0] : null,
  }
  const metaMes = config.metas.find(m => m.mes === mes) || null
  return { sem, res, time, metaMes }
}

export function SeloFaixa({ faixa, temMeta = true }: { faixa: number; temMeta?: boolean }) {
  if (!temMeta) return <span style={{ fontSize: 12, color: C.muito }}>sem meta</span>
  if (!faixa) return <span style={{ fontSize: 12, color: C.muito }}>abaixo</span>
  const c = CORES_FAIXA[Math.min(faixa, 3) - 1]
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>Faixa {faixa}</span>
}

function Barra({ total, faixas, alto = 14 }: { total: number; faixas: number[]; alto?: number }) {
  const topo = Math.max(total, faixas[faixas.length - 1] || 0) * 1.08 || 1
  return (
    <div style={{ position: 'relative', height: alto, background: '#F1F1EC', borderRadius: 99, minWidth: 120 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(total / topo) * 100}%`, background: C.verde, borderRadius: 99 }} />
      {faixas.map((f, i) => (
        <div key={i} title={`Faixa ${i + 1}: ${f}`} style={{ position: 'absolute', top: -3, bottom: -3, left: `${(f / topo) * 100}%`, width: 2, background: CORES_FAIXA[i]?.fg || C.texto }} />
      ))}
    </div>
  )
}

export default function MetaSemanal({ config, hoje, modo }: { config: Config; hoje: string; modo: 'resumo' | 'operadores' }) {
  const atual = semanaDoMes(hoje).ini
  const [semana, setSemana] = useState(atual)
  const inicioDados = primeiroDia(addMeses(hoje.slice(0, 7), -1))   // mesma consulta da meta do mês (cache)
  const dados = useLinhas('criacao', inicioDados, hoje)
  const calc = useMemo(() => (dados.linhas ? calcular(dados.linhas, config, semana, hoje) : null), [dados.linhas, config, semana, hoje])
  const ehAtual = semana === atual
  const podeVoltar = semanaAnterior(semana).ini >= inicioDados

  if (dados.erro) return <Aviso>{dados.erro}</Aviso>
  if (!config.metasSemanais.length) {
    return <Aviso tipo="info">Meta semanal: nenhuma meta cadastrada. Preencha a aba METAS_SEMANAIS da planilha de reservas.</Aviso>
  }
  if (!calc) return <div style={card}><Spinner texto="Calculando a meta semanal..." /></div>

  const { sem, res, time, metaMes } = calc
  const diasRestantes = ehAtual ? diffDias(hoje, sem.fim) + 1 : 0
  const titulo = `Meta semanal · ${sem.numero}ª semana de ${nomeMes(semana.slice(0, 7))} · ${dataCurta(sem.ini)} a ${dataCurta(sem.fim)}${ehAtual ? ' (atual)' : ''}`
  const curta = sem.dias < 7 ? ` · semana de ${sem.dias} dias: meta proporcional (× ${sem.dias}/7)` : ''

  // ─── Resumo: card compacto ───
  if (modo === 'resumo') {
    return (
      <Secao titulo={titulo}
        sub={`Central de reservas · reservas criadas pelo time · meta do time = soma das metas das operadoras${curta}${ehAtual ? ` · faltam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}` : ''}`}>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 12, color: C.suave }}>Time na semana</div>
            <div style={{ ...MONO, fontSize: 34, letterSpacing: -1 }}>{n0(time.total)}</div>
            <div style={{ fontSize: 12, color: C.suave }}>{pct(time.ating)} da faixa 1 · meta {time.faixas.map(n0).join(' / ')}</div>
          </div>
          <SeloFaixa faixa={time.faixa} temMeta={time.faixas.length > 0} />
          {ehAtual && time.falta !== null && (
            <div style={{ fontSize: 12, color: C.suave }}>
              faltam <b style={{ ...MONO, color: C.texto }}>{n0(time.falta)}</b> p/ próxima faixa · <b style={{ ...MONO, color: C.texto }}>{n1(time.falta / Math.max(1, diasRestantes))}</b>/dia
            </div>
          )}
          <div style={{ flex: 1, minWidth: 220 }}><Barra total={time.total} faixas={time.faixas} alto={16} /></div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))', gap: 8 }}>
          {res.map(r => (
            <div key={r.op} style={{ ...card, padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.op}</div>
                <div style={{ ...MONO, fontSize: 12, color: C.suave }}>{n0(r.total)}{r.meta ? ` / ${n0(r.meta.faixas[0])}` : ''}</div>
              </div>
              <SeloFaixa faixa={r.faixa} temMeta={!!r.meta} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: C.suave, marginTop: 8 }}>Detalhe por operadora, dia a dia e outras semanas na aba Operadores.</div>
      </Secao>
    )
  }

  // ─── Operadores: tabela completa ───
  async function exportar() {
    const XLSX = await import('xlsx')
    const linhas = res.map(r => ({
      Semana: `${sem.numero}ª semana de ${nomeMes(semana.slice(0, 7))} (${dataLonga(sem.ini)} a ${dataLonga(sem.fim)})`,
      Operadora: r.op, 'Reservas na semana': r.total, 'Meta base': r.meta?.base ?? '',
      ...Object.fromEntries((r.meta?.faixas || []).map((f, i) => [`Faixa ${i + 1} (${r.meta!.pcts[i]}%${r.meta!.curta ? ` × ${r.meta!.dias}/7` : ''})`, f])),
      Atingimento: r.ating !== null ? +r.ating.toFixed(4) : '', 'Faixa atingida': r.meta ? (r.faixa || 'Abaixo') : 'Sem meta',
      'Reservas no mês': r.mes, 'Semanas fechadas c/ bônus no mês': `${r.semanasBonus} de ${r.semanasFechadas}`,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'Meta semanal')
    XLSX.writeFile(wb, `meta_semanal_${sem.ini}_a_${sem.fim}.xlsx`)
  }

  const diasCols = Array.from({ length: sem.dias }, (_, i) => addDias(sem.ini, i))
  return (
    <Secao titulo={`Central de reservas — ${titulo}`}
      sub={`Reservas criadas por cada operadora do time, em todas as casas · semanas de 7 dias dentro do mês · meta do time = soma das metas das operadoras${curta}${ehAtual ? ` · faltam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}` : ''} · não muda com os filtros do topo`}
      direita={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={pill(false)} disabled={!podeVoltar} onClick={() => setSemana(s => semanaAnterior(s).ini)}>← anterior</button>
          <button style={pill(ehAtual)} onClick={() => setSemana(atual)}>Semana atual</button>
          <button style={pill(false)} disabled={ehAtual} onClick={() => setSemana(s => semanaSeguinte(s).ini)}>próxima →</button>
          <button style={botao} onClick={exportar}>Exportar Excel</button>
        </div>
      }>
      {config.restrito && <div style={{ fontSize: 12, color: C.suave, marginBottom: 8 }}>Você só vê as casas liberadas para o seu usuário: os totais podem ficar menores que os do bônus.</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th} />
              <th colSpan={diasCols.length + 6 + (ehAtual ? 1 : 0)} style={{ ...th, textAlign: 'center', color: C.texto }}>Semana</th>
              <th colSpan={2} style={{ ...th, textAlign: 'center', color: C.texto, borderLeft: `1px solid ${C.borda}` }}>{nomeMes(semana.slice(0, 7))}</th>
            </tr>
            <tr>
              <th style={th}>Operadora</th>
              {diasCols.map(d => (
                <th key={d} style={{ ...thNum, color: d === hoje ? C.texto : C.suave }}>{DIAS_SEMANA[diaSemana(d)]}<div style={{ fontWeight: 400, fontSize: 10.5 }}>{dataCurta(d)}</div></th>
              ))}
              <th style={thNum}>Reservas</th><th style={thNum}>Meta (faixas)</th><th style={th}>Progresso</th>
              <th style={thNum}>Ating.</th><th style={th}>Faixa</th><th style={thNum}>Falta</th>
              {ehAtual && <th style={thNum}>Ritmo nec./dia</th>}
              <th style={{ ...thNum, borderLeft: `1px solid ${C.borda}` }}>Reservas</th><th style={thNum}>Semanas c/ bônus</th>
            </tr>
          </thead>
          <tbody>
            {res.map(r => (
              <tr key={r.op}>
                <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.op}{r.meta?.propria && <div style={{ fontSize: 10.5, color: C.suave, fontWeight: 400 }}>meta própria</div>}</td>
                {r.dias.map((q, i) => {
                  const futuro = diasCols[i] > hoje
                  return <td key={i} style={{ ...tdNum, color: futuro ? '#DDD' : q ? C.texto : C.muito }}>{futuro ? '·' : q}</td>
                })}
                <td style={{ ...tdNum, fontWeight: 700, fontSize: 15 }}>{n0(r.total)}</td>
                <td style={{ ...tdNum, color: C.suave }}>{r.meta ? r.meta.faixas.map(n0).join(' / ') : 'sem meta'}</td>
                <td style={{ ...td, minWidth: 140 }}>{r.meta && <Barra total={r.total} faixas={r.meta.faixas} />}</td>
                <td style={tdNum}>{pct(r.ating)}</td>
                <td style={td}><SeloFaixa faixa={r.faixa} temMeta={!!r.meta} /></td>
                <td style={tdNum}>{r.falta !== null ? n0(r.falta) : r.meta ? <span style={{ color: CORES_FAIXA[2].fg, fontWeight: 600 }}>máx. ✓</span> : '—'}</td>
                {ehAtual && <td style={tdNum}>{r.falta !== null && diasRestantes ? n1(r.falta / diasRestantes) : '—'}</td>}
                <td style={{ ...tdNum, borderLeft: `1px solid ${C.borda}` }}>{n0(r.mes)}</td>
                <td style={tdNum}>{r.semanasFechadas ? `${r.semanasBonus} de ${r.semanasFechadas}` : '—'}</td>
              </tr>
            ))}
            <tr style={{ background: C.verde }}>
              <td style={{ ...td, fontWeight: 700, color: '#fff', borderBottom: 'none' }}>Total do time</td>
              {time.dias.map((q, i) => <td key={i} style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{diasCols[i] > hoje ? '·' : q}</td>)}
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 15, color: '#fff', borderBottom: 'none' }}>{n0(time.total)}</td>
              <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{time.faixas.map(n0).join(' / ') || '—'}</td>
              <td style={{ ...td, borderBottom: 'none' }}>{time.faixas.length > 0 && <Barra total={time.total} faixas={time.faixas} />}</td>
              <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{pct(time.ating)}</td>
              <td style={{ ...td, borderBottom: 'none' }}><SeloFaixa faixa={time.faixa} temMeta={time.faixas.length > 0} /></td>
              <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{time.falta !== null ? n0(time.falta) : '—'}</td>
              {ehAtual && <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{time.falta !== null && diasRestantes ? n1(time.falta / diasRestantes) : '—'}</td>}
              <td style={{ ...tdNum, color: '#fff', fontWeight: 700, borderBottom: 'none', borderLeft: '1px solid rgba(255,255,255,.3)' }}>{n0(time.mes)}</td>
              <td style={{ ...tdNum, color: '#fff', borderBottom: 'none', fontSize: 11.5 }}>
                {metaMes?.faixas?.length ? <>meta mês {n0(metaMes.faixas[0])} · {pct(time.mes / metaMes.faixas[0])}</> : '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11.5, color: C.suave, alignItems: 'center', flexWrap: 'wrap' }}>
        {CORES_FAIXA.map((c, i) => <span key={i} style={{ padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.fg, fontWeight: 600 }}>Faixa {i + 1}</span>)}
        <span>“Semanas c/ bônus” conta só as semanas do mês já encerradas. Na linha do total, o mês é comparado com a faixa 1 da meta do mês (aba METAS).</span>
      </div>
    </Secao>
  )
}
