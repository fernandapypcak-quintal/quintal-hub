import React from 'react'
import { GRUPOS, paginasVisiveis } from './navegacao.js'

// v27.2 — mesmo padrão do Comercial (fundo branco, item ativo verde-claro)
export default function Sidebar({ page, setPage, podeVerNF = false }) {
  const paginas = paginasVisiveis(podeVerNF)
  const inicio = paginas.filter(p => p.grupo === 'inicio')
  const grupos = GRUPOS.map(g => ({ ...g, itens: paginas.filter(p => p.grupo === g.id) })).filter(g => g.itens.length)

  const botao = p => (
    <button key={p.id} onClick={() => setPage(p.id)}
      aria-current={page === p.id ? 'page' : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        width: '100%', padding: '8px 14px', borderRadius: 7,
        border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
        background: page === p.id ? '#f0f4e0' : 'transparent',
        color: page === p.id ? '#6e7a1a' : '#5a5c5f',
        fontWeight: page === p.id ? 500 : 400,
        marginBottom: 2,
      }}>
      <span aria-hidden="true">{p.icon}</span>{p.label}
    </button>
  )

  return (
    <aside className="no-print" style={{ width: 220, background: '#fff', borderRight: '0.5px solid #E8E8E2', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #E8E8E2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#0D0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#97A624', fontWeight: 700, fontFamily: 'monospace' }}>QE</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Custos</div>
          <div style={{ fontSize: 10, color: '#9a9c9f' }}>Notas, pagamentos e áreas</div>
        </div>
      </div>
      <nav style={{ padding: '12px 8px', flex: 1, overflowY: 'auto' }}>
        {inicio.map(botao)}
        {grupos.map(g => (
          <div key={g.id} style={{ marginTop: 14 }}>
            <div style={{ fontSize: 11, color: '#9a9c9f', padding: '0 14px 6px' }}>{g.label}</div>
            {g.itens.map(botao)}
          </div>
        ))}
      </nav>
    </aside>
  )
}
