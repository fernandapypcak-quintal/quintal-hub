'use client'

// app/hub/reservas-metas/ClientApp.tsx
// Metas por casa do time de reservas — página própria (permissão 'reservas-metas').
//
// Regras:
//  • Meta da casa = cada faixa (e o desafio) da meta mensal do time × peso da casa no mesmo mês de 2025 (pesos.ts).
//  • Conta só reservas criadas pelos operadores do time (conta_meta), pela DATA DE CRIAÇÃO,
//    independente de status — mesma regra da meta mensal.
//  • Casas críticas: a supervisora bate a faixa N só se TODAS as casas críticas baterem a faixa N da casa.
//  • Projeção por casa: mesma conta do Resumo (média de cada dia da semana nas últimas 4 semanas).
// Dados: /api/reservas (mesma fonte do dashboard de Reservas) — reaproveita utils/ui de /hub/reservas.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { type UnitId, UNITS, unitIdFromString } from '@/lib/units'
import {
  type Config, type Linha, addMeses, dataCurta, diffDias, hojeSP, limparCache, n0, n1, nomeMes, pct,
  primeiroDia, projetarMes, ultimoDia, useConfig, useLinhas, avisoAtualizacao,
} from '../reservas/utils'
import { Aviso, C, MONO, Secao, Spinner, Tag, card, td, tdNum, th, thNum } from '../reservas/ui'
import { ANO_BASE_PESO, CASAS_CRITICAS, SUPERVISORA, pesoDaCasa, reservasBase } from './pesos'

// ─── Tipos e cálculo ─────────────────────────────────────────────────────
type Marco = { label: string; v: number; desafio: boolean }
type CasaMeta = {
  id: UnitId; label: string; critica: boolean; peso: number; base: number
  marcos: Marco[]; realizado: number; projecao: number; ritmo: number; diasRestantes: number
}

const labelCasa = (id: UnitId) => (id === 'santo_andre' ? 'Santo André' : UNITS.find(u => u.id === id)?.label || id)

// Índice do maior marco atingido (-1 = nenhum)
function nivel(marcos: Marco[], valor: number) {
  let n = -1
  marcos.forEach((m, i) => { if (valor >= m.v) n = i })
  return n
}

function calcularCasas(linhas: Linha[], config: Config, mes: string, hoje: string): { casas: CasaMeta[]; semCasa: number } | null {
  const meta = config.metas.find(m => m.mes === mes)
  if (!meta) return null
  const aberto = mes === hoje.slice(0, 7)
  const faixas = [...meta.faixas].sort((a, b) => a - b)

  const doTime = linhas.filter(r => r.m)
  const porCasa = new Map<UnitId, Linha[]>()
  let semCasa = 0
  for (const r of doTime) {
    const id = unitIdFromString(r.u)
    if (!id) { if (r.dc.startsWith(mes)) semCasa++; continue }
    const a = porCasa.get(id); if (a) a.push(r); else porCasa.set(id, [r])
  }

  // Casas: as que têm peso + as que aparecem nos dados (liberadas para o usuário)
  const liberadas = new Set(config.unidades.map(u => unitIdFromString(u)).filter(Boolean) as UnitId[])
  const ids = UNITS.map(u => u.id).filter(id => id !== 'holding' && liberadas.has(id))

  const casas = ids.map(id => {
    const peso = pesoDaCasa(id, mes)
    const l = porCasa.get(id) || []
    const marcos: Marco[] = [
      ...faixas.map((f, i) => ({ label: `Faixa ${i + 1}`, v: Math.round(f * peso), desafio: false })),
      ...(meta.desafio ? [{ label: 'Desafio', v: Math.round(meta.desafio * peso), desafio: true }] : []),
    ]
    let realizado: number, projecao: number, ritmo = 0, diasRestantes = 0
    if (aberto) {
      const p = projetarMes(l, hoje)
      realizado = p.realizado; projecao = p.projecao; ritmo = p.ritmo; diasRestantes = p.diasRestantes
    } else {
      realizado = l.filter(r => r.dc.startsWith(mes)).length
      projecao = realizado
    }
    return {
      id, label: labelCasa(id), critica: CASAS_CRITICAS.includes(id), peso, base: reservasBase(id, mes),
      marcos, realizado, projecao, ritmo, diasRestantes,
    }
  })
  return { casas, semCasa }
}

// ─── Componentes ─────────────────────────────────────────────────────────
function Selo({ ok, proj, children }: { ok: boolean; proj?: boolean; children: React.ReactNode }) {
  const bg = ok ? C.verdeFundo : proj ? '#FFF6D6' : C.vermelhoFundo
  const cor = ok ? '#5d6a10' : proj ? '#8A6D00' : C.vermelho
  return <span style={{ fontSize: 11.5, padding: '3px 9px', borderRadius: 99, background: bg, color: cor, fontWeight: 600, whiteSpace: 'nowrap' }}>{children}</span>
}

function BarraMeta({ c }: { c: CasaMeta }) {
  const topo = Math.max(...c.marcos.map(m => m.v), c.projecao, c.realizado, 1) * 1.08
  return (
    <div style={{ position: 'relative', height: 56, marginTop: 6 }}>
      <div style={{ position: 'absolute', top: 18, left: 0, right: 0, height: 12, background: '#F1F1EC', borderRadius: 99, overflow: 'hidden' }}>
        {c.projecao > c.realizado && (
          <div style={{ position: 'absolute', inset: 0, width: `${(c.projecao / topo) * 100}%`, background: 'repeating-linear-gradient(45deg,#E2E8C6,#E2E8C6 6px,#EEF2DA 6px,#EEF2DA 12px)' }} />
        )}
        <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(c.realizado / topo) * 100}%`, background: C.verde, borderRadius: 99 }} />
      </div>
      {c.marcos.map(m => (
        <div key={m.label} style={{ position: 'absolute', left: `${(m.v / topo) * 100}%`, top: 0, transform: 'translateX(-50%)', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: m.desafio ? '#8A6D00' : C.suave, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.desafio ? 'D' : m.label.replace('Faixa ', 'F')}</div>
          <div style={{ width: 2, height: 20, background: m.desafio ? C.amarelo : C.texto, margin: '1px auto 0' }} />
          <div style={{ ...MONO, fontSize: 10.5, color: C.suave }}>{n0(m.v)}</div>
        </div>
      ))}
    </div>
  )
}

function CardCasa({ c, aberto }: { c: CasaMeta; aberto: boolean }) {
  const nR = nivel(c.marcos, c.realizado)
  const nP = nivel(c.marcos, c.projecao)
  const f1 = c.marcos[0]?.v || 0
  const proximo = c.marcos.find(m => m.v > c.realizado)
  const necessario = proximo && c.diasRestantes ? (proximo.v - c.realizado) / c.diasRestantes : null
  return (
    <div style={{ ...card, padding: 16, borderTop: `3px solid ${nR >= 0 ? C.verde : nP >= 0 ? C.amarelo : C.vermelho}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{c.label}</div>
          <div style={{ fontSize: 11.5, color: C.suave }}>peso {pct(c.peso)}</div>
        </div>
        {nR >= 0 ? <Selo ok>✓ {c.marcos[nR].label}</Selo>
          : aberto && nP >= 0 ? <Selo ok={false} proj>projeção bate {c.marcos[nP].label.toLowerCase()}</Selo>
          : <Selo ok={false}>{aberto ? 'abaixo da faixa 1' : 'não bateu'}</Selo>}
      </div>
      <div style={{ display: 'flex', gap: 22, alignItems: 'flex-end', marginTop: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11.5, color: C.suave }}>Realizado</div>
          <div style={{ ...MONO, fontSize: 28, letterSpacing: -0.5 }}>{n0(c.realizado)}</div>
          <div style={{ fontSize: 11.5, color: C.suave }}>{pct(f1 ? c.realizado / f1 : null)} da faixa 1</div>
        </div>
        {aberto && (
          <div>
            <div style={{ fontSize: 11.5, color: C.suave }}>Projeção</div>
            <div style={{ ...MONO, fontSize: 20, color: nP >= 0 ? C.verde : C.vermelho }}>{n0(c.projecao)}</div>
          </div>
        )}
        {aberto && proximo && (
          <div>
            <div style={{ fontSize: 11.5, color: C.suave }}>p/ {proximo.label.toLowerCase()}</div>
            <div style={{ ...MONO, fontSize: 20 }}>{n1(necessario || 0)}<span style={{ fontSize: 11, color: C.suave }}>/dia</span></div>
            <div style={{ fontSize: 11, color: C.suave }}>ritmo atual <span style={MONO}>{n1(c.ritmo)}</span> · faltam {n0(proximo.v - c.realizado)}</div>
          </div>
        )}
      </div>
      <BarraMeta c={c} />
    </div>
  )
}

// ─── Aba: casas críticas + meta da supervisora ──────────────────────────
function AbaCriticas({ casas, aberto, mes }: { casas: CasaMeta[]; aberto: boolean; mes: string }) {
  const criticas = casas.filter(c => c.critica)
  const faltando = CASAS_CRITICAS.filter(id => !criticas.some(c => c.id === id))
  if (!criticas.length) return <Aviso tipo="info">Nenhuma casa crítica liberada para o seu usuário.</Aviso>

  const marcos = criticas[0].marcos
  // Supervisora: o nível dela é o menor nível entre as casas críticas
  const nivelSup = (valor: (c: CasaMeta) => number) => Math.min(...criticas.map(c => nivel(c.marcos, valor(c))))
  const supR = faltando.length ? -1 : nivelSup(c => c.realizado)
  const supP = faltando.length ? -1 : nivelSup(c => c.projecao)
  const proxIdx = supR + 1
  const pendentes = proxIdx < marcos.length ? criticas.filter(c => c.realizado < c.marcos[proxIdx].v) : []
  const gargalo = [...criticas].sort((a, b) => a.realizado / (a.marcos[0]?.v || 1) - b.realizado / (b.marcos[0]?.v || 1))[0]

  return (
    <>
      <Secao titulo={`Meta da supervisora ${SUPERVISORA} — ${nomeMes(mes)}`}
        sub={`Bate a faixa só se as ${CASAS_CRITICAS.length} casas críticas baterem a mesma faixa da casa`}>
        {faltando.length > 0 && <div style={{ marginBottom: 12 }}><Aviso>Faltam casas críticas liberadas para o seu usuário — não dá para calcular a meta da supervisora.</Aviso></div>}
        <div style={{ display: 'flex', gap: 36, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: C.suave }}>{aberto ? 'Hoje' : 'Resultado'}</div>
            <div style={{ fontSize: 26, fontWeight: 600, color: supR >= 0 ? C.verde : C.vermelho }}>
              {supR >= 0 ? `Bate ${marcos[supR].label.toLowerCase()}` : 'Não bate a faixa 1'}
            </div>
            <div style={{ fontSize: 12, color: C.suave }}>
              {criticas.filter(c => nivel(c.marcos, c.realizado) >= 0).length} de {criticas.length} casas na faixa 1
            </div>
          </div>
          {aberto && (
            <div>
              <div style={{ fontSize: 12, color: C.suave }}>Pela projeção</div>
              <div style={{ fontSize: 20, fontWeight: 600, color: supP >= 0 ? C.verde : C.vermelho }}>
                {supP >= 0 ? `Bate ${marcos[supP].label.toLowerCase()}` : 'Não bate a faixa 1'}
              </div>
              <div style={{ fontSize: 12, color: C.suave }}>
                {criticas.filter(c => nivel(c.marcos, c.projecao) >= 0).length} de {criticas.length} casas projetadas na faixa 1
              </div>
            </div>
          )}
          {pendentes.length > 0 && (
            <div style={{ maxWidth: 380 }}>
              <div style={{ fontSize: 12, color: C.suave }}>Falta para {marcos[proxIdx].label.toLowerCase()}</div>
              <div style={{ fontSize: 13, marginTop: 4, lineHeight: 1.6 }}>
                {pendentes.map(c => (
                  <div key={c.id}><b>{c.label}</b> · faltam <span style={MONO}>{n0(c.marcos[proxIdx].v - c.realizado)}</span></div>
                ))}
              </div>
            </div>
          )}
          {gargalo && (
            <div>
              <div style={{ fontSize: 12, color: C.suave }}>Casa mais atrás</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{gargalo.label}</div>
              <div style={{ fontSize: 12, color: C.suave }}>{pct(gargalo.marcos[0]?.v ? gargalo.realizado / gargalo.marcos[0].v : null)} da faixa 1</div>
            </div>
          )}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={th}>Casa</th>
                <th style={thNum}>Realizado</th>
                {aberto && <th style={thNum}>Projeção</th>}
                {marcos.map(m => <th key={m.label} style={{ ...thNum, textAlign: 'center' }}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {criticas.map(c => (
                <tr key={c.id}>
                  <td style={{ ...td, fontWeight: 600 }}>{c.label}</td>
                  <td style={tdNum}>{n0(c.realizado)}</td>
                  {aberto && <td style={tdNum}>{n0(c.projecao)}</td>}
                  {c.marcos.map(m => {
                    const ok = c.realizado >= m.v
                    const proj = aberto && !ok && c.projecao >= m.v
                    return (
                      <td key={m.label} style={{ ...td, textAlign: 'center' }}>
                        <Selo ok={ok} proj={proj}><span style={MONO}>{n0(m.v)}</span> {ok ? '✓' : proj ? '~' : '✗'}</Selo>
                      </td>
                    )
                  })}
                </tr>
              ))}
              <tr>
                <td style={{ ...td, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>{SUPERVISORA}</td>
                <td style={{ ...tdNum, borderTop: `1px solid ${C.bordaForte}` }} />
                {aberto && <td style={{ ...tdNum, borderTop: `1px solid ${C.bordaForte}` }} />}
                {marcos.map((m, i) => (
                  <td key={m.label} style={{ ...td, textAlign: 'center', borderTop: `1px solid ${C.bordaForte}` }}>
                    {supR >= i ? <Selo ok>bate ✓</Selo> : aberto && supP >= i ? <Selo ok={false} proj>projeção ~</Selo> : <Selo ok={false}>✗</Selo>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11.5, color: C.suave, marginTop: 10 }}>
          ✓ já bateu · ~ a projeção do mês bate · ✗ não bate. A {SUPERVISORA} só fica com a faixa quando todas as casas da coluna estão com ✓.
        </div>
      </Secao>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
        {criticas.map(c => <CardCasa key={c.id} c={c} aberto={aberto} />)}
      </div>
    </>
  )
}

// ─── Aba: todas as casas ────────────────────────────────────────────────
function AbaTodas({ casas, aberto, mes }: { casas: CasaMeta[]; aberto: boolean; mes: string }) {
  const ord = [...casas].sort((a, b) => Number(b.critica) - Number(a.critica) || b.peso - a.peso)
  const marcos = casas[0]?.marcos || []
  const tot = {
    peso: casas.reduce((s, c) => s + c.peso, 0), base: casas.reduce((s, c) => s + c.base, 0),
    realizado: casas.reduce((s, c) => s + c.realizado, 0), projecao: casas.reduce((s, c) => s + c.projecao, 0),
    marcos: marcos.map((_, i) => casas.reduce((s, c) => s + (c.marcos[i]?.v || 0), 0)),
  }
  const mesBase = `${nomeMes(`${ANO_BASE_PESO}-${mes.slice(5, 7)}`)}`
  return (
    <Secao titulo={`Meta por casa — ${nomeMes(mes)}`}
      sub={`Meta do time × peso da casa em ${mesBase} · reservas criadas pelo time de reservas`}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={th}>Casa</th>
              <th style={thNum}>Reservas {mesBase}</th>
              <th style={thNum}>Peso</th>
              {marcos.map(m => <th key={m.label} style={thNum}>{m.label}</th>)}
              <th style={thNum}>Realizado</th>
              <th style={thNum}>% faixa 1</th>
              {aberto && <th style={thNum}>Projeção</th>}
              <th style={th}>Situação</th>
            </tr>
          </thead>
          <tbody>
            {ord.map((c, i) => {
              const nR = nivel(c.marcos, c.realizado)
              const nP = nivel(c.marcos, c.projecao)
              return (
                <tr key={c.id} style={{ background: i % 2 ? C.zebra : '#fff' }}>
                  <td style={{ ...td, fontWeight: c.critica ? 600 : 400 }}>{c.label}{c.critica && <Tag cor={C.vermelho}>CRÍTICA</Tag>}</td>
                  <td style={tdNum}>{n0(c.base)}</td>
                  <td style={tdNum}>{pct(c.peso)}</td>
                  {c.marcos.map(m => <td key={m.label} style={{ ...tdNum, color: c.realizado >= m.v ? C.verde : C.texto, fontWeight: c.realizado >= m.v ? 600 : 400 }}>{n0(m.v)}</td>)}
                  <td style={{ ...tdNum, fontWeight: 600 }}>{n0(c.realizado)}</td>
                  <td style={tdNum}>{pct(c.marcos[0]?.v ? c.realizado / c.marcos[0].v : null)}</td>
                  {aberto && <td style={{ ...tdNum, color: nP >= 0 ? C.verde : C.vermelho }}>{n0(c.projecao)}</td>}
                  <td style={td}>
                    {nR >= 0 ? <Selo ok>✓ {c.marcos[nR].label}</Selo>
                      : aberto && nP >= 0 ? <Selo ok={false} proj>projeção bate {c.marcos[nP].label.toLowerCase()}</Selo>
                      : <Selo ok={false}>{aberto ? 'abaixo da faixa 1' : 'não bateu'}</Selo>}
                  </td>
                </tr>
              )
            })}
            <tr>
              <td style={{ ...td, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>Total</td>
              <td style={{ ...tdNum, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>{n0(tot.base)}</td>
              <td style={{ ...tdNum, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>{pct(tot.peso)}</td>
              {tot.marcos.map((v, i) => <td key={i} style={{ ...tdNum, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>{n0(v)}</td>)}
              <td style={{ ...tdNum, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>{n0(tot.realizado)}</td>
              <td style={{ ...tdNum, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>{pct(tot.marcos[0] ? tot.realizado / tot.marcos[0] : null)}</td>
              {aberto && <td style={{ ...tdNum, fontWeight: 700, borderTop: `1px solid ${C.bordaForte}` }}>{n0(tot.projecao)}</td>}
              <td style={{ ...td, borderTop: `1px solid ${C.bordaForte}` }} />
            </tr>
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: C.suave, marginTop: 10, lineHeight: 1.6 }}>
        Peso = reservas da casa em {mesBase} ÷ total do mês (base 2025 sem corporativo e sem Pipe, só sentadas e confirmadas).
        Meta da casa arredondada para o inteiro mais próximo, por isso a soma pode diferir em 1 ou 2 da meta do time.
      </div>
    </Secao>
  )
}

// ─── Casca da página (mesmo layout dos outros dashboards) ───────────────
type Aba = 'criticas' | 'todas'
const ABAS: { id: Aba; icon: string; label: string; curto: string }[] = [
  { id: 'criticas', icon: '🚨', label: 'Casas críticas', curto: 'Críticas' },
  { id: 'todas', icon: '🏪', label: 'Todas as casas', curto: 'Casas' },
]
const selectStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 12, background: 'rgba(255,255,255,0.15)',
  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
}
const opt: React.CSSProperties = { color: '#0D0F14' }

function Sidebar({ aba, onAba }: { aba: Aba; onAba: (a: Aba) => void }) {
  return (
    <aside style={{ width: 220, background: '#fff', borderRight: '0.5px solid #E8E8E2', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #E8E8E2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#0D0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#97A624', fontWeight: 700, fontFamily: 'monospace' }}>QE</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Metas por casa</div>
          <div style={{ fontSize: 10, color: '#9a9c9f' }}>Time de reservas</div>
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

function Conteudo({ config, mes, hoje, aba }: { config: Config; mes: string; hoje: string; aba: Aba }) {
  const aberto = mes === hoje.slice(0, 7)
  // mês aberto: carrega desde o mês anterior (a projeção usa as últimas 4 semanas)
  const ini = aberto ? primeiroDia(addMeses(mes, -1)) : primeiroDia(mes)
  const fim = aberto ? hoje : ultimoDia(mes)
  const { linhas, erro, carregando } = useLinhas('criacao', ini, fim)
  const calc = useMemo(() => (linhas ? calcularCasas(linhas, config, mes, hoje) : null), [linhas, config, mes, hoje])

  if (erro) return <Aviso>Erro ao carregar as reservas: {erro}</Aviso>
  if (carregando || !linhas) return <Spinner />
  if (!calc) return <Aviso tipo="info">Sem meta cadastrada para {nomeMes(mes)}. Preencha a aba METAS da planilha de reservas.</Aviso>
  return (
    <>
      {aba === 'criticas' && <AbaCriticas casas={calc.casas} aberto={aberto} mes={mes} />}
      {aba === 'todas' && <AbaTodas casas={calc.casas} aberto={aberto} mes={mes} />}
      {calc.semCasa > 0 && <Aviso tipo="info">{n0(calc.semCasa)} reserva(s) do time no mês sem casa reconhecida ficaram fora da conta por casa.</Aviso>}
      {aberto && <div style={{ fontSize: 11.5, color: '#888' }}>
        Mês em andamento: {diffDias(hoje, ultimoDia(mes)) + 1} dia(s) restantes. Projeção = média de cada dia da semana nas últimas 4 semanas da casa.
      </div>}
    </>
  )
}

export default function MetasPorCasaClientApp() {
  const [versao, setVersao] = useState(0)
  const { config, erro } = useConfig(versao)
  const [aba, setAba] = useState<Aba>('criticas')
  const hoje = config?.hoje || hojeSP()
  const mesAtual = hoje.slice(0, 7)
  const meses = useMemo(() => {
    const m = new Set((config?.metas || []).map(x => x.mes).filter(x => x <= mesAtual))
    m.add(mesAtual)
    return Array.from(m).sort().reverse()
  }, [config, mesAtual])
  const [mesSel, setMesSel] = useState('')
  const mes = mesSel || mesAtual
  const abaAtual = ABAS.find(a => a.id === aba) || ABAS[0]
  const at = config?.atualizado || ''
  const atualizar = () => { limparCache(); setVersao(v => v + 1) }

  let conteudo: React.ReactNode
  if (erro && !config) conteudo = <div style={{ maxWidth: 560, margin: '40px auto', padding: 20 }}><Aviso>Não foi possível abrir o painel: {erro}</Aviso></div>
  else if (!config) conteudo = <Spinner />
  else conteudo = (
    <div key={`${versao}|${mes}`} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1440, margin: '0 auto' }}>
      {config.restrito && <Aviso tipo="info">Você vê só as casas liberadas para o seu usuário.</Aviso>}
      <Conteudo config={config} mes={mes} hoje={hoje} aba={aba} />
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <div className="hidden lg:flex">
        <Sidebar aba={aba} onAba={setAba} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">Reservas · Metas por casa</span>
        </div>

        <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎯</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Metas por casa · {abaAtual.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                Time de reservas · por data de criação{at ? ` · atualizado ${dataCurta(at.slice(0, 10))} às ${at.slice(11, 16)}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <select value={mes} onChange={e => setMesSel(e.target.value)} style={selectStyle}>
              {meses.map(m => <option key={m} value={m} style={opt}>{nomeMes(m)}</option>)}
            </select>
            <button onClick={atualizar} title="Recarregar dados" style={{ ...selectStyle, padding: '5px 9px' }}>↻</button>
          </div>
        </div>

        {config && avisoAtualizacao(config) && (
          <div style={{ background: '#FBEFEF', borderBottom: '0.5px solid #F0D5D5', padding: '8px 20px', fontSize: 12.5, color: '#8C1414', flexShrink: 0 }}>
            ⚠ Atenção: {avisoAtualizacao(config)}. Os números abaixo podem estar desatualizados.
          </div>
        )}

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
