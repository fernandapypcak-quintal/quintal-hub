'use client'

// Metas por casa — aba do dashboard de Reservas (sub-permissão 'reservas-metas').
// Meta da casa = cada faixa (e o desafio) da meta mensal do time × peso da casa no mesmo mês de 2025 (pesos.ts).
// Conta só reservas criadas pelos operadores do time (conta_meta), pela DATA DE CRIAÇÃO — mesma regra da meta do mês.
// Casas críticas: a supervisora fica com a faixa N só se TODAS as casas críticas baterem a faixa N da casa.
// Projeção por casa: mesma conta da meta do mês (média de cada dia da semana nas últimas 4 semanas).

import { useMemo, useState } from 'react'
import { type UnitId, UNITS, unitIdFromString } from '@/lib/units'
import { type Config, type Linha, addMeses, n0, n1, nomeMes, pct, primeiroDia, projetarMes, ultimoDia, useLinhas } from '../utils'
import { Aviso, C, Secao, Spinner, Tag, card, pill, td, tdNum, th, thNum } from '../ui'
import { Barra, CORES_FAIXA, SeloFaixa } from './MetaSemanal'
import { ANO_BASE_PESO, CASAS_CRITICAS, SUPERVISORA, pesoDaCasa, reservasBase } from '../pesos'

type Casa = {
  id: UnitId; nome: string; critica: boolean; peso: number; base: number
  faixas: number[]; desafio: number | null; total: number; projecao: number; ritmo: number; restantes: number
}

const faixaDe = (v: number, faixas: number[]) => faixas.filter(f => v >= f).length
const faltaDe = (v: number, faixas: number[]) => { const p = faixas.find(f => f > v); return p !== undefined ? p - v : null }
const nomeCasa = (id: UnitId) => (id === 'santo_andre' ? 'Santo André' : UNITS.find(u => u.id === id)?.label || id)

function calcular(linhas: Linha[], config: Config, mes: string, hoje: string) {
  const meta = config.metas.find(m => m.mes === mes)
  if (!meta) return null
  const aberto = mes === hoje.slice(0, 7)
  const faixasTime = [...meta.faixas].sort((a, b) => a - b)

  const porCasa = new Map<UnitId, Linha[]>()
  let semCasa = 0
  for (const r of linhas) {
    if (!r.m) continue
    const id = unitIdFromString(r.u)
    if (!id) { if (r.dc.startsWith(mes)) semCasa++; continue }
    const a = porCasa.get(id); if (a) a.push(r); else porCasa.set(id, [r])
  }

  const liberadas = new Set(config.unidades.map(u => unitIdFromString(u)))
  const casas: Casa[] = UNITS.filter(u => u.id !== 'holding' && liberadas.has(u.id)).map(u => {
    const peso = pesoDaCasa(u.id, mes)
    const l = porCasa.get(u.id) || []
    const p = aberto ? projetarMes(l, hoje) : null
    const total = p ? p.realizado : l.filter(r => r.dc.startsWith(mes)).length
    return {
      id: u.id, nome: nomeCasa(u.id), critica: CASAS_CRITICAS.includes(u.id), peso, base: reservasBase(u.id, mes),
      faixas: faixasTime.map(f => Math.round(f * peso)), desafio: meta.desafio ? Math.round(meta.desafio * peso) : null,
      total, projecao: p ? p.projecao : total, ritmo: p ? p.ritmo : 0, restantes: p ? p.diasRestantes : 0,
    }
  }).sort((a, b) => b.peso - a.peso)

  return { casas, aberto, faixasTime, desafioTime: meta.desafio, semCasa }
}

// ─── Tabela de casas (mesmo desenho da meta semanal) ────────────────────
function TabelaCasas({ casas, aberto, rodape }: { casas: Casa[]; aberto: boolean; rodape: React.ReactNode }) {
  const temDesafio = casas.some(c => c.desafio)
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Casa</th><th style={thNum}>Peso</th><th style={thNum}>Reservas</th><th style={thNum}>Meta (faixas)</th>
            <th style={th}>Progresso</th><th style={thNum}>Ating.</th><th style={th}>Faixa</th><th style={thNum}>Falta</th>
            {aberto && <><th style={thNum}>Ritmo nec./dia</th><th style={thNum}>Projeção</th><th style={th}>Faixa projetada</th></>}
            {temDesafio && <th style={thNum}>Desafio</th>}
          </tr>
        </thead>
        <tbody>
          {casas.map(c => {
            const falta = faltaDe(c.total, c.faixas)
            return (
              <tr key={c.id}>
                <td style={{ ...td, fontWeight: 600, whiteSpace: 'nowrap' }}>{c.nome}</td>
                <td style={{ ...tdNum, color: C.suave }}>{pct(c.peso)}</td>
                <td style={{ ...tdNum, fontWeight: 700, fontSize: 15 }}>{n0(c.total)}</td>
                <td style={{ ...tdNum, color: C.suave }}>{c.faixas.map(n0).join(' / ')}</td>
                <td style={{ ...td, minWidth: 140 }}><Barra total={c.total} faixas={c.faixas} /></td>
                <td style={tdNum}>{pct(c.faixas[0] ? c.total / c.faixas[0] : null)}</td>
                <td style={td}><SeloFaixa faixa={faixaDe(c.total, c.faixas)} /></td>
                <td style={tdNum}>{falta !== null ? n0(falta) : <span style={{ color: CORES_FAIXA[2].fg, fontWeight: 600 }}>máx. ✓</span>}</td>
                {aberto && <>
                  <td style={tdNum}>{falta !== null && c.restantes ? <>{n1(falta / c.restantes)}<div style={{ fontSize: 10.5, color: C.suave }}>atual {n1(c.ritmo)}</div></> : '—'}</td>
                  <td style={tdNum}>{n0(c.projecao)}</td>
                  <td style={td}><SeloFaixa faixa={faixaDe(c.projecao, c.faixas)} /></td>
                </>}
                {temDesafio && <td style={{ ...tdNum, color: c.desafio && c.total >= c.desafio ? '#8A6D00' : C.suave, fontWeight: c.desafio && c.total >= c.desafio ? 700 : 400 }}>
                  {c.desafio ? `${n0(c.desafio)}${c.total >= c.desafio ? ' ✓' : ''}` : '—'}
                </td>}
              </tr>
            )
          })}
          {rodape}
        </tbody>
      </table>
    </div>
  )
}

// Selo em cima do verde (linha de total) e selo grande dos cards
function SeloVerde({ faixa }: { faixa: number }) {
  return faixa ? <SeloFaixa faixa={faixa} /> : <span style={{ fontSize: 12, color: 'rgba(255,255,255,.85)' }}>abaixo</span>
}
function SeloGrande({ faixa }: { faixa: number }) {
  if (!faixa) return <div style={{ fontSize: 20, fontWeight: 600, color: C.vermelho, marginTop: 2 }}>Abaixo da faixa 1</div>
  const c = CORES_FAIXA[Math.min(faixa, 3) - 1]
  return <div style={{ fontSize: 20, fontWeight: 700, color: c.fg, marginTop: 2 }}>Faixa {faixa} ✓</div>
}

const tdTot: React.CSSProperties = { ...td, color: '#fff', borderBottom: 'none' }
const tdTotNum: React.CSSProperties = { ...tdNum, color: '#fff', borderBottom: 'none' }

export default function MetasPorCasa({ config, hoje }: { config: Config; hoje: string }) {
  const mesAtual = hoje.slice(0, 7)
  const [mes, setMes] = useState(mesAtual)
  const aberto = mes === mesAtual
  // mês aberto: mesma consulta da meta do mês (cache) — a projeção usa as últimas 4 semanas
  const dados = useLinhas('criacao', aberto ? primeiroDia(addMeses(mes, -1)) : primeiroDia(mes), aberto ? hoje : ultimoDia(mes))
  const calc = useMemo(() => (dados.linhas ? calcular(dados.linhas, config, mes, hoje) : null), [dados.linhas, config, mes, hoje])
  const primeiraMeta = [...config.metas].map(m => m.mes).sort()[0] || mesAtual
  const podeVoltar = addMeses(mes, -1) >= primeiraMeta

  const navegacao = (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <button style={pill(false)} disabled={!podeVoltar} onClick={() => setMes(m => addMeses(m, -1))}>← anterior</button>
      <button style={pill(aberto)} onClick={() => setMes(mesAtual)}>Mês atual</button>
      <button style={pill(false)} disabled={aberto} onClick={() => setMes(m => addMeses(m, 1))}>próximo →</button>
    </div>
  )

  if (dados.erro) return <Aviso>{dados.erro}</Aviso>
  if (!dados.linhas) return <div style={card}><Spinner texto="Calculando as metas por casa..." /></div>
  if (!calc) {
    return (
      <Secao titulo={`Metas por casa · ${nomeMes(mes)}`} direita={navegacao}>
        <Aviso tipo="info">Sem meta cadastrada para {nomeMes(mes)}. Preencha a aba METAS da planilha de reservas.</Aviso>
      </Secao>
    )
  }

  const { casas, faixasTime, desafioTime } = calc
  const criticas = casas.filter(c => c.critica)
  const demais = casas.filter(c => !c.critica)
  const todasCriticas = CASAS_CRITICAS.every(id => criticas.some(c => c.id === id))
  const mesBase = nomeMes(`${ANO_BASE_PESO}-${mes.slice(5, 7)}`)

  // Supervisora: fica com o menor nível entre as casas críticas
  const supFaixa = todasCriticas ? Math.min(...criticas.map(c => faixaDe(c.total, c.faixas))) : 0
  const supProj = todasCriticas ? Math.min(...criticas.map(c => faixaDe(c.projecao, c.faixas))) : 0
  const supDesafio = todasCriticas && criticas.every(c => c.desafio !== null && c.total >= c.desafio)
  const naF1 = criticas.filter(c => c.total >= c.faixas[0]).length
  const proxima = supFaixa < faixasTime.length ? supFaixa : null
  const travando = proxima !== null ? criticas.filter(c => c.total < c.faixas[proxima]) : []
  const somaCrit = criticas.reduce((s, c) => s + c.total, 0)

  const totTime = casas.reduce((s, c) => s + c.total, 0)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ ...card, padding: '12px 16px', borderTop: `3px solid ${supFaixa ? CORES_FAIXA[Math.min(supFaixa, 3) - 1].fg : C.vermelho}` }}>
          <div style={{ fontSize: 12, color: C.suave }}>Meta da {SUPERVISORA} · {nomeMes(mes)}</div>
          <div style={{ display: 'flex', alignItems: 'center' }}><SeloGrande faixa={supFaixa} />{supDesafio && <Tag cor="#8A6D00">DESAFIO</Tag>}</div>
          <div style={{ fontSize: 12, color: C.suave, marginTop: 6 }}>{naF1} de {CASAS_CRITICAS.length} casas críticas na faixa 1</div>
        </div>
        {calc.aberto && (
          <div style={{ ...card, padding: '12px 16px', borderTop: `3px solid ${supProj ? C.verde : C.vermelho}` }}>
            <div style={{ fontSize: 12, color: C.suave }}>{SUPERVISORA} pela projeção</div>
            <SeloGrande faixa={supProj} />
            <div style={{ fontSize: 12, color: C.suave, marginTop: 6 }}>{criticas.filter(c => c.projecao >= c.faixas[0]).length} de {CASAS_CRITICAS.length} projetadas na faixa 1</div>
          </div>
        )}
        <div style={{ ...card, padding: '12px 16px', borderTop: `3px solid ${C.azul}` }}>
          <div style={{ fontSize: 12, color: C.suave }}>Reservas nas casas críticas</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 24 }}>{n0(somaCrit)}</div>
          <div style={{ fontSize: 12, color: C.suave }}>{pct(totTime ? somaCrit / totTime : null)} do time · faixa 1 somada {n0(criticas.reduce((s, c) => s + c.faixas[0], 0))}</div>
        </div>
        <div style={{ ...card, padding: '12px 16px', borderTop: `3px solid ${travando.length ? C.amarelo : C.verde}` }}>
          <div style={{ fontSize: 12, color: C.suave }}>{proxima !== null ? `Travando a faixa ${proxima + 1}` : 'Faixas'}</div>
          {proxima !== null
            ? <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.55 }}>
                {travando.map(c => <div key={c.id}><b>{c.nome}</b> · faltam <span style={{ fontFamily: "'DM Mono', monospace" }}>{n0(c.faixas[proxima] - c.total)}</span></div>)}
              </div>
            : <div style={{ fontSize: 14, fontWeight: 600, marginTop: 6, color: CORES_FAIXA[2].fg }}>Todas na faixa máxima ✓</div>}
        </div>
      </div>

      <Secao titulo={`Casas críticas — meta da ${SUPERVISORA} · ${nomeMes(mes)}${calc.aberto ? ' (atual)' : ''}`}
        sub={`Meta da casa = meta do time × peso da casa em ${mesBase} · reservas criadas pelo time de reservas · a ${SUPERVISORA} fica com a faixa que TODAS as casas críticas baterem · não muda com os filtros do topo`}
        direita={navegacao}>
        {!todasCriticas && <div style={{ marginBottom: 10 }}><Aviso>Nem todas as casas críticas estão liberadas para o seu usuário: a meta da {SUPERVISORA} não pode ser calculada.</Aviso></div>}
        <TabelaCasas casas={criticas} aberto={calc.aberto} rodape={
          <tr style={{ background: C.verde }}>
            <td style={{ ...tdTot, fontWeight: 700 }}>{SUPERVISORA}</td>
            <td style={tdTotNum}>{pct(criticas.reduce((s, c) => s + c.peso, 0))}</td>
            <td style={{ ...tdTotNum, fontWeight: 700, fontSize: 15 }}>{n0(somaCrit)}</td>
            <td style={{ ...tdTotNum, fontSize: 11.5 }}>bate se as {CASAS_CRITICAS.length} baterem</td>
            <td style={tdTot} />
            <td style={tdTotNum}>{naF1}/{CASAS_CRITICAS.length}</td>
            <td style={tdTot}><SeloVerde faixa={supFaixa} /></td>
            <td style={tdTot} />
            {calc.aberto && <><td style={tdTot} /><td style={tdTot} /><td style={tdTot}><SeloVerde faixa={supProj} /></td></>}
            {criticas.some(c => c.desafio) && <td style={{ ...tdTotNum, fontWeight: 700 }}>{supDesafio ? '✓' : '—'}</td>}
          </tr>
        } />
      </Secao>

      <Secao titulo={`Demais casas · ${nomeMes(mes)}`} sub={`Mesma regra: meta do time × peso da casa em ${mesBase}`}>
        <TabelaCasas casas={demais} aberto={calc.aberto} rodape={
          <tr style={{ background: C.verde }}>
            <td style={{ ...tdTot, fontWeight: 700 }}>Total do time</td>
            <td style={tdTotNum}>100%</td>
            <td style={{ ...tdTotNum, fontWeight: 700, fontSize: 15 }}>{n0(totTime)}</td>
            <td style={tdTotNum}>{faixasTime.map(n0).join(' / ')}</td>
            <td style={tdTot}><Barra total={totTime} faixas={faixasTime} /></td>
            <td style={tdTotNum}>{pct(faixasTime[0] ? totTime / faixasTime[0] : null)}</td>
            <td style={tdTot}><SeloVerde faixa={faixaDe(totTime, faixasTime)} /></td>
            <td style={tdTotNum}>{faltaDe(totTime, faixasTime) !== null ? n0(faltaDe(totTime, faixasTime)!) : '—'}</td>
            {calc.aberto && <><td style={tdTot} /><td style={tdTotNum}>{n0(casas.reduce((s, c) => s + c.projecao, 0))}</td><td style={tdTot} /></>}
            {demais.some(c => c.desafio) && <td style={tdTotNum}>{desafioTime ? n0(desafioTime) : '—'}</td>}
          </tr>
        } />
        <div style={{ display: 'flex', gap: 10, marginTop: 10, fontSize: 11.5, color: C.suave, alignItems: 'center', flexWrap: 'wrap' }}>
          {CORES_FAIXA.map((c, i) => <span key={i} style={{ padding: '2px 8px', borderRadius: 6, background: c.bg, color: c.fg, fontWeight: 600 }}>Faixa {i + 1}</span>)}
          <span>
            Peso = reservas da casa em {mesBase} ÷ total do mês (base {ANO_BASE_PESO} sem corporativo e sem Pipe, só sentadas e confirmadas).
            Metas arredondadas por casa — a soma pode diferir em 1 ou 2 da meta do time. Total do time = todas as casas.
            {calc.semCasa > 0 && ` ${n0(calc.semCasa)} reserva(s) do time sem casa reconhecida ficaram fora da conta por casa.`}
          </span>
        </div>
      </Secao>
    </>
  )
}
