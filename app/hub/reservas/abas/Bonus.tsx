'use client'

// Bônus semanal por operadora do time de reservas.
// Conta as reservas CRIADAS pela operadora (as mesmas que entram na meta do mês), de segunda a domingo,
// em todas as casas. Metas na aba METAS_SEMANAIS da planilha (meta base + faixas em %).

import { useMemo, useState } from 'react'
import {
  type Config, type Linha, DIAS_SEMANA, addDias, dataCurta, dataLonga, diffDias, metaSemanalDe, n0, n1, pct, segunda, useLinhas,
} from '../utils'
import { Aviso, C, MONO, Secao, Spinner, botao, card, pill, td, tdNum, th, thNum } from '../ui'

const SEMANAS_HIST = 6
const CORES_FAIXA = [
  { bg: '#FFF2CC', fg: '#8A6D00' },   // faixa 1
  { bg: '#D9EAD3', fg: '#38761D' },   // faixa 2
  { bg: '#C9DAF8', fg: '#1C4587' },   // faixa 3
]

type Resultado = {
  op: string; dias: number[]; total: number
  meta: ReturnType<typeof metaSemanalDe>; faixa: number; falta: number | null; ating: number | null
}

function calcular(linhas: Linha[], metas: Config['metasSemanais'], semana: string, ops: string[]): Resultado[] {
  const fim = addDias(semana, 6)
  const daSemana = linhas.filter(r => r.m && r.dc >= semana && r.dc <= fim)
  return ops.map(op => {
    const l = daSemana.filter(r => r.o === op)
    const dias = Array.from({ length: 7 }, (_, i) => l.filter(r => r.dc === addDias(semana, i)).length)
    const total = l.length
    const meta = metaSemanalDe(metas, op, semana)
    const faixa = meta ? meta.faixas.filter(f => total >= f).length : 0
    const proxima = meta ? meta.faixas.find(f => f > total) : undefined
    return { op, dias, total, meta, faixa, falta: proxima !== undefined ? proxima - total : null, ating: meta ? total / meta.faixas[0] : null }
  })
}

function SeloFaixa({ faixa, total }: { faixa: number; total?: number }) {
  if (!faixa) return <span style={{ fontSize: 12, color: C.muito }}>{total === undefined ? '—' : 'abaixo'}</span>
  const c = CORES_FAIXA[Math.min(faixa, 3) - 1]
  return <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: c.bg, color: c.fg, whiteSpace: 'nowrap' }}>Faixa {faixa}</span>
}

function Barra({ total, faixas }: { total: number; faixas: number[] }) {
  const topo = Math.max(total, faixas[faixas.length - 1] || 0) * 1.08 || 1
  return (
    <div style={{ position: 'relative', height: 14, background: '#F1F1EC', borderRadius: 99, minWidth: 140 }}>
      <div style={{ position: 'absolute', inset: 0, width: `${(total / topo) * 100}%`, background: C.verde, borderRadius: 99 }} />
      {faixas.map((f, i) => (
        <div key={i} title={`Faixa ${i + 1}: ${f}`} style={{ position: 'absolute', top: -3, bottom: -3, left: `${(f / topo) * 100}%`, width: 2, background: CORES_FAIXA[i]?.fg || C.texto }} />
      ))}
    </div>
  )
}

export default function Bonus({ config, hoje }: { config: Config; hoje: string }) {
  const atual = segunda(hoje)
  const [semana, setSemana] = useState(atual)
  const inicioHist = addDias(semana, -7 * (SEMANAS_HIST - 1))
  const fimSemana = addDias(semana, 6)
  const dados = useLinhas('criacao', inicioHist, fimSemana < hoje ? fimSemana : hoje)
  const ehAtual = semana === atual

  const calc = useMemo(() => {
    if (!dados.linhas) return null
    // operadoras: quem fez reserva como time no período + quem tem meta própria
    const ops = Array.from(new Set([
      ...dados.linhas.filter(r => r.m).map(r => r.o),
      ...config.metasSemanais.filter(m => m.operador).map(m => m.operador),
    ])).filter(Boolean)
    const semanas = Array.from({ length: SEMANAS_HIST }, (_, i) => addDias(inicioHist, 7 * i))
    const porSemana = new Map(semanas.map(s => [s, calcular(dados.linhas!, config.metasSemanais, s, ops)]))
    const atualRes = (porSemana.get(semana) || []).filter(r => r.total > 0 || (r.meta && r.meta.propria))
      .sort((a, b) => b.total - a.total)
    const opsHist = Array.from(new Set(semanas.flatMap(s => (porSemana.get(s) || []).filter(r => r.total > 0).map(r => r.op))))
      .sort((a, b) => a.localeCompare(b))
    return { semanas, porSemana, atualRes, opsHist }
  }, [dados.linhas, config.metasSemanais, semana, inicioHist])

  const diasRestantes = ehAtual ? diffDias(hoje, fimSemana) + 1 : 0
  const semMeta = !config.metasSemanais.length

  async function exportar() {
    if (!calc) return
    const XLSX = await import('xlsx')
    const linhas = calc.semanas.flatMap(s => (calc.porSemana.get(s) || []).filter(r => r.total > 0).map(r => ({
      Semana: `${dataLonga(s)} a ${dataLonga(addDias(s, 6))}`, Operadora: r.op, Reservas: r.total,
      'Meta base (100%)': r.meta?.base ?? '', ...Object.fromEntries((r.meta?.faixas || []).map((f, i) => [`Faixa ${i + 1} (${r.meta!.pcts[i]}%)`, f])),
      Atingimento: r.ating !== null ? +r.ating.toFixed(4) : '', 'Faixa atingida': r.faixa || 'Abaixo',
    })))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(linhas), 'Bônus semanal')
    XLSX.writeFile(wb, `bonus_semanal_${calc.semanas[0]}_a_${addDias(semana, 6)}.xlsx`)
  }

  return (
    <>
      <Secao
        titulo={`Bônus semanal · ${dataCurta(semana)} a ${dataCurta(fimSemana)}${ehAtual ? ' (semana atual)' : ''}`}
        sub={`Reservas criadas por cada operadora do time, de segunda a domingo, em todas as casas · metas na aba METAS_SEMANAIS (meta base × % de cada faixa, arredondado para baixo)${ehAtual ? ` · faltam ${diasRestantes} ${diasRestantes === 1 ? 'dia' : 'dias'}` : ''}`}
        direita={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button style={pill(false)} onClick={() => setSemana(s => addDias(s, -7))}>← semana anterior</button>
            <button style={pill(ehAtual)} onClick={() => setSemana(atual)}>Semana atual</button>
            <button style={pill(false)} disabled={ehAtual} onClick={() => setSemana(s => addDias(s, 7))}>próxima →</button>
            {calc && <button style={botao} onClick={exportar}>Exportar Excel</button>}
          </div>
        }>
        {dados.erro && <Aviso>{dados.erro}</Aviso>}
        {semMeta && <Aviso tipo="info">Nenhuma meta semanal cadastrada. Preencha a aba METAS_SEMANAIS da planilha de reservas.</Aviso>}
        {config.restrito && <div style={{ fontSize: 12, color: C.suave, marginBottom: 8 }}>Atenção: você só vê as casas liberadas para o seu usuário, então os totais podem ficar menores que os do bônus.</div>}
        {!calc ? <Spinner /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Operadora</th>
                {DIAS_SEMANA.slice(1).concat(DIAS_SEMANA[0]).map((d, i) => (
                  <th key={d} style={{ ...thNum, color: addDias(semana, i) === hoje ? C.texto : C.suave }}>{d}<div style={{ fontWeight: 400, fontSize: 10.5 }}>{dataCurta(addDias(semana, i))}</div></th>
                ))}
                <th style={thNum}>Reservas</th>
                <th style={thNum}>Meta (faixas)</th>
                <th style={th}>Progresso</th>
                <th style={thNum}>Ating.</th>
                <th style={th}>Faixa</th>
                <th style={thNum}>Falta p/ próxima</th>
                {ehAtual && <th style={thNum}>Ritmo nec./dia</th>}
              </tr></thead>
              <tbody>
                {calc.atualRes.map(r => (
                  <tr key={r.op}>
                    <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{r.op}{r.meta?.propria && <div style={{ fontSize: 10.5, color: C.suave, fontWeight: 400 }}>meta própria</div>}</td>
                    {r.dias.map((q, i) => {
                      const futuro = addDias(semana, i) > hoje
                      return <td key={i} style={{ ...tdNum, color: futuro ? '#DDD' : q ? C.texto : C.muito }}>{futuro ? '·' : q}</td>
                    })}
                    <td style={{ ...tdNum, fontWeight: 700, fontSize: 15 }}>{n0(r.total)}</td>
                    <td style={{ ...tdNum, color: C.suave }}>{r.meta ? r.meta.faixas.map(n0).join(' / ') : 'sem meta'}</td>
                    <td style={{ ...td, minWidth: 160 }}>{r.meta && <Barra total={r.total} faixas={r.meta.faixas} />}</td>
                    <td style={tdNum}>{pct(r.ating)}</td>
                    <td style={td}><SeloFaixa faixa={r.faixa} total={r.total} /></td>
                    <td style={tdNum}>{r.falta !== null ? n0(r.falta) : r.meta ? <span style={{ color: CORES_FAIXA[2].fg, fontWeight: 600 }}>máxima ✓</span> : '—'}</td>
                    {ehAtual && <td style={tdNum}>{r.falta !== null && diasRestantes ? n1(r.falta / diasRestantes) : '—'}</td>}
                  </tr>
                ))}
                {!calc.atualRes.length && <tr><td style={{ ...td, color: C.suave }} colSpan={16}>Nenhuma reserva do time nessa semana.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </Secao>

      {calc && (
        <Secao titulo={`Histórico · últimas ${SEMANAS_HIST} semanas`} sub="Reservas da operadora na semana e a faixa atingida (cor) · para conferir o pagamento do bônus">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Operadora</th>
                {calc.semanas.map(s => <th key={s} style={{ ...thNum, color: s === semana ? C.texto : C.suave }}>{dataCurta(s)}<div style={{ fontWeight: 400, fontSize: 10.5 }}>a {dataCurta(addDias(s, 6))}</div></th>)}
                <th style={thNum}>Semanas c/ bônus</th>
              </tr></thead>
              <tbody>
                {calc.opsHist.map(op => {
                  const res = calc.semanas.map(s => (calc.porSemana.get(s) || []).find(r => r.op === op))
                  const fechadas = calc.semanas.filter(s => addDias(s, 6) < hoje).length
                  const comBonus = res.filter((r, i) => r && r.faixa > 0 && addDias(calc.semanas[i], 6) < hoje).length
                  return (
                    <tr key={op}>
                      <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{op}</td>
                      {res.map((r, i) => {
                        const cor = r && r.faixa ? CORES_FAIXA[Math.min(r.faixa, 3) - 1] : null
                        return (
                          <td key={i} title={r?.meta ? `Faixas ${r.meta.faixas.join(' / ')}` : 'sem meta'}
                            style={{ ...tdNum, background: cor?.bg, color: cor?.fg || (r?.total ? C.texto : C.muito), fontWeight: cor ? 700 : 400 }}>
                            {r?.total ? n0(r.total) : '·'}
                            {cor && <div style={{ fontSize: 10, fontWeight: 600 }}>F{r!.faixa}</div>}
                          </td>
                        )
                      })}
                      <td style={{ ...tdNum, ...MONO }}>{comBonus} de {fechadas}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, fontSize: 11.5, color: C.suave, alignItems: 'center', flexWrap: 'wrap' }}>
            {CORES_FAIXA.map((c, i) => <span key={i} style={{ ...card, padding: '2px 8px', background: c.bg, color: c.fg, fontWeight: 600, border: 'none' }}>Faixa {i + 1}</span>)}
            <span>A semana atual ainda está em andamento e não entra em “semanas c/ bônus”.</span>
          </div>
        </Secao>
      )}
    </>
  )
}
