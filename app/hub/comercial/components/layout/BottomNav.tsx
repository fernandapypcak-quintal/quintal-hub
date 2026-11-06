'use client'

const PAGES = [
  { id: 'resumo',     icon: '🏠', label: 'Resumo' },
  { id: 'calendario', icon: '📅', label: 'Agenda' },
  { id: 'leads',      icon: '📥', label: 'Leads' },
  { id: 'conversoes', icon: '🏆', label: 'Conv.' },
  { id: 'por_loja',   icon: '🏪', label: 'Lojas' },
  { id: 'fechamento_diario', icon: '📆', label: 'Diário' },
  { id: 'vendedores', icon: '🧑‍💼', label: 'Vend.' },
  { id: 'metas',      icon: '🎯', label: 'Metas' },
]

export default function BottomNav({ activePage, onPageChange, podeVerVendedores = false, podeEditarMetas = false }: {
  activePage: string
  onPageChange: (p: string) => void
  podeVerVendedores?: boolean
  podeEditarMetas?: boolean
}) {
  const paginas = PAGES.filter(p => (p.id !== 'vendedores' || podeVerVendedores) && (p.id !== 'metas' || podeEditarMetas))
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #E8E8E2', display: 'flex', zIndex: 50 }}>
      {paginas.map(p => (
        <button key={p.id} onClick={() => onPageChange(p.id)}
          style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, color: activePage === p.id ? '#97A624' : '#9a9c9f', fontWeight: activePage === p.id ? 600 : 400 }}>
          <span style={{ fontSize: 18 }}>{p.icon}</span>{p.label}
        </button>
      ))}
    </nav>
  )
}
