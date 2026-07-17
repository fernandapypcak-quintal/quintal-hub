'use client'

import { useDeals } from '../../useComercial'

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
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
}

export default function Leads({ filtros }: { filtros: { status: any; unidade: string; ano: string; mes: string } }) {
  const { deals, total, loading, erro } = useDeals({ ...filtros, status: '' }, 1)

  // Agrupa por data de criação (add_time)
  const porDia: Record<string, typeof deals> = {}
  deals.forEach(d => {
    const dia = String(d.add_time || '').substring(0, 10)
    if (!dia) return
    if (!porDia[dia]) porDia[dia] = []
    porDia[dia].push(d)
  })

  const dias = Object.keys(porDia).sort((a, b) => b.localeCompare(a))

  if (erro) return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>

  return (
    <div style={{ padding: '20px' }}>
      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #97A624' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>Total de leads</div>
          <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>{total}</div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>{dias.length} dias com entrada</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>Média diária</div>
          <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>
            {dias.length ? (total / dias.length).toFixed(1) : '0'}
          </div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>leads por dia</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '16px 18px', borderTop: '3px solid #D9B504' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>Pico do período</div>
          <div style={{ fontSize: 26, fontWeight: 600, fontFamily: 'DM Mono, monospace' }}>
            {dias.length ? Math.max(...dias.map(d => porDia[d].length)) : 0}
          </div>
          <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: 4 }}>maior dia</div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: '#9a9c9f', padding: 40 }}>Carregando...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {dias.map(dia => (
            <div key={dia} style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, overflow: 'hidden' }}>
              {/* Header do dia */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: '#F5F5F2', borderBottom: '0.5px solid #E8E8E2' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtDate(dia)}</span>
                  <span style={{ fontSize: 11, color: '#9a9c9f' }}>
                    {new Date(dia + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, fontFamily: 'DM Mono, monospace', background: '#0D0F14', color: '#97A624', padding: '2px 10px', borderRadius: 20 }}>
                    {porDia[dia].length} leads
                  </span>
                </div>
              </div>

              {/* Lista de deals do dia */}
              <div style={{ padding: '6px 8px' }}>
                {porDia[dia].map(d => (
                  <div key={d.id} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 70px', gap: 10, padding: '8px 8px', borderRadius: 6, alignItems: 'center', fontSize: 12, borderBottom: '0.5px solid #F5F5F2' }}>
                    <div>
                      <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa || d.titulo}</div>
                      <div style={{ fontSize: 10, color: '#9a9c9f', marginTop: 1 }}>{d.stage_nome}</div>
                    </div>
                    <span style={{ fontSize: 11, color: '#9a9c9f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.unidade_nome || '—'}</span>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: '#9a9c9f' }}>
                      evento: {fmtDate(d.data_evento)}
                    </span>
                    <StatusTag status={d.status} />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {dias.length === 0 && (
            <div style={{ textAlign: 'center', color: '#9a9c9f', fontSize: 13, padding: 40 }}>
              Nenhum lead encontrado no período
            </div>
          )}
        </div>
      )}
    </div>
  )
}
