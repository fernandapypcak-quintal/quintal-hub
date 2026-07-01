import React from 'react'
import { useFinanceiro, GRUPOS_CATEGORIA } from '../../hooks/useFinanceiro.jsx'
import { LOJAS } from '../../data/config.js'
import { ChevronDown, X } from 'lucide-react'

const TIPO_OPCOES = [
  { value:'operacional', label:'Operacional', desc:'Fixo + Variável' },
  { value:'comCapex',    label:'+ CAPEX',     desc:'Inclui Investimentos' },
  { value:'tudo',        label:'Tudo',        desc:'Inclui Fora do escopo' },
]

const GRUPO_OPCOES = [
  { value:'todos',       label:'Todas categorias' },
  { value:'pessoal',     label:'Pessoal' },
  { value:'ocupacao',    label:'Ocupação' },
  { value:'operacional', label:'Operacional' },
  { value:'fiscal',      label:'Fiscal' },
  { value:'comercial',   label:'Comercial' },
]

export default function Header({ title, subtitle }) {
  const {
    lojaFiltro, setLojaFiltro,
    mesFiltro, setMesFiltro,
    tipoFiltro, setTipoFiltro,
    mesInicio, setMesInicio,
    mesFim, setMesFim,
    grupoCategoria, setGrupoCategoria,
    mesesDisponiveis,
  } = useFinanceiro()

  const sel = (ativo) => ({
    appearance:'none', WebkitAppearance:'none',
    padding:'0 28px 0 12px', height:32,
    border: ativo ? '1px solid #1a1a1a' : '1px solid #E8E8E8',
    borderRadius:99, fontSize:12.5,
    color: ativo ? '#1a1a1a' : '#666',
    background:'#fff', cursor:'pointer', outline:'none',
    fontFamily:'inherit', fontWeight: ativo ? 600 : 400,
  })

  const pill = (ativo) => ({
    padding:'4px 12px', borderRadius:99, border:'none',
    fontSize:12, fontWeight: ativo ? 600 : 400,
    cursor:'pointer', fontFamily:'inherit',
    background: ativo ? '#1a1a1a' : 'transparent',
    color:      ativo ? '#fff'    : '#777',
    transition:'all 0.1s',
  })

  return (
    <header style={{
      background:'#fff', borderBottom:'1px solid #F0F0F0',
      padding:'12px 28px',
      position:'sticky', top:0, zIndex:20,
      display:'flex', flexDirection:'column', gap:10,
    }}>
      {/* Linha 1: título + filtros principais */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div>
          <h1 style={{ fontSize:19, fontWeight:700, color:'#1a1a1a', margin:0, lineHeight:1.2 }}>{title}</h1>
          {subtitle && <div style={{ fontSize:12, color:'#999', marginTop:2 }}>{subtitle}</div>}
        </div>

        <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
          {/* Tipo */}
          <div style={{ display:'flex', alignItems:'center', gap:2, background:'#F7F7F7', borderRadius:99, padding:'3px 3px' }}>
            {TIPO_OPCOES.map(op => (
              <button key={op.value} onClick={() => setTipoFiltro(op.value)} title={op.desc} style={pill(tipoFiltro===op.value)}>
                {op.label}
              </button>
            ))}
          </div>

          {/* Loja */}
          <div style={{ position:'relative' }}>
            <select value={lojaFiltro} onChange={e => setLojaFiltro(e.target.value)} style={sel(lojaFiltro!=='Todas')}>
              {LOJAS.map(l => <option key={l} value={l}>{l==='Todas'?'Todas as lojas':l}</option>)}
            </select>
            <ChevronDown size={12} color="#999" style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
          </div>
        </div>
      </div>

      {/* Linha 2: filtros secundários */}
      <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>

        {/* Intervalo de meses */}
        {mesesDisponiveis.length > 0 && (
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'#F7F7F7', borderRadius:8, padding:'4px 10px' }}>
            <span style={{ fontSize:11.5, color:'#888', whiteSpace:'nowrap' }}>Período:</span>
            <div style={{ position:'relative' }}>
              <select
                value={mesInicio}
                onChange={e => {
                  setMesInicio(e.target.value)
                  setMesFiltro('')
                }}
                style={{ ...sel(false), height:28, fontSize:12, padding:'0 24px 0 8px' }}
              >
                {mesesDisponiveis.map(({value,label}) => <option key={value} value={value}>{label}</option>)}
              </select>
              <ChevronDown size={11} color="#999" style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
            </div>
            <span style={{ fontSize:11, color:'#BBB' }}>→</span>
            <div style={{ position:'relative' }}>
              <select
                value={mesFim}
                onChange={e => {
                  setMesFim(e.target.value)
                  setMesFiltro('')
                }}
                style={{ ...sel(false), height:28, fontSize:12, padding:'0 24px 0 8px' }}
              >
                {mesesDisponiveis.map(({value,label}) => <option key={value} value={value}>{label}</option>)}
              </select>
              <ChevronDown size={11} color="#999" style={{ position:'absolute', right:7, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}/>
            </div>
            {/* Atalho: mês único */}
            {mesesDisponiveis.length > 0 && (
              <div style={{ display:'flex', gap:3 }}>
                {mesesDisponiveis.slice(-3).map(({value,label}) => (
                  <button
                    key={value}
                    onClick={() => { setMesInicio(value); setMesFim(value); setMesFiltro(value) }}
                    style={{
                      padding:'2px 8px', borderRadius:99, border:'none', fontSize:11,
                      cursor:'pointer', fontFamily:'inherit',
                      background: mesInicio===value && mesFim===value ? '#1a1a1a' : '#E8E8E8',
                      color:      mesInicio===value && mesFim===value ? '#fff'    : '#666',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Grupo de categorias */}
        <div style={{ display:'flex', alignItems:'center', gap:4, background:'#F7F7F7', borderRadius:8, padding:'4px 6px' }}>
          <span style={{ fontSize:11.5, color:'#888', paddingLeft:4, whiteSpace:'nowrap' }}>Grupo:</span>
          {GRUPO_OPCOES.map(op => (
            <button
              key={op.value}
              onClick={() => setGrupoCategoria(op.value)}
              style={{
                padding:'3px 10px', borderRadius:99, border:'none', fontSize:11.5,
                cursor:'pointer', fontFamily:'inherit',
                background: grupoCategoria===op.value ? '#1a1a1a' : 'transparent',
                color:      grupoCategoria===op.value ? '#fff'    : '#777',
                fontWeight: grupoCategoria===op.value ? 600 : 400,
              }}
            >
              {op.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}
