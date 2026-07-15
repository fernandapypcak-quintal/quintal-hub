import { useState } from 'react'
import { MESES } from '../useGASData.js'

export default function ExportButton({ gas, cfg, mesIdx, unidade }) {
  const [exportando, setExportando] = useState(false)

  function exportarPDF() {
    setExportando(true)
    // Usa window.print() com estilos de impressão
    // O CSS de print está no index.css
    setTimeout(() => {
      window.print()
      setExportando(false)
    }, 300)
  }

  function exportarCSV() {
    if (!gas?.resumo) return

    const linhas = [
      ['Unidade','HC Real','HC Ideal','Desvio','Ocupação %','Admissões','Desligamentos','Turnover %','Em Experiência','% Experiência'],
    ]

    Object.entries(gas.resumo).forEach(([u, r]) => {
      linhas.push([
        u,
        r.hc_real,
        r.hc_ideal,
        r.desvio,
        r.ocupacao,
        r.admissoes,
        r.desligamentos,
        r.turnover,
        r.em_experiencia,
        Math.round(r.pct_experiencia * 10) / 10,
      ])
    })

    const csv = linhas.map(l => l.join(';')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `quintal_rh_${MESES[mesIdx]?.replace('/', '_') ?? 'export'}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display:'flex', gap:8 }}>
      <button onClick={exportarCSV} disabled={!gas?.resumo}
        style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'6px 14px', borderRadius:6, border:'1px solid #E8E8E2',
          background:'#fff', color: !gas?.resumo ? '#BDBDBD' : '#0D0D0D',
          fontSize:12, fontWeight:500, cursor: !gas?.resumo ? 'not-allowed' : 'pointer',
          fontFamily:"'DM Sans', sans-serif",
        }}>
        <span>⬇</span> CSV
      </button>
      <button onClick={exportarPDF} disabled={exportando}
        style={{
          display:'flex', alignItems:'center', gap:6,
          padding:'6px 14px', borderRadius:6, border:'1px solid #0D0D0D',
          background:'#0D0D0D', color:'#fff',
          fontSize:12, fontWeight:500, cursor:'pointer',
          fontFamily:"'DM Sans', sans-serif",
        }}>
        <span>🖨</span> {exportando ? 'Gerando...' : 'Imprimir / PDF'}
      </button>
    </div>
  )
}
