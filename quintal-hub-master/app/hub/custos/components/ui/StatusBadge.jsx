import React from 'react'
const MAP = {
  pago:     { label:'Pago',     bg:'#F0FDF4', color:'#16a34a' },
  pendente: { label:'Pendente', bg:'#FFFBEB', color:'#d97706' },
  vencido:  { label:'Vencido',  bg:'#FEF2F2', color:'#dc2626' },
}
export default function StatusBadge({ status }) {
  const s = MAP[status] || MAP.pendente
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:99, fontSize:11.5, fontWeight:500, background:s.bg, color:s.color, whiteSpace:'nowrap' }}>
      <span style={{ width:5, height:5, borderRadius:'50%', background:s.color, flexShrink:0 }}/>
      {s.label}
    </span>
  )
}
