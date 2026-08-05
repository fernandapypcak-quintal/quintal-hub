import React from 'react'
const MONO = { fontFamily: "'JetBrains Mono', monospace" }

export default function KpiCard({ label, valor, subtitulo, subtituloColor, icon: Icon }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999' }}>{label}</span>
        {Icon && <Icon size={13} color="#DDD" />}
      </div>
      <div style={{ ...MONO, fontSize: 24, fontWeight: 600, color: '#111' }}>{valor}</div>
      {subtitulo && <div style={{ fontSize: 12, color: subtituloColor || '#999' }}>{subtitulo}</div>}
    </div>
  )
}
