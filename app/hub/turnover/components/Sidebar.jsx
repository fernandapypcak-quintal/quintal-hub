export default function Sidebar({ pagina, setPagina }) {
  const itens = [
    { id:'rh',    label:'Turnover & HC',     icone:'👥' },
    { id:'custo', label:'Custos com Pessoas', icone:'💰' },
  ]
  return (
    <div style={{ width:220, flexShrink:0, background:'#fff', borderRight:'1px solid #E8E8E2', display:'flex', flexDirection:'column' }}>
      {/* Logo */}
      <div style={{ background:'#0D0D0D', padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <img src="/logo.png" style={{ width:36, height:36, objectFit:'contain', flexShrink:0 }}/>
        <div>
          <div style={{ color:'#fff', fontWeight:700, fontSize:14, lineHeight:1.2 }}>Turnover & HC</div>
          <div style={{ color:'#888', fontSize:10, lineHeight:1.3 }}>Quintal do Espeto</div>
        </div>
      </div>

      {/* Nav */}
      <div style={{ flex:1, padding:'16px 12px' }}>
        <div style={{ fontSize:9, fontWeight:600, color:'#ABABAB', letterSpacing:'0.1em', padding:'0 8px', marginBottom:8 }}>OPERAÇÕES</div>
        {itens.map(item => {
          const ativo = item.id === pagina
          return (
            <button key={item.id} onClick={() => setPagina(item.id)}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'8px 12px', borderRadius:6, border:'none', cursor:'pointer',
                background: ativo ? '#0D0D0D' : 'transparent',
                color: ativo ? '#fff' : '#3D3D3D',
                marginBottom:2, textAlign:'left',
              }}>
              {ativo
                ? <span style={{ width:6, height:6, borderRadius:'50%', background:'#97A624', flexShrink:0 }} />
                : <span style={{ width:6, height:6, flexShrink:0 }} />}
              <span style={{ fontSize:14 }}>{item.icone}</span>
              <span style={{ fontSize:12.5, fontWeight:500 }}>{item.label}</span>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid #E8E8E2' }}>
        <div style={{ fontSize:11, color:'#BDBDBD' }}>Atualizado</div>
        <div style={{ fontSize:11, fontWeight:600, color:'#0D0D0D' }}>Jun/2026</div>
      </div>
    </div>
  )
}
