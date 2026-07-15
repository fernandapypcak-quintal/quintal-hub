import React from 'react'
import { useRelatorios } from '../../hooks/useRelatorios.jsx'

export default function Header({ title, subtitle }) {
  const { unidadeFiltro, setUnidadeFiltro, unidadesDisponiveis } = useRelatorios()

  const sel = (ativo) => ({
    appearance: 'none', WebkitAppearance: 'none',
    padding: '0 28px 0 12px', height: 32,
    border: ativo ? '1px solid #1a1a1a' : '1px solid #E8E8E8',
    borderRadius: 99, fontSize: 12.5,
    color: ativo ? '#1a1a1a' : '#666',
    background: '#fff', cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit', fontWeight: ativo ? 600 : 400,
  })

  return (
    <header style={{
      background: '#fff', borderBottom: '1px solid #F0F0F0',
      padding: '12px 28px',
      position: 'sticky', top: 0, zIndex: 20,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      flexWrap: 'wrap',
    }}>
      <div>
        <h1 style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>{title}</h1>
        {subtitle && <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{subtitle}</div>}
      </div>

      <div style={{ position: 'relative' }}>
        <select
          value={unidadeFiltro}
          onChange={e => setUnidadeFiltro(e.target.value)}
          style={sel(unidadeFiltro !== 'Todas')}
        >
          {unidadesDisponiveis.map(u => (
            <option key={u} value={u}>{u === 'Todas' ? 'Todas as unidades' : u}</option>
          ))}
        </select>
      </div>
    </header>
  )
}
