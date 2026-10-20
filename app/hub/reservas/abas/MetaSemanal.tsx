'use client'

// Meta semanal do time de reservas (bônus) — aba Operadores.
// Cada operadora é medida nos DIAS DA ESCALA dela naquela semana (aba ESCALA: mes | semana | operador | dias).
// Sem escala cadastrada, vale a semana do calendário (1–7, 8–14, 15–21, 22–28, 29–fim).
// Conta as reservas CRIADAS pela operadora nesses dias (as mesmas que entram na meta do mês), em todas as casas.
// Meta: aba METAS_SEMANAIS (meta base × % da faixa). Meta do time = soma das metas das operadoras.

import { useMemo, useState } from 'react'
import {
  type Config, type Linha, DIAS_SEMANA, addMeses, dataCurta, diaSemana, escalaDaSemana, listaDias, metaSemanalDe,
  n0, n1, nomeMes, pct, primeiroDia, semanaAnterior, semanaDoMes, semanaSeguinte, useLinhas,
} from '../utils'
import { Aviso, C, Secao, Spinner, botao, card, pill, td, tdNum, th, thNum } from '../ui'

export const CORES_FAIXA = [
  { bg: '#FFF2CC', fg: '#8A6D00' },   // faixa 1
  { bg: '#D9EAD3', fg: '#38761D' },   // faixa 2
  { bg: '#C9DAF8', fg: '#1C4587' },   // faixa 3
]

type Res = {
  op: string; dias: string[]; temEscala: boolean; porDia: Map<string, number>; total: number
  meta: ReturnType<typeof metaSemanalDe>; faixa: number; falta: number | null; ating: number | null
  restantes: number; mes: number; semanasBonus: number; semanasFechadas: number
}

const faixaDe = (total: number, faixas: number[]) => faixas.filter(f => total >= f).length
const faltaDe = (total: number, faixas: number[]) => { const p = faixas.find(f => f > total); return p !== undefined ? p - total : null }

// Resultado de UMA operadora numa semana (nº da semana do mês)
function resultado(doTime: Linha[], config: Config, op: string, ini: string, hoje: string) {
  const sem = semanaDoMes(ini)
  const esc = escalaDaSemana(config, ini.slice(0, 7), sem.numero).get(op)
  const dias = esc || listaDias(sem.ini, sem.fim)
  const set = new Set(dias)
  const daOp = doTime.filter(r => r.o === op)
  const total = daOp.filter(r => set.has(r.dc)).length
  const meta = metaSemanalDe(config.metasSemanais, op, sem.ini, esc ? esc.length : undefined, config)
  return { dias, temEscala: !!esc, total, meta, encerrada: dias[dias.length - 1] < hoje, daOp }
}

function calcular(linhas: Linha[], config: Config, semana: string, hoje: string) {
  const sem = semanaDoMes(semana)
  const mes = semana.slice(0, 7)
  const doTime = linhas.filter(r => r.m)
  const escala = escalaDaSemana(config, mes, sem.numero)

  const semanasMes: string[] = []
  for (let s = primeiroDia(mes); s.startsWith(mes); s = semanaSeguinte(s).ini) semanasMes.push(s)

  const ops = Array.from(new Set([
    ...doTime.filter(r => r.dc.startsWith(mes)).map(r => r.o),
    ...Array.from(escala.keys()),
  ])).filter(Boolean)

  const res: Res[] = ops.map(op => {
    const r = resultado(doTime, config, op, semana, hoje)
    const porDia = new Map<string, number>()
    r.daOp.filter(x => x.dc >= (r.dias[0] < sem.ini ? r.dias[0] : sem.ini)).forEach(x => porDia.set(x.dc, (porDia.get(x.dc) || 0) + 1))
    // semanas do mês já encerradas com bônus (cada uma pela escala daquela semana)
    const fechadas = semanasMes.map(s => resultado(doTime, config, op, s, hoje)).filter(x => x.encerrada)
    return {
      op, dias: r.dias, temEscala: r.temEscala, porDia, total: r.total, meta: r.meta,
      faixa: r.meta ? faixaDe(r.total, r.meta.faixas) : 0, falta: r.meta ? faltaDe(r.total, r.meta.faixas) : null,
      ating: r.meta ? r.total / r.meta.faixas[0] : null, restantes: r.dias.filter(d => d >= hoje).length,
      mes: r.daOp.filter(x => x.dc.startsWith(mes)).length,
      semanasBonus: fechadas.filter(x => x.meta && faixaDe(x.total, x.meta.faixas) > 0).length, semanasFechadas: fechadas.length,
    }
  }).filter(r => r.mes > 0 || r.temEscala).sort((a, b) => b.total - a.total || b.mes - a.mes)

  // colunas: todos os dias de escala da semana (ou a semana do calendário)
  const colunas = Array.from(new Set(res.flatMap(r => r.dias).concat(listaDias(sem.ini, sem.fim)))).sort()

  const comMeta = res.filter(r => r.meta)
  const nFaixas = Math.max(0, ...comMeta.map(r => r.meta!.faixas.length))
  const faixasTime = Array.from({ length: nFaixas }, (_, i) => comMeta.reduce((s, r) => s + (r.meta!.faixas[i] ?? r.meta!.faixas[r.meta!.faixas.length - 1]), 0))
  const totalTime = res.reduce((s, r) => s + r.total, 0)
  const time = {
    total: totalTime, faixas: faixasTime, mes: res.reduce((s, r) => s + r.mes, 0),
    faixa: faixaDe(totalTime, faixasTime), falta: faixasTime.length ? faltaDe(totalTime, faixasTime) : null,
    ating: faixasTime[0] ? totalTime / faixasTime[0] : null,
    restantes: Math.max(0, ...res.map(r => r.restantes)),
    porDia: colunas.map(d => res.reduce((s, r) => s + (r.dias.includes(d) ? (r.porDia.get(d) || 0) : 0), 0)),
  }
  const metaMes = config.metas.find(m => m.mes === mes) || null
  return { sem, res, time, metaMes, colunas, temEscala: escala.size > 0 }
}

export function SeloFaixa({ faixa, temMeta = true }: { faixa: number; temMeta?: boolean }) {
  if (!temMeta) return <span style={{ fontSize: 12, color: C.muito }}>sem meta</span>
  if (!faixa) return <span style={{ fontSize: 12, color: C.muito }}>abaixo</span>
  const c = CORES_FAIXA[Math.min(faixa, 3) - 1]
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>Faixa {faixa}</span>
}

function Barra({ total, faixas }: { total: number; faixas: number[] }) {
  const topo = Math.max(total, faixas[faixas.length - 1] || 0) * 1.08 || 1
  return (
    <div style={{ position: 'relative', height: 14, background: '#F1F1EC', borderRadius: 99, minWidth: 120 }}>
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(total / topo) * 100}%`, background: C.verde, borderRadius: 99 }} />
      {faixas.map((f, i) => (
        <div key={i} title={`Faixa ${i + 1}: ${f}`} style={{ position: 'absolute', top: -3, bottom: -3, left: `${(f / topo) * 100}%`, width: 2, background: CORES_FAIXA[i]?.fg || C.texto }} />
      ))}
    </div>
  )
}

export default function MetaSemanal({ config, hoje }: { config: Config; hoje: string }) {
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

  const { sem, res, time, metaMes, colunas } = calc
  const mesNome = nomeMes(semana.slice(0, 7))
  const algumaRestante = res.some(r => r.restantes > 0 && r.falta !== null)

  async function exportar() {
    const XLSX = await import('xlsx')
    const linhas = res.map(r => ({
      Semana: `Semana ${sem.numero} de ${mesNome}`, Operadora: r.op,
      'Dias contados': r.dias.map(d => d.slice(8, 10)).join('-') + (r.temEscala ? '' : ' (semana do calendário)'),
      'Reservas nos dias': r.total, 'Meta base': r.meta?.base ?? '',
      ...Object.fromEntries((r.meta?.faixas || []).map((f, i) => [`Faixa ${i + 1} (${r.meta!.pcts[i]}%${r.meta!.curta ? ' proporcional' : ''})`, f])),
      Atingimento: r.ating !== null ? +r.ating.toFixed(4) : '', 'Faixa atingida': r.meta ? (r.faixa || 'Abaixo') : 'Sem meta',
      'Reservas no mês': r.mes, 'Semanas encerradas c/ bônus no mês': `${r.semanasBonus} de ${r.semanasFechadas}`,
    }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'Meta semanal')
    XLSX.writeFile(wb, `meta_semanal_${semana.slice(0, 7)}_semana_${sem.numero}.xlsx`)
  }

  return (
    <Secao titulo={`Central de reservas — meta semanal · Semana ${sem.numero} de ${mesNome}${ehAtual ? ' (atual)' : ''}`}
      sub={`Cada operadora conta só nos dias da escala dela (aba ESCALA) · fundo verde = dia de escala · (n) = reservas fora da escala, não contam · sem escala = semana do calendário ${dataCurta(sem.ini)} a ${dataCurta(sem.fim)} · meta do time = soma das metas · não muda com os filtros do topo`}
      direita={
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={pill(false)} disabled={!podeVoltar} onClick={() => setSemana(s => semanaAnterior(s).ini)}>← anterior</button>
          <button style={pill(ehAtual)} onClick={() => setSemana(atual)}>Semana atual</button>
          <button style={pill(false)} disabled={ehAtual} onClick={() => setSemana(s => semanaSeguinte(s).ini)}>próxima →</button>
          <button style={botao} onClick={exportar}>Exportar Excel</button>
        </div>
      }>
      {!calc.temEscala && <Aviso tipo="info">Sem escala cadastrada para a semana {sem.numero} de {mesNome}: usando a semana do calendário ({dataCurta(sem.ini)} a {dataCurta(sem.fim)}). Preencha a aba ESCALA da planilha.</Aviso>}
      {config.restrito && <div style={{ fontSize: 12, color: C.suave, margin: '8px 0' }}>Você só vê as casas liberadas para o seu usuário: os totais podem ficar menores que os do bônus.</div>}
      <div style={{ overflowX: 'auto', marginTop: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th} />
              <th colSpan={colunas.length + 6 + (algumaRestante ? 1 : 0)} style={{ ...th, textAlign: 'center', color: C.texto }}>Semana {sem.numero}</th>
              <th colSpan={2} style={{ ...th, textAlign: 'center', color: C.texto, borderLeft: `1px solid ${C.borda}` }}>{mesNome}</th>
            </tr>
            <tr>
              <th style={th}>Operadora</th>
              {colunas.map(d => (
                <th key={d} style={{ ...thNum, color: d === hoje ? C.texto : C.suave, padding: '9px 8px' }}>{DIAS_SEMANA[diaSemana(d)]}<div style={{ fontWeight: 400, fontSize: 10.5 }}>{dataCurta(d)}</div></th>
              ))}
              <th style={thNum}>Reservas</th><th style={thNum}>Meta (faixas)</th><th style={th}>Progresso</th>
              <th style={thNum}>Ating.</th><th style={th}>Faixa</th><th style={thNum}>Falta</th>
              {algumaRestante && <th style={thNum}>Ritmo nec./dia</th>}
              <th style={{ ...thNum, borderLeft: `1px solid ${C.borda}` }}>Reservas</th><th style={thNum}>Semanas c/ bônus</th>
            </tr>
          </thead>
          <tbody>
            {res.map(r => (
              <tr key={r.op}>
                <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {r.op}
                  <div style={{ fontSize: 10.5, color: C.suave, fontWeight: 400 }}>
                    {r.temEscala ? `escala ${r.dias.map(d => d.slice(8, 10)).join('-')}` : 'sem escala (calendário)'}{r.meta?.propria ? ' · meta própria' : ''}
                  </div>
                </td>
                {colunas.map(d => {
                  const q = r.porDia.get(d) || 0
                  const naEscala = r.dias.includes(d)
                  const futuro = d > hoje
                  return (
                    <td key={d} style={{ ...tdNum, padding: '8px', background: naEscala ? '#EEF5E6' : undefined, color: naEscala ? (q ? C.texto : C.muito) : '#BBB', fontStyle: naEscala ? 'normal' : 'italic' }}>
                      {naEscala ? (futuro ? '·' : q) : q ? `(${q})` : ''}
                    </td>
                  )
                })}
                <td style={{ ...tdNum, fontWeight: 700, fontSize: 15 }}>{n0(r.total)}</td>
                <td style={{ ...tdNum, color: C.suave }}>
                  {r.meta ? r.meta.faixas.map(n0).join(' / ') : 'sem meta'}
                  {r.meta?.curta && <div style={{ fontSize: 10.5 }}>proporcional ({r.meta.dias} {r.meta.porEscala ? 'de 5' : 'de 7'} dias)</div>}
                </td>
                <td style={{ ...td, minWidth: 140 }}>{r.meta && <Barra total={r.total} faixas={r.meta.faixas} />}</td>
                <td style={tdNum}>{pct(r.ating)}</td>
                <td style={td}><SeloFaixa faixa={r.faixa} temMeta={!!r.meta} /></td>
                <td style={tdNum}>{r.falta !== null ? n0(r.falta) : r.meta ? <span style={{ color: CORES_FAIXA[2].fg, fontWeight: 600 }}>máx. ✓</span> : '—'}</td>
                {algumaRestante && <td style={tdNum}>{r.falta !== null && r.restantes ? <>{n1(r.falta / r.restantes)}<div style={{ fontSize: 10.5, color: C.suave }}>{r.restantes} {r.restantes === 1 ? 'dia' : 'dias'}</div></> : '—'}</td>}
                <td style={{ ...tdNum, borderLeft: `1px solid ${C.borda}` }}>{n0(r.mes)}</td>
                <td style={tdNum}>{r.semanasFechadas ? `${r.semanasBonus} de ${r.semanasFechadas}` : '—'}</td>
              </tr>
            ))}
            {!res.length && <tr><td style={{ ...td, color: C.suave }} colSpan={colunas.length + 10}>Nenhuma reserva do time nessa semana.</td></tr>}
            <tr style={{ background: C.verde }}>
              <td style={{ ...td, fontWeight: 700, color: '#fff', borderBottom: 'none' }}>Total do time</td>
              {time.porDia.map((q, i) => <td key={i} style={{ ...tdNum, padding: '8px', color: '#fff', borderBottom: 'none' }}>{colunas[i] > hoje ? '·' : q}</td>)}
              <td style={{ ...tdNum, fontWeight: 700, fontSize: 15, color: '#fff', borderBottom: 'none' }}>{n0(time.total)}</td>
              <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{time.faixas.map(n0).join(' / ') || '—'}</td>
              <td style={{ ...td, borderBottom: 'none' }}>{time.faixas.length > 0 && <Barra total={time.total} faixas={time.faixas} />}</td>
              <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{pct(time.ating)}</td>
              <td style={{ ...td, borderBottom: 'none' }}><SeloFaixa faixa={time.faixa} temMeta={time.faixas.length > 0} /></td>
              <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{time.falta !== null ? n0(time.falta) : '—'}</td>
              {algumaRestante && <td style={{ ...tdNum, color: '#fff', borderBottom: 'none' }}>{time.falta !== null && time.restantes ? n1(time.falta / time.restantes) : '—'}</td>}
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
        <span>Meta cheia para 5 dias de escala (menos dias = proporcional). “Semanas c/ bônus” conta as semanas do mês em que a escala da operadora já terminou.</span>
      </div>
    </Secao>
  )
}
