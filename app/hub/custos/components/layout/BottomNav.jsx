import React from 'react'
import { paginasVisiveis } from './navegacao.js'

// v27 — mesmo padrão do Comercial. Conciliação fica só no desktop.
export default function BottomNav({ activePage, onPageChange, podeVerNF = false }) {
  const paginas = paginasVisiveis(podeVerNF).filter(p => !p.soDesktop)
  return (
    <nav className="no-print" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #E8E8E2', display: 'flex', zIndex: 50, paddingBottom: 'env(safe-area-inset-bottom)' }}>
      {paginas.map(p => (
        <button key={p.id} onClick={() => onPageChange(p.id)}
          aria-current={activePage === p.id ? 'page' : undefined}
          style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, fontFamily: 'inherit', color: activePage === p.id ? '#6e7a1a' : '#9a9c9f', fontWeight: activePage === p.id ? 600 : 400 }}>
          <span style={{ fontSize: 18 }} aria-hidden="true">{p.icon}</span>{p.curto}
        </button>
      ))}
    </nav>
  )
}
