const CORES = { verde:'#97A624', vermelho:'#8C1414', ambar:'#D9B504', cinza:'#888', preto:'#0D0D0D' }

export default function KpiCard({ label, valor, sub, cor = 'preto', prefixo = '', sufixo = '' }) {
  const corFinal = CORES[cor] || cor
  // Garantir que valor nunca seja undefined/null
  const valorSafe = valor == null ? '—' : valor
  return (
    <div style={{ background:'#fff', border:'1px solid #E8E8E2', borderRadius:8, padding:'16px 20px' }}>
      <div style={{ fontSize:10.5, fontWeight:600, color:'#ABABAB', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:26, fontWeight:700, color:'#0D0D0D', fontFamily:"'DM Mono', monospace", letterSpacing:'-0.02em', lineHeight:1.1 }}>
        {prefixo}{valorSafe}{sufixo}
      </div>
      {sub && <div style={{ fontSize:12, color:corFinal, fontWeight:500, marginTop:4 }}>{sub}</div>}
    </div>
  )
}
