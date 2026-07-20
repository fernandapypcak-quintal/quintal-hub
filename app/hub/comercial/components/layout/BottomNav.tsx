'use client'

const PAGES = [
  { id: 'funil',      icon: '📊', label: 'Funil' },
  { id: 'eventos',    icon: '📋', label: 'Eventos' },
  { id: 'calendario', icon: '📅', label: 'Cal.' },
  { id: 'leads',      icon: '📥', label: 'Leads' },
  { id: 'conversoes',  icon: '🏆', label: 'Conversões' },
]

export default function BottomNav({ activePage, onPageChange }: {
  activePage: string
  onPageChange: (p: string) => void
}) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #E8E8E2', display: 'flex', zIndex: 50 }}>
      {PAGES.map(p => (
        <button key={p.id} onClick={() => onPageChange(p.id)}
          style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, color: activePage === p.id ? '#97A624' : '#9a9c9f', fontWeight: activePage === p.id ? 600 : 400 }}>
          <span style={{ fontSize: 18 }}>{p.icon}</span>
          {p.label}
        </button>
      ))}
    </nav>
  )
}
