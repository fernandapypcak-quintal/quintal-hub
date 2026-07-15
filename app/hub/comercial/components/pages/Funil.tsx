'use client'

import { useSumario } from '../../useComercial'

const STAGE_ORDER = ['[LEADS] Campanhas','1º Contato SDR','Follow UP SDR','RMKT','Clientes Qualificados','1º Contato Vendas','Em Negociação','Orçamento','Visitas','Ficha Técnica','Aguardando Assinatura']
const STAGE_COLORS: Record<string, string> = {
  '[LEADS] Campanhas': '#b0c84a', '1º Contato SDR': '#97A624', 'Follow UP SDR': '#7d9120',
  'RMKT': '#c5a813', 'Clientes Qualificados': '#c5a813', '1º Contato Vendas': '#e09420',
  'Em Negociação': '#d97b1a', 'Orçamento': '#185FA5', 'Visitas': '#2472bd',
  'Ficha Técnica': '#1a8a6e', 'Aguardando Assinatura': '#3B6D11',
}

function fmtBRL(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) }

function KpiCard({ label, value, sub, color = '#97A624' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 5 }}>{sub}</div>}
    </div>
  )
}

export default function Funil({ filtros }: { filtros: { status: any; unidade: string; ano: string } }) {
  const { sumario, loading, erro } = useSumario(filtros)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro)    return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!sumario) return null

  const maxFunil = Math.max(...Object.values(sumario.funil), 1)

  return (
    <div style={{ padding: '24px 20px' }}>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <KpiCard label="Total de deals" value={String(sumario.total)} sub={`${sumario.open} em aberto`} />
        <KpiCard label="Eventos ganhos" value={String(sumario.won)} sub={`Taxa: ${sumario.taxaConversao}%`} color="#3B6D11" />
        <KpiCard label="Receita total" value={fmtBRL(sumario.receitaTotal)} sub={`Ticket médio ${fmtBRL(sumario.ticketMedio)}`} color="#97A624" />
        <KpiCard label="Eventos futuros" value={String(sumario.futuros)} sub={sumario.proximoEvento ? `próx: ${sumario.proximoEvento.data_evento}` : 'nenhum'} color="#185FA5" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 14 }}>
        {/* Funil */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Funil comercial</div>

          {STAGE_ORDER.map(stage => {
            const count = sumario.funil[stage] || 0
            if (!count) return null
            const pct = Math.max((count / (sumario.open || 1)) * 100, 3)
            return (
              <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
                <div style={{ fontSize: 11, color: '#5a5c5f', width: 140, textAlign: 'right', flexShrink: 0 }}>{stage}</div>
                <div style={{ flex: 1, height: 24, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: STAGE_COLORS[stage] || '#97A624', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 500, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{count}</div>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#5a5c5f', width: 28, textAlign: 'right' }}>{count}</div>
              </div>
            )
          })}

          <div style={{ height: 0.5, background: '#E8E8E2', margin: '12px 0' }} />

          {/* Ganhos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 9 }}>
            <div style={{ fontSize: 11, color: '#3B6D11', fontWeight: 600, width: 140, textAlign: 'right' }}>✓ Ganhos</div>
            <div style={{ flex: 1, height: 24, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max((sumario.won / (sumario.total || 1)) * 100, 3)}%`, background: '#3B6D11', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 500, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{sumario.won}</div>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#3B6D11', width: 28, textAlign: 'right' }}>{sumario.won}</div>
          </div>
          {/* Perdidos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: '#a32d2d', width: 140, textAlign: 'right' }}>✗ Perdidos</div>
            <div style={{ flex: 1, height: 24, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max((sumario.lost / (sumario.total || 1)) * 100, 3)}%`, background: '#A32D2D', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 500, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{sumario.lost}</div>
            </div>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#a32d2d', width: 28, textAlign: 'right' }}>{sumario.lost}</div>
          </div>

          <div style={{ height: 0.5, background: '#E8E8E2', margin: '14px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
            {[
              { label: 'Taxa conv.', value: `${sumario.taxaConversao}%`, color: '#3B6D11' },
              { label: 'Ticket médio', value: fmtBRL(sumario.ticketMedio) },
              { label: 'Ciclo médio', value: `${sumario.cicloMedio}d` },
            ].map(s => (
              <div key={s.label} style={{ background: '#F5F5F2', borderRadius: 7, padding: '10px 12px' }}>
                <div style={{ fontSize: 10, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 16, fontWeight: 600, fontFamily: 'DM Mono, monospace', color: s.color || '#0D0F14' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats adicionais */}
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>Resumo</div>
          {[
            { label: 'Total de deals', value: String(sumario.total) },
            { label: 'Em aberto', value: String(sumario.open) },
            { label: 'Ganhos', value: String(sumario.won) },
            { label: 'Perdidos', value: String(sumario.lost) },
            { label: 'Taxa de conversão', value: `${sumario.taxaConversao}%` },
            { label: 'Receita total', value: fmtBRL(sumario.receitaTotal) },
            { label: 'Ticket médio', value: fmtBRL(sumario.ticketMedio) },
            { label: 'Ciclo médio', value: `${sumario.cicloMedio} dias` },
            { label: 'Pax total', value: sumario.paxTotal.toLocaleString('pt-BR') },
            { label: 'Pax médio/evento', value: String(sumario.mediaPaxPorEvento) },
            { label: 'Eventos futuros', value: String(sumario.futuros) },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '0.5px solid #F3F3EE', fontSize: 12 }}>
              <span style={{ color: '#9a9c9f' }}>{r.label}</span>
              <span style={{ fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{r.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
