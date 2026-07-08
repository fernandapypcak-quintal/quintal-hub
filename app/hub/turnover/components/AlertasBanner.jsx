// Barra de alertas no topo — aparece só quando há unidades fora da meta
export default function AlertasBanner({ gas, cfg }) {
  if (!gas?.resumo) return null

  const META = cfg?.semaforo_verde_ambar    ?? 5
  const CRIT = cfg?.semaforo_ambar_vermelho ?? 9

  const alertas = []

  // Turnover crítico
  Object.entries(gas.resumo).forEach(([u, r]) => {
    if (r.turnover >= CRIT) {
      alertas.push({ tipo: 'critico', msg: `${u}: turnover ${r.turnover}% — crítico`, icone: '🔴' })
    } else if (r.turnover > META) {
      alertas.push({ tipo: 'atencao', msg: `${u}: turnover ${r.turnover}% — acima da meta`, icone: '🟡' })
    }
  })

  // HC muito abaixo do ideal (ocupação < 75%)
  Object.entries(gas.resumo).forEach(([u, r]) => {
    if (r.hc_ideal > 0 && r.hc_real / r.hc_ideal < 0.75) {
      const pct = Math.round((r.hc_real / r.hc_ideal) * 100)
      alertas.push({ tipo: 'atencao', msg: `${u}: apenas ${pct}% do quadro ideal (${r.hc_real}/${r.hc_ideal})`, icone: '⚠️' })
    }
  })

  // Em experiência > 25%
  Object.entries(gas.resumo).forEach(([u, r]) => {
    if (r.pct_experiencia > 25) {
      alertas.push({ tipo: 'atencao', msg: `${u}: ${Math.round(r.pct_experiencia)}% do time em experiência`, icone: '🟡' })
    }
  })

  if (alertas.length === 0) return (
    <div style={{ background:'#F0F5E0', border:'1px solid #97A624', borderRadius:8, padding:'10px 20px', display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:14 }}>✅</span>
      <span style={{ fontSize:12, color:'#97A624', fontWeight:600 }}>Todas as unidades dentro das metas</span>
    </div>
  )

  const criticos = alertas.filter(a => a.tipo === 'critico')
  const atencao  = alertas.filter(a => a.tipo === 'atencao')

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {criticos.length > 0 && (
        <div style={{ background:'#F5E0E0', border:'1px solid #8C1414', borderRadius:8, padding:'12px 20px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#8C1414', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
            🔴 {criticos.length} {criticos.length === 1 ? 'alerta crítico' : 'alertas críticos'}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {criticos.map((a, i) => (
              <span key={i} style={{ fontSize:12, color:'#8C1414', background:'#fff', border:'1px solid #8C1414', borderRadius:99, padding:'3px 10px' }}>
                {a.msg}
              </span>
            ))}
          </div>
        </div>
      )}
      {atencao.length > 0 && (
        <div style={{ background:'#FDF9E0', border:'1px solid #D9B504', borderRadius:8, padding:'12px 20px' }}>
          <div style={{ fontSize:10, fontWeight:700, color:'#8C6800', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>
            ⚠️ {atencao.length} {atencao.length === 1 ? 'ponto de atenção' : 'pontos de atenção'}
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
            {atencao.map((a, i) => (
              <span key={i} style={{ fontSize:12, color:'#8C6800', background:'#fff', border:'1px solid #D9B504', borderRadius:99, padding:'3px 10px' }}>
                {a.msg}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
