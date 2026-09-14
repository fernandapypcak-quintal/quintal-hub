'use client'

import { useState } from 'react'
import { usePorLojaDetalhe } from '../../useComercial'

function fmtBRL(v: number) { return v.toLocaleString('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0}) }
function fmtBRLCompacto(v: number) {
  if (!v && v !== 0) return '—'
  if (Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}
function hojeYm() { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}` }

function VarBadge({ v }: { v: number | null }) {
  if (v === null) return <span style={{ fontSize: 11, color: '#c9ccd1' }}>—</span>
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: v >= 0 ? '#eaf3de' : '#fdeaea', color: v >= 0 ? '#3B6D11' : '#a32d2d' }}>
      {v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(1)}%
    </span>
  )
}

// Painel principal "Por Loja", no padrão do módulo Faturamento (Stores.jsx):
// card por loja com YoY cortado no dia, tendência, tendência vs ano anterior,
// peso na rede, melhor dia, e evolução mensal. Sem Meta/Atingimento — não
// existe meta por loja pro B2B, só a meta única da empresa (3 faixas).
function PainelPorLojaDetalhe({ filtros }: { filtros: any }) {
  const mesFiltro = filtros?.mes ? `${filtros.ano}-${String(filtros.mes).padStart(2,'0')}` : hojeYm()
  const { dados, loading, erro } = usePorLojaDetalhe(filtros, mesFiltro)
  const [expandida, setExpandida] = useState<string | null>(null)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!dados || !dados.lojas) return null

  const { lojas, diaCorte, ehMesCorrente } = dados
  const nomesMesesLong = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const nomeMes = nomesMesesLong[parseInt(mesFiltro.split('-')[1])-1]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
      {ehMesCorrente && diaCorte && (
        <div style={{ background: '#fffbe6', border: '0.5px solid #f0e0a0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#8a7405' }}>
          Comparações YoY cortadas no dia {diaCorte} — {nomeMes}/{mesFiltro.split('-')[0]} vs mesmo período do ano anterior. Tend Fat = projeção do mês cheio no ritmo atual.
        </div>
      )}

      {lojas.map(l => {
        const isExp = expandida === l.loja
        const maxEvolucao = Math.max(...l.evolucaoMensal.map((e: any) => Math.max(e.receita, e.receitaCompetencia)), 1)
        return (
          <div key={l.loja} style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderLeft: '4px solid #97A624', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setExpandida(isExp ? null : l.loja)}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center' }}>
                <div style={{ minWidth: 140 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l.loja}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRLCompacto(l.realAtual)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>YoY (fech.) {ehMesCorrente ? `dia ${diaCorte}` : ''}</div>
                  <VarBadge v={l.yoy} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>YoY (comp.)</div>
                  <VarBadge v={l.yoyCompetencia} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Tend Fat (fech.)</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#185FA5' }}>{fmtBRLCompacto(l.tendFat)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Tend vs AA (fech.)</div>
                  <VarBadge v={l.tendVsAA} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Tend Fat (comp.)</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRLCompacto(l.tendComp)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Tend vs AA (comp.)</div>
                  <VarBadge v={l.tendVsAAComp} />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#9a9c9f', marginBottom: 3 }}>Peso (fech.)</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{l.peso}%</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'flex-end', gap: 3, height: 40 }}>
                  {l.evolucaoMensal.map((e: any) => (
                    <div key={e.periodo} title={`${e.label}: ${fmtBRLCompacto(e.receita)}`} style={{ width: 7, height: `${Math.max((e.receita/maxEvolucao)*36,2)}px`, background: '#c3d89a', borderRadius: 2 }} />
                  ))}
                </div>
              </div>
            </div>

            {isExp && (
              <div style={{ padding: '16px 20px', borderTop: '0.5px solid #E8E8E2', background: '#FAFAF8' }}>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Faturamento (fechamento)</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#185FA5' }}>{fmtBRLCompacto(l.realAtual)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Faturamento (competência)</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRLCompacto(l.receitaCompetencia)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Fechamentos (fech.)</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{l.won}</div></div>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Eventos (competência)</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{l.wonCompetencia}</div></div>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Ticket médio (fech.)</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.ticketMedio)}</div></div>
                  <div><div style={{ fontSize: 10, color: '#9a9c9f' }}>Ticket médio (comp.)</div><div style={{ fontSize: 14, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.ticketMedioCompetencia)}</div></div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 320px))', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>vs mês anterior</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#5a5c5f', minWidth: 100 }}>Fechamento:</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.realMesAnterior)}</span>
                      <VarBadge v={l.momVariacao} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#5a5c5f', minWidth: 100 }}>Competência:</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.receitaCompetenciaMesAnt)}</span>
                      <VarBadge v={l.momCompetencia} />
                    </div>
                  </div>
                  <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>vs ano anterior</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#5a5c5f', minWidth: 100 }}>Fechamento:</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.realAnoAnterior)}</span>
                      <VarBadge v={l.yoy} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 11, color: '#5a5c5f', minWidth: 100 }}>Competência:</span>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(l.receitaCompetenciaAnoAnt)}</span>
                      <VarBadge v={l.yoyCompetencia} />
                    </div>
                  </div>
                </div>

                {/* Pacotes fechados (competência) */}
                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>Pacotes fechados (competência)</div>
                {l.pacotes.length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f', marginBottom: 16 }}>Nenhum pacote vendido nesse período.</div>}
                {l.pacotes.length > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    {l.pacotes.map((pc: any) => {
                      const maxPacote = Math.max(...l.pacotes.map((x: any) => x.receita), 1)
                      return (
                        <div key={pc.pacote} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#3a3c3f', width: 150, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{pc.pacote}</div>
                          <div style={{ flex: 1, height: 20, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${Math.max((pc.receita/maxPacote)*100,5)}%`, background: '#7d5ac9', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{pc.pctFaturamento}%</div>
                          </div>
                          <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#5a5c5f', width: 45, textAlign: 'right', flexShrink: 0 }}>{pc.qtd}x</div>
                          <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#5a5c5f', width: 80, textAlign: 'right', flexShrink: 0 }}>{fmtBRLCompacto(pc.receita)}</div>
                        </div>
                      )
                    })}
                  </div>
                )}

                <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>Evolução mensal</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, fontSize: 11, color: '#5a5c5f' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#97A624', display: 'inline-block' }} />Fechamento</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#c3d89a', display: 'inline-block' }} />Competência</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 150, overflowX: 'auto' }}>
                  {l.evolucaoMensal.map((e: any) => (
                    <div key={e.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 60, flex: '1 0 60px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 110 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#3B6D11', fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(e.receita)}</span>
                          <div style={{ width: 18, height: `${Math.max((e.receita/maxEvolucao)*90,3)}px`, background: '#97A624', borderRadius: '3px 3px 0 0' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <span style={{ fontSize: 9, fontWeight: 700, color: '#7a9451', fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(e.receitaCompetencia)}</span>
                          <div style={{ width: 18, height: `${Math.max((e.receitaCompetencia/maxEvolucao)*90,3)}px`, background: '#c3d89a', borderRadius: '3px 3px 0 0' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 10, color: '#9a9c9f' }}>{e.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function PorLoja({ filtros }: { filtros: any }) {
  return (
    <div style={{ padding:'20px' }}>
      <PainelPorLojaDetalhe filtros={filtros} />
    </div>
  )
}
