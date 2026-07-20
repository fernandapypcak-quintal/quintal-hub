'use client'

import { Deal } from '../../useComercial'

function fmtDate(s: string) {
  if (!s) return '—'
  const p = s.split('T')[0].split('-')
  if (p.length < 3) return s
  return `${p[2]}/${p[1]}/${p[0]}`
}

function fmtBRL(v: any) {
  const n = parseFloat(String(v || 0))
  if (!n) return '—'
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
}

function Row({ label, value }: { label: string; value: any }) {
  if (!value && value !== 0) return null
  const str = String(value)
  if (!str.trim()) return null
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid #F3F3EE', fontSize: 12, gap: 12 }}>
      <span style={{ color: '#9a9c9f', flexShrink: 0 }}>{label}</span>
      <span style={{ fontWeight: 500, textAlign: 'right', wordBreak: 'break-word' }}>{str}</span>
    </div>
  )
}

function statusColor(s: string) {
  return s === 'won' ? '#97A624' : s === 'lost' ? '#A32D2D' : '#185FA5'
}

export default function DealModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const color = statusColor(deal.status)
  const label = deal.status === 'won' ? 'Ganho' : deal.status === 'lost' ? 'Perdido' : 'Aberto'
  const pax   = parseInt(String(deal.qtd_pessoas || '0').replace(/[^0-9]/g, '')) || 0
  const ticketPorPax = pax && deal.valor ? Math.round(Number(deal.valor) / pax) : 0

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '32px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 700, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 32 }}>

        {/* Header verde */}
        <div style={{ background: 'linear-gradient(135deg, #4F6B14, #97A624)', padding: '20px 24px', position: 'relative' }}>
          <button onClick={onClose}
            style={{ position: 'absolute', top: 14, right: 16, background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 14, color: '#fff' }}>
            ✕
          </button>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, background: color, color: '#fff' }}>{label}</span>
            {deal.stage_nome && <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{deal.stage_nome}</span>}
            {deal.unidade_nome && <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 20, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>{deal.unidade_nome.split(',')[0]}</span>}
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.3 }}>{deal.empresa || deal.titulo}</div>
          {deal.razao_social && deal.razao_social !== deal.empresa && (
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 3 }}>{deal.razao_social}</div>
          )}
        </div>

        {/* KPIs rápidos */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '0.5px solid #E8E8E2' }}>
          {[
            { label: 'Data evento', value: fmtDate(deal.data_evento) },
            { label: 'Pax',         value: pax ? `${pax} pax` : '—' },
            { label: 'Valor',       value: fmtBRL(deal.valor), color: '#3B6D11' },
            { label: 'R$/pax',      value: ticketPorPax ? fmtBRL(ticketPorPax) : '—' },
          ].map((k, i) => (
            <div key={k.label} style={{ padding: '12px 14px', borderRight: i < 3 ? '0.5px solid #E8E8E2' : 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, fontFamily: 'DM Mono, monospace', color: k.color || '#0D0F14' }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Corpo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
          <div style={{ padding: '16px 20px', borderRight: '0.5px solid #E8E8E2' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Evento</div>
            <Row label="Tipo"             value={deal.tipo_evento} />
            <Row label="Local / Unidade"  value={deal.local_evento || deal.unidade_nome} />
            <Row label="Horário início"   value={deal.horario_inicio} />
            <Row label="Horário fim"      value={deal.horario_fim} />
            <Row label="Cardápio"         value={deal.cardapio_nome} />
            <Row label="Responsável"      value={deal.responsavel_evento} />
            <Row label="Tel. responsável" value={deal.telefone_responsavel} />
            <Row label="Conferido"        value={deal.conferido} />
            {deal.info_extras && (
              <div style={{ marginTop: 8, padding: 10, background: '#F5F5F2', borderRadius: 8, fontSize: 11, color: '#5a5c5f', lineHeight: 1.5 }}>
                {deal.info_extras}
              </div>
            )}
          </div>

          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Contato</div>
            <Row label="Nome"     value={deal.contato} />
            <Row label="Email"    value={deal.email_contato} />
            <Row label="Telefone" value={deal.telefone_contato} />
            <Row label="CNPJ/CPF" value={deal.cnpj_cpf} />

            <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 8px' }}>Financeiro</div>
            <Row label="Forma pgto"      value={deal.forma_pgto_nome} />
            <Row label="Status contrato" value={deal.status_contrato} />
            <Row label="Vendedor"        value={deal.vendedor} />

            <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.06em', margin: '12px 0 8px' }}>Linha do tempo</div>
            <Row label="Criado em"  value={fmtDate(deal.add_time)} />
            <Row label="Fechado em" value={fmtDate(deal.won_time || deal.lost_time)} />
            {deal.motivo_perda && (
              <div style={{ marginTop: 6, padding: '6px 10px', background: '#fdeaea', borderRadius: 8, fontSize: 11, color: '#a32d2d' }}>
                Motivo perda: {deal.motivo_perda}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
