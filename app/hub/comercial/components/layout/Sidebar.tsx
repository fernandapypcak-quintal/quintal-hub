'use client'

const PAGES = [
  { id: 'funil',      icon: '📊', label: 'Funil' },
  { id: 'eventos',    icon: '📋', label: 'Eventos' },
  { id: 'calendario', icon: '📅', label: 'Calendário' },
  { id: 'leads',      icon: '📥', label: 'Leads diários' },
  { id: 'conversoes',  icon: '🏆', label: 'Conversões' },
]

export default function Sidebar({ activePage, onPageChange }: {
  activePage: string
  onPageChange: (p: string) => void
}) {
  return (
    <aside style={{ width: 220, background: '#fff', borderRight: '0.5px solid #E8E8E2', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #E8E8E2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#0D0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#97A624', fontWeight: 700, fontFamily: 'monospace' }}>QE</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Comercial</div>
          <div style={{ fontSize: 10, color: '#9a9c9f' }}>Eventos B2B</div>
        </div>
      </div>

      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {PAGES.map(p => (
          <button key={p.id} onClick={() => onPageChange(p.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 9,
              width: '100%', padding: '8px 14px', borderRadius: 7,
              border: 'none', cursor: 'pointer', fontSize: 13,
              background: activePage === p.id ? '#f0f4e0' : 'transparent',
              color: activePage === p.id ? '#6e7a1a' : '#5a5c5f',
              fontWeight: activePage === p.id ? 500 : 400,
              marginBottom: 2,
            }}>
            <span>{p.icon}</span>
            {p.label}
          </button>
        ))}
      </nav>
    </aside>
  )
}
