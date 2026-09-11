'use client'

import { useState, useEffect } from 'react'
import { useOnePage } from '../../useComercial'

function fmtBRLCompacto(v: number) {
  if (!v && v !== 0) return '—'
  if (Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}
function delta(atual: number, ant: number) {
  if (!ant) return null
  const pct = ((atual - ant) / ant * 100)
  return { pct: Math.abs(pct).toFixed(1), up: atual >= ant }
}

function DeltaTag({ atual, ant, label }: { atual: number; ant: number; label: string }) {
  const d = delta(atual, ant)
  if (!d) return null
  return (
    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: d.up ? '#eaf3de' : '#fdeaea', color: d.up ? '#3B6D11' : '#a32d2d', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {d.up ? '↑' : '↓'} {d.pct}% {label}
    </span>
  )
}

function hojeYm() {
  const h = new Date()
  return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}`
}

function GraficoAnual({ titulo, campo, anos, corAtual, corAnterior }: {
  titulo: string
  campo: 'receitaCompetencia' | 'receitaFechamento'
  anos: { atual: { ano: number; meses: any[] }; anterior: { ano: number; meses: any[] } }
  corAtual: string
  corAnterior: string
}) {
  const max = Math.max(
    ...anos.atual.meses.map(m => m[campo]),
    ...anos.anterior.meses.map(m => m[campo]),
    1
  )
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 700 }}>{titulo}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#5a5c5f' }}><span style={{ width: 11, height: 11, borderRadius: 3, background: corAnterior, display: 'inline-block' }} />{anos.anterior.ano}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#5a5c5f' }}><span style={{ width: 11, height: 11, borderRadius: 3, background: corAtual, display: 'inline-block' }} />{anos.atual.ano}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, height: 260, overflowX: 'auto', paddingBottom: 8 }}>
        {anos.atual.meses.map((mAtualMes, i) => {
          const mAnt = anos.anterior.meses[i]
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 78, flex: '1 0 78px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 200 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#8a8c8f', fontFamily: 'DM Mono, monospace', marginBottom: 4, whiteSpace: 'nowrap' }}>{fmtBRLCompacto(mAnt[campo])}</span>
                  <div style={{ width: 24, height: `${Math.max((mAnt[campo]/max)*150,3)}px`, background: corAnterior, borderRadius: '4px 4px 0 0' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: corAtual, fontFamily: 'DM Mono, monospace', marginBottom: 4, whiteSpace: 'nowrap' }}>{fmtBRLCompacto(mAtualMes[campo])}</span>
                  <div style={{ width: 24, height: `${Math.max((mAtualMes[campo]/max)*150,3)}px`, background: corAtual, borderRadius: '4px 4px 0 0' }} />
                </div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#3a3c3f', textAlign: 'center' }}>{mAtualMes.label}</span>
            </div>
          )
        })}
      </div>

      {/* Tabela — números exatos, sempre legíveis mesmo quando um mês fora
          da curva (ex: um Dezembro gigante) esmaga as barras dos outros */}
      <div style={{ marginTop: 18, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E8E2' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>Mês</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>{anos.anterior.ano}</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>{anos.atual.ano}</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f', fontWeight: 600 }}>Var.</th>
            </tr>
          </thead>
          <tbody>
            {anos.atual.meses.map((mAtualMes, i) => {
              const mAnt = anos.anterior.meses[i]
              const d = delta(mAtualMes[campo], mAnt[campo])
              return (
                <tr key={i} style={{ borderBottom: '0.5px solid #F5F5F2' }}>
                  <td style={{ padding: '6px 8px', fontWeight: 600, color: '#3a3c3f' }}>{mAtualMes.label}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#8a8c8f' }}>{fmtBRLCompacto(mAnt[campo])}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: corAtual }}>{fmtBRLCompacto(mAtualMes[campo])}</td>
                  <td style={{ padding: '6px 8px', textAlign: 'right' }}>{d && <span style={{ color: d.up ? '#3B6D11' : '#a32d2d', fontWeight: 600 }}>{d.up ? '↑' : '↓'} {d.pct}%</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const GAS_URL = '/api/pipedrive'

type LinhaGranular = { periodo: string; label: string; leads: number; fechados: number; taxa: number; receita: number }
type DadosGranular = { mensal: LinhaGranular[]; semanal: LinhaGranular[]; diario: LinhaGranular[] }

function PainelLeadsConversao({ filtros, mesFiltro }: { filtros: any; mesFiltro: string }) {
  const [dados, setDados] = useState<DadosGranular | null>(null)
  const [granularidade, setGranularidade] = useState<'mensal' | 'semanal' | 'diario'>('diario')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ tipo: 'taxa_conversao', mes_filtro: mesFiltro })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (!data.erro) setDados(data) })
      .finally(() => setLoading(false))
  }, [filtros.unidade, filtros.vendedor, mesFiltro])

  if (loading || !dados) return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20, textAlign: 'center', color: '#9a9c9f', fontSize: 13 }}>
      Carregando leads e conversão...
    </div>
  )

  const linhas = [...(dados[granularidade] || [])].reverse().slice(-16)
  const maxLeads = Math.max(...linhas.map(l => l.leads), 1)
  const maxTaxa = Math.max(...linhas.map(l => l.taxa), 1)

  const BotaoGran = ({ v, label }: { v: typeof granularidade; label: string }) => (
    <button onClick={() => setGranularidade(v)}
      style={{ padding: '5px 12px', borderRadius: 20, border: '0.5px solid', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        background: granularidade===v ? '#0D0F14' : '#fff', color: granularidade===v ? '#97A624' : '#5a5c5f', borderColor: granularidade===v ? '#0D0F14' : '#E8E8E2' }}>
      {label}
    </button>
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Leads que entram</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <BotaoGran v="diario" label="Diário" />
            <BotaoGran v="semanal" label="Semanal" />
            <BotaoGran v="mensal" label="Mensal" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, overflowX: 'auto', paddingBottom: 8 }}>
          {linhas.map(l => (
            <div key={l.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 40, flex: '1 0 40px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#185FA5', fontFamily: 'DM Mono, monospace' }}>{l.leads}</span>
              <div style={{ width: '100%', maxWidth: 26, height: `${Math.max((l.leads/maxLeads)*140,4)}px`, background: '#185FA5', borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: 10, color: '#9a9c9f', textAlign: 'center' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Taxa de conversão</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <BotaoGran v="diario" label="Diário" />
            <BotaoGran v="semanal" label="Semanal" />
            <BotaoGran v="mensal" label="Mensal" />
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200, overflowX: 'auto', paddingBottom: 8 }}>
          {linhas.map(l => (
            <div key={l.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 40, flex: '1 0 40px' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#3B6D11', fontFamily: 'DM Mono, monospace' }}>{l.taxa}%</span>
              <div style={{ width: '100%', maxWidth: 26, height: `${Math.max((l.taxa/maxTaxa)*140,4)}px`, background: '#3B6D11', borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: 10, color: '#9a9c9f', textAlign: 'center' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OnePage({ filtros }: { filtros: any }) {
  // Usa o MESMO filtro de ano/mês que já existe no topo do dashboard —
  // sem seletor duplicado aqui. Se "Todos os meses" estiver selecionado lá em
  // cima, cai no mês corrente de verdade (a onepage sempre mostra um mês só).
  const mesFiltro = filtros?.mes ? `${filtros.ano}-${String(filtros.mes).padStart(2,'0')}` : hojeYm()
  const { dados, loading, erro } = useOnePage(filtros, mesFiltro)

  const nomesMesesLong = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!dados || !dados.atual) return (
    <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>
      Resposta do servidor incompleta — provavelmente o Apps Script precisa de uma nova versão do deployment.
    </div>
  )

  const { atual, mesAnterior, anoAnterior, serieFaturamento, anos, funil, meta, tendencia, pacotes } = dados
  const nomeMesAtual = nomesMesesLong[parseInt(atual.mes.split('-')[1])-1]

  const maxTicket = Math.max(...serieFaturamento.map(s => s.ticketMedio), 1)
  const maxFunil = Math.max(...funil.map(f => f.count), 1)
  const maxPacoteQtd = Math.max(...pacotes.map(p => p.qtd), 1)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── Faturamento: competência x fechamento (destaque) ──── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #97A624' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Faturamento · Competência</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11', lineHeight: 1, marginBottom: 8 }}>{fmtBRLCompacto(atual.receitaCompetencia)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <DeltaTag atual={atual.receitaCompetencia} ant={mesAnterior.receitaCompetencia} label="vs mês ant." />
            <DeltaTag atual={atual.receitaCompetencia} ant={anoAnterior.receitaCompetencia} label="vs ano ant." />
          </div>
          {tendencia.ehMesCorrente ? (
            <div style={{ fontSize: 11, color: '#9a9c9f' }}>Tendência do mês: <strong style={{ color: '#3B6D11' }}>{fmtBRLCompacto(tendencia.projecaoCompetencia)}</strong></div>
          ) : (
            <div style={{ fontSize: 11, color: '#9a9c9f' }}>Eventos que acontecem em {nomeMesAtual.toLowerCase()}</div>
          )}
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Faturamento · Fechamento</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#185FA5', lineHeight: 1, marginBottom: 8 }}>{fmtBRLCompacto(atual.receitaFechamento)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            <DeltaTag atual={atual.receitaFechamento} ant={mesAnterior.receitaFechamento} label="vs mês ant." />
            <DeltaTag atual={atual.receitaFechamento} ant={anoAnterior.receitaFechamento} label="vs ano ant." />
          </div>
          {tendencia.ehMesCorrente && (
            <div style={{ fontSize: 11, color: '#9a9c9f' }}>Tendência do mês: <strong style={{ color: '#185FA5' }}>{fmtBRLCompacto(tendencia.projecaoFechamento)}</strong></div>
          )}
        </div>
      </div>


      {/* ── KPIs principais ────────────────────────────────── */}
      {!tendencia.ehMesCorrente ? null : (
        <div style={{ fontSize: 11, color: '#9a9c9f' }}>
          Comparações "vs mês/ano anterior" usam só os primeiros {tendencia.diasDecorridos} dias desses períodos, pra comparar com o mesmo tanto de dias que já passou em {nomeMesAtual.toLowerCase()}.
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #97A624' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Leads</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', lineHeight: 1, marginBottom: 6 }}>{atual.leads}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.leads} ant={mesAnterior.leads} label="mês ant." />
            <DeltaTag atual={atual.leads} ant={anoAnterior.leads} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #3B6D11' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Conversões</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11', lineHeight: 1, marginBottom: 6 }}>{atual.won}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.won} ant={mesAnterior.won} label="mês ant." />
            <DeltaTag atual={atual.won} ant={anoAnterior.won} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Taxa de conversão</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#185FA5', lineHeight: 1, marginBottom: 6 }}>{atual.taxaConversao}%</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.taxaConversao} ant={mesAnterior.taxaConversao} label="mês ant." />
            <DeltaTag atual={atual.taxaConversao} ant={anoAnterior.taxaConversao} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #D9B504' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Pax (pessoas)</div>
          <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#8a7405', lineHeight: 1, marginBottom: 6 }}>{atual.pax}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.pax} ant={mesAnterior.pax} label="mês ant." />
            <DeltaTag atual={atual.pax} ant={anoAnterior.pax} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #c9855a' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Ticket médio / evento</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#a05a2c', lineHeight: 1, marginBottom: 6 }}>{fmtBRLCompacto(atual.ticketMedio)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.ticketMedio} ant={mesAnterior.ticketMedio} label="mês ant." />
            <DeltaTag atual={atual.ticketMedio} ant={anoAnterior.ticketMedio} label="ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #7d5ac9' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Ticket médio / pax</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#5a3ea3', lineHeight: 1, marginBottom: 6 }}>{fmtBRLCompacto(atual.ticketMedioPax)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.ticketMedioPax} ant={mesAnterior.ticketMedioPax} label="mês ant." />
            <DeltaTag atual={atual.ticketMedioPax} ant={anoAnterior.ticketMedioPax} label="ano ant." />
          </div>
        </div>
      </div>

      {/* ── Meta do mês (faixas) + tendência ───────────────── */}
      {meta && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Meta de faturamento (competência) · {nomeMesAtual}</span>
            <span style={{ fontSize: 12, color: '#9a9c9f' }}>Fechado até agora: <strong style={{ color: '#0D0F14' }}>{fmtBRLCompacto(meta.atingido)}</strong></span>
          </div>
          <div style={{ position: 'relative', height: 28, background: '#F5F5F2', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(meta.percentualFaixa3, 100)}%`,
              background: meta.faixaAtual >= 3 ? '#3B6D11' : meta.faixaAtual === 2 ? '#97A624' : meta.faixaAtual === 1 ? '#D9B504' : '#c9855a',
              borderRadius: 8, transition: 'width 0.5s',
            }} />
            {!meta.mesFechado && meta.projecao > meta.atingido && (
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min(meta.percentualFaixa3, 100)}%`, width: `${Math.max(Math.min(meta.percentualProjecaoFaixa3, 100) - Math.min(meta.percentualFaixa3, 100), 0)}%`, background: 'repeating-linear-gradient(45deg, #d8d8d0, #d8d8d0 4px, #ececE6 4px, #ececE6 8px)' }} />
            )}
            {[meta.faixa1, meta.faixa2].map((f, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min((f/meta.faixa3)*100, 100)}%`, width: 2, background: '#fff' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#9a9c9f' }}>
            <span>Faixa 1: {fmtBRLCompacto(meta.faixa1)}</span>
            <span>Faixa 2: {fmtBRLCompacto(meta.faixa2)}</span>
            <span>Faixa 3: {fmtBRLCompacto(meta.faixa3)}</span>
          </div>
          <div style={{ marginTop: 10, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'baseline' }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: meta.faixaAtual > 0 ? '#3B6D11' : '#9a9c9f' }}>
              {meta.faixaAtual > 0 ? `Faixa ${meta.faixaAtual} atingida · ${meta.percentualFaixa3}% da faixa 3` : `${meta.percentualFaixa1}% do caminho até a Faixa 1`}
            </span>
            {!meta.mesFechado && (
              <span style={{ fontSize: 12, color: '#9a9c9f' }}>
                Tendência no ritmo atual: <strong style={{ color: '#0D0F14' }}>{fmtBRLCompacto(meta.projecao)}</strong> ({meta.percentualProjecaoFaixa3}% da faixa 3)
              </span>
            )}
          </div>
        </div>
      )}
      {!meta && (
        <div style={{ background: '#fff', border: '0.5px dashed #E8E8E2', borderRadius: 14, padding: '14px 18px', fontSize: 12, color: '#9a9c9f' }}>
          Sem meta cadastrada pra {nomeMesAtual} — adicione uma linha na aba <code>metas_b2b_mensal</code>.
        </div>
      )}

      {/* ── Faturamento por Competência: ano atual x ano anterior ── */}
      <GraficoAnual
        titulo={`Faturamento por Competência · ${anos.atual.ano} x ${anos.anterior.ano}`}
        campo="receitaCompetencia"
        anos={anos}
        corAtual="#3B6D11"
        corAnterior="#c3d89a"
      />

      {/* ── Faturamento por Fechamento: ano atual x ano anterior ─── */}
      <GraficoAnual
        titulo={`Faturamento por Fechamento · ${anos.atual.ano} x ${anos.anterior.ano}`}
        campo="receitaFechamento"
        anos={anos}
        corAtual="#185FA5"
        corAnterior="#a8c8e8"
      />

      {/* ── Leads e conversão, com granularidade ──────────────── */}
      <PainelLeadsConversao filtros={filtros} mesFiltro={mesFiltro} />

      {/* ── Pacotes vendidos (o que compõe o ticket médio) ────── */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Pacotes vendidos · {nomeMesAtual} (competência)</div>
        {pacotes.length === 0 && <div style={{ fontSize: 13, color: '#9a9c9f' }}>Nenhum pacote vendido no período.</div>}
        {pacotes.map(p => (
          <div key={p.pacote} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#3a3c3f', width: 160, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.pacote}</div>
            <div style={{ flex: 1, height: 24, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max((p.qtd/maxPacoteQtd)*100,5)}%`, background: '#7d5ac9', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{p.qtd}x</div>
            </div>
            <div style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: '#5a5c5f', width: 90, textAlign: 'right', flexShrink: 0 }}>{fmtBRLCompacto(p.receita)}</div>
            <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#9a9c9f', width: 80, textAlign: 'right', flexShrink: 0 }}>tkt {fmtBRLCompacto(p.ticketMedio)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* ── Evolução ticket médio ──────────────────────────── */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Evolução do ticket médio (por evento)</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 220, overflowX: 'auto', paddingBottom: 8 }}>
            {serieFaturamento.map(s => (
              <div key={s.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, minWidth: 62, flex: '1 0 62px' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#8a7405', fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(s.ticketMedio)}</span>
                <div style={{ width: '100%', maxWidth: 44, height: `${Math.max((s.ticketMedio/maxTicket)*150,6)}px`, background: '#D9B504', borderRadius: '5px 5px 0 0', minHeight: 6 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#5a5c5f' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Funil compacto ─────────────────────────────────── */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 20 }}>Funil (aberto agora)</div>
          {funil.length === 0 && <div style={{ fontSize: 13, color: '#9a9c9f' }}>Sem deals em aberto no filtro atual.</div>}
          {funil.map(f => (
            <div key={f.etapa} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#3a3c3f', width: 125, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.etapa}</div>
              <div style={{ flex: 1, height: 26, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max((f.count/maxFunil)*100,5)}%`, background: '#97A624', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{f.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
