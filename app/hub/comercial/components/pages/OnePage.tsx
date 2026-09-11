'use client'

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
    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: d.up ? '#eaf3de' : '#fdeaea', color: d.up ? '#3B6D11' : '#a32d2d', fontWeight: 600, whiteSpace: 'nowrap' }}>
      {d.up ? '↑' : '↓'} {d.pct}% {label}
    </span>
  )
}

export default function OnePage({ filtros }: { filtros: any }) {
  const { dados, loading, erro } = useOnePage(filtros)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!dados)  return null

  const { atual, mesAnterior, anoAnterior, serieFaturamento, funil, meta } = dados
  const nomesMeses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  const nomeMesAtual = nomesMeses[parseInt(atual.mes.split('-')[1])-1]

  const maxFat = Math.max(...serieFaturamento.map(s => Math.max(s.receitaCompetencia, s.receitaFechamento)), 1)
  const maxTicket = Math.max(...serieFaturamento.map(s => s.ticketMedio), 1)
  const maxFunil = Math.max(...funil.map(f => f.count), 1)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── KPIs principais ────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #97A624' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Leads · {nomeMesAtual}</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'DM Mono, monospace', lineHeight: 1, marginBottom: 8 }}>{atual.leads}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.leads} ant={mesAnterior.leads} label="vs mês ant." />
            <DeltaTag atual={atual.leads} ant={anoAnterior.leads} label="vs ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #3B6D11' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Conversões · {nomeMesAtual}</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11', lineHeight: 1, marginBottom: 8 }}>{atual.won}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.won} ant={mesAnterior.won} label="vs mês ant." />
            <DeltaTag atual={atual.won} ant={anoAnterior.won} label="vs ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Taxa de conversão</div>
          <div style={{ fontSize: 28, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#185FA5', lineHeight: 1, marginBottom: 8 }}>{atual.taxaConversao}%</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.taxaConversao} ant={mesAnterior.taxaConversao} label="vs mês ant." />
            <DeltaTag atual={atual.taxaConversao} ant={anoAnterior.taxaConversao} label="vs ano ant." />
          </div>
        </div>

        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #D9B504' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Ticket médio</div>
          <div style={{ fontSize: 24, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#8a7405', lineHeight: 1, marginBottom: 8 }}>{fmtBRLCompacto(atual.ticketMedio)}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <DeltaTag atual={atual.ticketMedio} ant={mesAnterior.ticketMedio} label="vs mês ant." />
            <DeltaTag atual={atual.ticketMedio} ant={anoAnterior.ticketMedio} label="vs ano ant." />
          </div>
        </div>
      </div>

      {/* ── Meta do mês (faixas) ───────────────────────────── */}
      {meta && (
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Meta de faturamento · {nomeMesAtual}</span>
            <span style={{ fontSize: 12, color: '#9a9c9f' }}>Fechado no mês: <strong style={{ color: '#0D0F14' }}>{fmtBRLCompacto(meta.atingido)}</strong></span>
          </div>
          <div style={{ position: 'relative', height: 28, background: '#F5F5F2', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${Math.min(meta.percentualFaixa3, 100)}%`,
              background: meta.faixaAtual >= 3 ? '#3B6D11' : meta.faixaAtual === 2 ? '#97A624' : meta.faixaAtual === 1 ? '#D9B504' : '#c9855a',
              borderRadius: 8, transition: 'width 0.5s',
            }} />
            {[meta.faixa1, meta.faixa2].map((f, i) => (
              <div key={i} style={{ position: 'absolute', top: 0, bottom: 0, left: `${Math.min((f/meta.faixa3)*100, 100)}%`, width: 2, background: '#fff' }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: '#9a9c9f' }}>
            <span>Faixa 1: {fmtBRLCompacto(meta.faixa1)}</span>
            <span>Faixa 2: {fmtBRLCompacto(meta.faixa2)}</span>
            <span>Faixa 3: {fmtBRLCompacto(meta.faixa3)}</span>
          </div>
          <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: meta.faixaAtual > 0 ? '#3B6D11' : '#9a9c9f' }}>
            {meta.faixaAtual > 0 ? `Faixa ${meta.faixaAtual} atingida · ${meta.percentualFaixa3}% da faixa 3` : `${meta.percentualFaixa1}% do caminho até a Faixa 1`}
          </div>
        </div>
      )}
      {!meta && (
        <div style={{ background: '#fff', border: '0.5px dashed #E8E8E2', borderRadius: 14, padding: '14px 18px', fontSize: 12, color: '#9a9c9f' }}>
          Sem meta cadastrada pra {nomeMesAtual} — adicione uma linha na aba <code>metas_b2b_mensal</code>.
        </div>
      )}

      {/* ── Faturamento mês a mês: competência x fechamento ─── */}
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <span style={{ fontSize: 13, fontWeight: 600 }}>Faturamento mês a mês</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9a9c9f' }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#97A624', display: 'inline-block' }} />Competência</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#9a9c9f' }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#185FA5', display: 'inline-block' }} />Fechamento</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 160, overflowX: 'auto', paddingBottom: 8 }}>
          {serieFaturamento.map(s => (
            <div key={s.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 56, flex: '1 0 56px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 120 }}>
                <div title={fmtBRLCompacto(s.receitaCompetencia)} style={{ width: 16, height: `${Math.max((s.receitaCompetencia/maxFat)*100,2)}%`, background: '#97A624', borderRadius: '3px 3px 0 0' }} />
                <div title={fmtBRLCompacto(s.receitaFechamento)} style={{ width: 16, height: `${Math.max((s.receitaFechamento/maxFat)*100,2)}%`, background: '#185FA5', borderRadius: '3px 3px 0 0' }} />
              </div>
              <span style={{ fontSize: 9, color: '#9a9c9f', textAlign: 'center' }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
        {/* ── Evolução ticket médio ──────────────────────────── */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Evolução do ticket médio</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 130, overflowX: 'auto', paddingBottom: 8 }}>
            {serieFaturamento.map(s => (
              <div key={s.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 46, flex: '1 0 46px' }}>
                <span style={{ fontSize: 9, color: '#9a9c9f', fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(s.ticketMedio)}</span>
                <div style={{ width: '100%', maxWidth: 34, height: `${Math.max((s.ticketMedio/maxTicket)*100,3)}%`, background: '#D9B504', borderRadius: '4px 4px 0 0', minHeight: 4 }} />
                <span style={{ fontSize: 9, color: '#9a9c9f' }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Funil compacto ─────────────────────────────────── */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14 }}>Funil (aberto)</div>
          {funil.length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f' }}>Sem deals em aberto no filtro atual.</div>}
          {funil.map(f => (
            <div key={f.etapa} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
              <div style={{ fontSize: 10, color: '#5a5c5f', width: 100, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.etapa}</div>
              <div style={{ flex: 1, height: 18, background: '#F5F5F2', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max((f.count/maxFunil)*100,4)}%`, background: '#97A624', borderRadius: 4, display: 'flex', alignItems: 'center', paddingLeft: 6, fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{f.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
