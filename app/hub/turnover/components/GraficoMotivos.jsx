import { useState, useEffect, useRef } from 'react'

const CORES_MOTIVO = {
  // Nomes do TOTVS (maiúsculas)
  'RESCISAO SEM JUSTA CAUSA INICIATIVA DO EMPREGADOR': '#8C1414',
  'RESCISAO SEM JUSTA CAUSA INICIATIVA EMPREGADO':     '#D9B504',
  'EXTINCAO DO CONTRATO DE TRABALHO INICIATIVA EMPREGADOR': '#97A624',
  'TRANSFERENCIA SEM ONUS PARA A CEDENTE':             '#ABABAB',
  'RESCISAO COM JUSTA CAUSA INICIATIVA DO EMPREGADOR': '#6B0000',
  'DESLIGAMENTO POR ACORDO ENTRE EMPREGADO E EMPREGADOR': '#4A90D9',
  'FALECIMENTO':                                        '#888888',
  // Nomes legados (português)
  'Demissão sem justa causa':      '#8C1414',
  'Pedido de demissão':            '#D9B504',
  'Fim de contrato / experiência': '#97A624',
  'Demissão por justa causa':      '#6B0000',
  'Transferência':                 '#ABABAB',
  'Acordo':                        '#4A90D9',
  'Falecimento':                   '#888888',
}

const CORES_FALLBACK = ['#2D5F8A','#5B8C5A','#C4A24B','#8A4F7D','#4A7B9D','#6B8F5E']

function corMotivo(motivo, idx) {
  if (CORES_MOTIVO[motivo]) return CORES_MOTIVO[motivo]
  return CORES_FALLBACK[idx % CORES_FALLBACK.length]
}

function fmtMes(mesStr) {
  if (!mesStr) return ''
  const [ano, mes] = mesStr.split('-')
  const n = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  return `${n[parseInt(mes)-1]}/${ano.slice(2)}`
}

export default function GraficoMotivos({ historico, mesSelecionado }) {
  const [tooltip, setTooltip]       = useState(null)
  const [paginaAtual, setPagina]    = useState(0)
  const [motivoFiltro, setFiltro]   = useState(null) // null = todos
  const containerRef                = useRef(null)

  const ordenado = historico ? [...historico].sort((a,b) => a.mes.localeCompare(b.mes)) : []

  useEffect(() => {
    if (!mesSelecionado || ordenado.length === 0) return
    const idx = ordenado.findIndex(h => h.mes === mesSelecionado)
    if (idx >= 0) {
      const totalPags = Math.ceil(ordenado.length / 12)
      setPagina(totalPags - 1 - Math.floor(idx / 12))
    }
  }, [mesSelecionado, historico])

  if (ordenado.length === 0) return (
    <div style={{ padding:40, textAlign:'center', fontSize:12, color:'#ABABAB' }}>
      Aguardando dados...
    </div>
  )

  const totais = {}
  ordenado.forEach(h => Object.entries(h.motivos).forEach(([m,q]) => { totais[m] = (totais[m]||0)+q }))
  const motivosOrdenados = Object.keys(totais).sort((a,b) => totais[b]-totais[a])

  const POR_PAG   = 12
  const totalPags = Math.ceil(ordenado.length / POR_PAG)
  const pReal     = totalPags - 1 - paginaAtual
  const pagina    = ordenado.slice(pReal * POR_PAG, (pReal+1) * POR_PAG)
  const maxTotal  = Math.max(...pagina.map(h =>
    motivoFiltro
      ? (h.motivos[motivoFiltro] || 0)
      : Object.values(h.motivos).reduce((s,v)=>s+v,0)
  ), 1)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }} ref={containerRef}>

      {/* Legenda com filtro */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
        <button
          onClick={() => setFiltro(null)}
          style={{
            padding:'3px 10px', borderRadius:20, fontSize:11, cursor:'pointer', border:'none',
            background: motivoFiltro === null ? '#0D0D0D' : '#F0F0EC',
            color: motivoFiltro === null ? '#fff' : '#666',
            fontFamily:"'DM Sans',sans-serif", fontWeight: motivoFiltro === null ? 700 : 400,
            transition:'all 0.15s',
          }}>
          Todos
        </button>
        {motivosOrdenados.map((m, i) => {
          const ativo = motivoFiltro === m
          return (
            <button key={m} onClick={() => setFiltro(ativo ? null : m)}
              style={{
                display:'flex', alignItems:'center', gap:5, padding:'3px 10px',
                borderRadius:20, cursor:'pointer', border:'none',
                background: ativo ? corMotivo(m,i) : '#F0F0EC',
                opacity: motivoFiltro && !ativo ? 0.45 : 1,
                transition:'all 0.15s',
              }}>
              <span style={{ width:8, height:8, borderRadius:2, background: ativo ? '#fff' : corMotivo(m,i), flexShrink:0, display:'inline-block' }} />
              <span style={{ fontSize:11, color: ativo ? '#fff' : '#3D3D3D', fontFamily:"'DM Sans',sans-serif" }}>{m}</span>
              <span style={{ fontSize:10, color: ativo ? 'rgba(255,255,255,0.8)' : '#ABABAB', fontFamily:"'DM Mono',monospace" }}>({totais[m]})</span>
            </button>
          )
        })}
      </div>

      {/* Gráfico */}
      <div style={{ position:'relative' }}>
        <div style={{ display:'flex', gap:8, height:220, paddingLeft:36, position:'relative', alignItems:'flex-end' }}>

          {/* Linhas de grade */}
          <div style={{ position:'absolute', left:36, right:0, top:0, bottom:0, pointerEvents:'none' }}>
            {[0,0.25,0.5,0.75,1].map(f => (
              <div key={f} style={{ position:'absolute', left:0, right:0, top:`${f*100}%`, borderTop:'1px solid #E8E8E2' }}>
                <span style={{ position:'absolute', left:-34, fontSize:9, color:'#BDBDBD', fontFamily:"'DM Mono',monospace" }}>
                  {Math.round(maxTotal*(1-f))}
                </span>
              </div>
            ))}
          </div>

          {pagina.map((h) => {
            const total = motivoFiltro
              ? (h.motivos[motivoFiltro] || 0)
              : Object.values(h.motivos).reduce((s,v)=>s+v,0)
            const isSel = h.mes === mesSelecionado
            const hPct  = (total / maxTotal) * 100

            return (
              <div key={h.mes}
                style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', height:'100%', justifyContent:'flex-end', position:'relative' }}
                onMouseEnter={e => {
                  const rect   = e.currentTarget.getBoundingClientRect()
                  const parent = containerRef.current?.getBoundingClientRect()
                  setTooltip({ mes:h.mes, motivos:h.motivos, total,
                    x: rect.left - (parent?.left||0) + rect.width/2,
                    y: rect.top  - (parent?.top||0)
                  })
                }}
                onMouseLeave={() => setTooltip(null)}
              >
                <div style={{ fontSize:10, color:isSel?'#0D0D0D':'#888', fontWeight:isSel?700:500, fontFamily:"'DM Mono',monospace", marginBottom:3 }}>
                  {total || ''}
                </div>
                <div style={{
                  width:'100%', height:`${hPct}%`,
                  display:'flex', flexDirection:'column',
                  borderRadius:'3px 3px 0 0', overflow:'hidden',
                  outline: isSel ? '2px solid #0D0D0D' : 'none',
                  outlineOffset: 1,
                  minHeight: total > 0 ? 4 : 0,
                }}>
                  {motivosOrdenados
                    .filter(m => h.motivos[m] > 0 && (!motivoFiltro || m === motivoFiltro))
                    .map((m) => (
                      <div key={m} style={{
                        width:'100%',
                        flex: h.motivos[m],
                        background: corMotivo(m, motivosOrdenados.indexOf(m)),
                        minHeight: 2,
                      }} />
                    ))
                  }
                </div>
              </div>
            )
          })}
        </div>

        {/* Labels meses */}
        <div style={{ display:'flex', gap:8, paddingLeft:36, marginTop:6 }}>
          {pagina.map(h => (
            <div key={h.mes} style={{
              flex:1, textAlign:'center', fontSize:10,
              color: h.mes === mesSelecionado ? '#0D0D0D' : '#ABABAB',
              fontWeight: h.mes === mesSelecionado ? 700 : 400,
              fontFamily:"'DM Sans',sans-serif",
            }}>
              {fmtMes(h.mes)}
            </div>
          ))}
        </div>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position:'absolute',
            left: Math.min(Math.max(0, tooltip.x - 85), (containerRef.current?.offsetWidth||500) - 180),
            top: Math.max(0, tooltip.y - 8),
            background:'#fff', border:'1px solid #E8E8E2',
            borderRadius:6, padding:'8px 12px',
            boxShadow:'0 4px 16px rgba(0,0,0,0.10)',
            zIndex:20, pointerEvents:'none', minWidth:170,
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:'#0D0D0D', marginBottom:7, borderBottom:'1px solid #F0F0EC', paddingBottom:5, fontFamily:"'DM Sans',sans-serif" }}>
              {fmtMes(tooltip.mes)} · {tooltip.total} desligamentos
            </div>
            {motivosOrdenados.filter(m => tooltip.motivos[m] > 0).map((m) => (
              <div key={m} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <span style={{ width:8, height:8, borderRadius:2, background:corMotivo(m, motivosOrdenados.indexOf(m)), flexShrink:0 }} />
                <span style={{ fontSize:11, color:'#3D3D3D', fontFamily:"'DM Sans',sans-serif", flex:1 }}>{m}</span>
                <span style={{ fontSize:11, fontWeight:600, color:'#0D0D0D', fontFamily:"'DM Mono',monospace", marginLeft:8 }}>{tooltip.motivos[m]}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Paginação */}
      {totalPags > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:4 }}>
          <button onClick={() => setPagina(p => Math.min(totalPags-1, p+1))}
            disabled={paginaAtual >= totalPags-1}
            style={{ padding:'5px 14px', borderRadius:6, border:'1px solid #E8E8E2', background:'#fff', cursor:paginaAtual>=totalPags-1?'not-allowed':'pointer', color:paginaAtual>=totalPags-1?'#BDBDBD':'#0D0D0D', fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
            ← Mais antigo
          </button>
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
            <span style={{ fontSize:12, fontWeight:600, color:'#0D0D0D' }}>
              {fmtMes(pagina[0]?.mes)} – {fmtMes(pagina[pagina.length-1]?.mes)}
            </span>
            <div style={{ display:'flex', gap:4 }}>
              {Array.from({length:totalPags}).map((_,pi) => (
                <div key={pi} onClick={() => setPagina(pi)}
                  style={{ width:pi===paginaAtual?18:6, height:6, borderRadius:99, cursor:'pointer', background:pi===paginaAtual?'#0D0D0D':'#E8E8E2', transition:'width 0.2s' }} />
              ))}
            </div>
          </div>
          <button onClick={() => setPagina(p => Math.max(0, p-1))}
            disabled={paginaAtual === 0}
            style={{ padding:'5px 14px', borderRadius:6, border:'1px solid #E8E8E2', background:'#fff', cursor:paginaAtual===0?'not-allowed':'pointer', color:paginaAtual===0?'#BDBDBD':'#0D0D0D', fontSize:12, fontFamily:"'DM Sans',sans-serif" }}>
            Mais recente →
          </button>
        </div>
      )}
    </div>
  )
}
