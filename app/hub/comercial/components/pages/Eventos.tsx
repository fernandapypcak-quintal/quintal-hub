'use client'

import { useState } from 'react'
import { useDeals, Deal } from '../../useComercial'

function fmtDate(s: string) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

function StatusTag({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    won:  { label: 'Ganho',   bg: '#eaf3de', color: '#27500A' },
    open: { label: 'Aberto',  bg: '#e6f1fb', color: '#0C447C' },
    lost: { label: 'Perdido', bg: '#fdeaea', color: '#a32d2d' },
  }
  const s = map[status] || { label: status, bg: '#f0f0ec', color: '#5a5c5f' }
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 9px', borderRadius: 20, background: s.bg, color: s.color, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>{s.label}</span>
}

function DetalheModal({ deal, onClose }: { deal: Deal; onClose: () => void }) {
  const rows = [
    ['Empresa', deal.empresa], ['Razão Social', deal.razao_social], ['CNPJ/CPF', deal.cnpj_cpf],
    ['Contato', deal.contato], ['Telefone', deal.telefone_contato], ['Email', deal.email_contato],
    ['Data do evento', fmtDate(deal.data_evento)], ['Horário início', deal.horario_inicio], ['Horário fim', deal.horario_fim],
    ['Tipo de evento', deal.tipo_evento], ['Local', deal.local_evento || deal.unidade_nome],
    ['Cardápio', deal.cardapio_nome], ['Pax', String(deal.qtd_pessoas || '—')],
    ['Valor', deal.valor ? deal.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'],
    ['Forma pgto', deal.forma_pgto_nome], ['Status contrato', deal.status_contrato],
    ['Responsável', deal.responsavel_evento], ['Telefone resp.', deal.telefone_responsavel],
    ['Vendedor', deal.vendedor], ['Etapa', deal.stage_nome],
    ['Criado em', fmtDate(deal.add_time?.split(' ')[0])],
    ['Fechado em', fmtDate((deal.won_time || deal.lost_time || '').split(' ')[0])],
    ['Motivo perda', deal.motivo_perda], ['Conferido', deal.conferido],
    ['Info extras', deal.info_extras],
  ].filter(([, v]) => v)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 680, padding: 24, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9a9c9f' }}>✕</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <StatusTag status={deal.status} />
          <span style={{ fontSize: 10, color: '#9a9c9f' }}>{deal.stage_nome}</span>
          {deal.unidade_nome && <span style={{ fontSize: 10, background: '#f0f0ec', padding: '2px 8px', borderRadius: 20, color: '#5a5c5f' }}>{deal.unidade_nome}</span>}
        </div>
        <h2 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 20px' }}>{deal.empresa || deal.titulo}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          {rows.map(([label, value]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '0.5px solid #F3F3EE', fontSize: 12, gridColumn: String(value).length > 40 ? 'span 2' : 'auto' }}>
              <span style={{ color: '#9a9c9f' }}>{label}</span>
              <span style={{ fontWeight: 500, maxWidth: '60%', textAlign: 'right', wordBreak: 'break-word' }}>{String(value)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function Eventos({ filtros }: { filtros: { status: any; unidade: string; ano: string } }) {
  const [page, setPage]         = useState(1)
  const [search, setSearch]     = useState('')
  const [selected, setSelected] = useState<Deal | null>(null)
  const { deals, total, pages, loading, erro } = useDeals(filtros, page)

  const filtered = deals.filter(d =>
    !search || (d.empresa || d.titulo || '').toLowerCase().includes(search.toLowerCase())
  )

  if (erro) return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>

  return (
    <div style={{ padding: '20px' }}>
      {selected && <DetalheModal deal={selected} onClose={() => setSelected(null)} />}

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar empresa..."
          style={{ flex: 1, minWidth: 200, padding: '7px 12px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12, outline: 'none' }} />
        <span style={{ fontSize: 12, color: '#9a9c9f', alignSelf: 'center' }}>{total} deals</span>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 80px 70px', gap: 10, padding: '10px 16px', fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', letterSpacing: '0.05em', background: '#F5F5F2' }}>
          <span>Empresa</span><span>Data evento</span><span>Unidade</span><span style={{ textAlign: 'center' }}>Pax</span><span>Status</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f', fontSize: 13 }}>Carregando...</div>
        ) : (
          <div style={{ padding: '6px 8px' }}>
            {filtered.map(d => (
              <div key={d.id} onClick={() => setSelected(d)}
                style={{ display: 'grid', gridTemplateColumns: '1fr 90px 100px 80px 70px', gap: 10, padding: '9px 8px', borderRadius: 8, alignItems: 'center', fontSize: 12, cursor: 'pointer', borderBottom: '0.5px solid #F3F3EE' }}
                onMouseOver={e => (e.currentTarget.style.background = '#F5F5F2')}
                onMouseOut={e => (e.currentTarget.style.background = '')}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa || d.titulo}</span>
                <span style={{ fontFamily: 'DM Mono, monospace' }}>{fmtDate(d.data_evento)}</span>
                <span style={{ fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.unidade_nome || '—'}</span>
                <span style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace' }}>{d.qtd_pessoas || '—'}</span>
                <StatusTag status={d.status} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
            style={{ padding: '6px 14px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === 1 ? 0.4 : 1 }}>← Anterior</button>
          <span style={{ fontSize: 12, color: '#9a9c9f', alignSelf: 'center' }}>{page} / {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p+1))} disabled={page === pages}
            style={{ padding: '6px 14px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', cursor: 'pointer', fontSize: 12, opacity: page === pages ? 0.4 : 1 }}>Próxima →</button>
        </div>
      )}
    </div>
  )
}
