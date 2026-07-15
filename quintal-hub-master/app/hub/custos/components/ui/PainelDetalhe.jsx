import React from 'react'
import { X } from 'lucide-react'
import StatusBadge from './StatusBadge.jsx'
import { fmt, fmtData } from '../../utils.js'

function Row({ label, children }) {
  return (
    <div>
      <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.05em', textTransform:'uppercase', color:'#999', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, color:'#1a1a1a' }}>{children}</div>
    </div>
  )
}

export default function PainelDetalhe({ conta, onClose }) {
  if (!conta) return null
  const venc = conta.vencimento ? fmtData(conta.vencimento) : '—'
  return (
    <>
      <div className="painel-overlay" onClick={onClose}/>
      <div className="painel-lateral">
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #F0F0F0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.05em', textTransform:'uppercase', color:'#999', marginBottom:6 }}>Detalhe da Conta</div>
            <div style={{ fontSize:17, fontWeight:700, color:'#1a1a1a', lineHeight:1.3 }}>{conta.nome}</div>
          </div>
          <button onClick={onClose} style={{ border:'none', background:'none', cursor:'pointer', padding:4, color:'#CCC' }}>
            <X size={18}/>
          </button>
        </div>
        <div style={{ padding:'18px 24px', background:'#FAFAFA', borderBottom:'1px solid #F0F0F0' }}>
          <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.05em', textTransform:'uppercase', color:'#999', marginBottom:6 }}>Valor</div>
          <div style={{ fontSize:32, fontWeight:700, color:'#1a1a1a', fontVariantNumeric:'tabular-nums' }}>{fmt(conta.valor)}</div>
        </div>
        <div style={{ padding:'14px', display:'flex', flexDirection:'column', gap:18 }}>
          <Row label="Status"><StatusBadge status={conta.status}/></Row>
          <Row label="Fornecedor">{conta.fornecedor}</Row>
          <Row label="Vencimento">{venc}</Row>
          <Row label="Categoria">{conta.categoria}</Row>
          <Row label="Unidade">{conta.centro}</Row>
          {conta.observacao && (
            <div>
              <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.05em', textTransform:'uppercase', color:'#999', marginBottom:6 }}>Observação</div>
              <div style={{ fontSize:13.5, color:'#555', background:'#F7F7F7', borderRadius:8, padding:'10px 14px', lineHeight:1.6 }}>{conta.observacao}</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
