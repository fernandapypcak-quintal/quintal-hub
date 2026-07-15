import React, { useMemo } from 'react'
import { fmt, fmtPct } from '../../utils.js'
import { sortMesLabel } from '../../hooks/useFinanceiro.jsx'
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from 'lucide-react'

const LIMIAR_CRITICO = 30
const LIMIAR_ALERTA  = 15
const LIMIAR_POSITIVO = -10 // queda >= 10% é destaque positivo

function gerarAlertas(historicoCat, tipoLabel) {
  if (!historicoCat || historicoCat.length === 0) return []

  const meses = sortMesLabel([...new Set(historicoCat.map(h => h.mes))])
  if (meses.length < 2) return []

  const ult  = meses[meses.length - 1]
  const prev = meses[meses.length - 2]
  const cats = [...new Set(historicoCat.map(h => h.categoria))]

  const alertas = []

  cats.forEach(cat => {
    const atual    = historicoCat.filter(h => h.mes === ult  && h.categoria === cat).reduce((s,h) => s+h.realizado, 0)
    const anterior = historicoCat.filter(h => h.mes === prev && h.categoria === cat).reduce((s,h) => s+h.realizado, 0)
    if (atual === 0 && anterior === 0) return
    const difPct = anterior > 0 ? ((atual - anterior) / anterior) * 100 : 0
    const difR   = atual - anterior

    if (difPct >= LIMIAR_CRITICO) {
      alertas.push({
        tipo:       'critico',
        categoria:  cat,
        tipoLabel,
        msg:        `${cat} subiu ${fmtPct(difPct)} em ${ult}`,
        detalhe:    `+${fmt(difR)} vs ${prev}`,
        difPct,
        difR,
        icon:       'critico',
      })
    } else if (difPct >= LIMIAR_ALERTA) {
      alertas.push({
        tipo:       'alerta',
        categoria:  cat,
        tipoLabel,
        msg:        `${cat} subiu ${fmtPct(difPct)} em ${ult}`,
        detalhe:    `+${fmt(difR)} vs ${prev} — monitorar`,
        difPct,
        difR,
        icon:       'alerta',
      })
    } else if (difPct <= LIMIAR_POSITIVO) {
      alertas.push({
        tipo:       'positivo',
        categoria:  cat,
        tipoLabel,
        msg:        `${cat} caiu ${fmtPct(Math.abs(difPct))} em ${ult}`,
        detalhe:    `${fmt(difR)} vs ${prev}`,
        difPct,
        difR,
        icon:       'positivo',
      })
    }
  })

  // Detecta tendência: 3 meses seguidos subindo
  cats.forEach(cat => {
    if (meses.length < 3) return
    const vals = meses.slice(-3).map(mes =>
      historicoCat.filter(h => h.mes === mes && h.categoria === cat).reduce((s,h) => s+h.realizado, 0)
    )
    if (vals[0] > 0 && vals[1] > vals[0] && vals[2] > vals[1]) {
      const pct3m = ((vals[2] - vals[0]) / vals[0]) * 100
      if (pct3m >= 20) {
        // Só adiciona se ainda não virou crítico/alerta
        const jatem = alertas.find(a => a.categoria === cat && a.tipoLabel === tipoLabel)
        if (!jatem) {
          alertas.push({
            tipo:       'alerta',
            categoria:  cat,
            tipoLabel,
            msg:        `${cat} sobe há 3 meses seguidos`,
            detalhe:    `${meses.slice(-3)[0]} a ${meses.slice(-3)[2]}: +${fmtPct(pct3m)}`,
            difPct:     pct3m,
            difR:       vals[2] - vals[0],
            icon:       'tendencia',
          })
        }
      }
    }
  })

  return alertas.sort((a,b) => {
    const ordem = { critico:0, alerta:1, positivo:2 }
    return (ordem[a.tipo]||3) - (ordem[b.tipo]||3)
  })
}

const ICONE = {
  critico:   { Icon: AlertTriangle,  bg:'#FEF2F2', color:'#dc2626', badge:'Crítico',  badgeBg:'#FEF2F2', badgeColor:'#dc2626' },
  alerta:    { Icon: TrendingUp,     bg:'#FFFBEB', color:'#d97706', badge:'Atenção',  badgeBg:'#FFFBEB', badgeColor:'#d97706' },
  tendencia: { Icon: TrendingUp,     bg:'#FFFBEB', color:'#d97706', badge:'Tendência',badgeBg:'#FFFBEB', badgeColor:'#d97706' },
  positivo:  { Icon: TrendingDown,   bg:'#F0FDF4', color:'#16a34a', badge:'Positivo', badgeBg:'#F0FDF4', badgeColor:'#16a34a' },
}

export default function Semaforos({ historicoCatFixo, historicoCatVariavel }) {
  const alertas = useMemo(() => {
    const af = gerarAlertas(historicoCatFixo,    'Fixo')
    const av = gerarAlertas(historicoCatVariavel, 'Variável')
    return [...af, ...av].sort((a,b) => {
      const ordem = { critico:0, alerta:1, tendencia:2, positivo:3 }
      return (ordem[a.icon]||4) - (ordem[b.icon]||4)
    })
  }, [historicoCatFixo, historicoCatVariavel])

  if (alertas.length === 0) return null

  const criticos  = alertas.filter(a => a.tipo === 'critico').length
  const atencoes  = alertas.filter(a => a.tipo === 'alerta').length
  const positivos = alertas.filter(a => a.tipo === 'positivo').length

  return (
    <div style={{ border:'1px solid #F0F0F0', borderRadius:12, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px 14px', borderBottom:'1px solid #F7F7F7', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <div style={{ fontSize:13, fontWeight:600, color:'#1a1a1a', display:'flex', alignItems:'center', gap:8 }}>
            <AlertTriangle size={14} color="#d97706"/> Radar de variações
          </div>
          <div style={{ fontSize:12, color:'#999', marginTop:2 }}>
            Alertas automáticos — variações acima de {LIMIAR_ALERTA}% mês a mês
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {criticos > 0 && (
            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#FEF2F2', color:'#dc2626' }}>
              {criticos} crítico{criticos>1?'s':''}
            </span>
          )}
          {atencoes > 0 && (
            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#FFFBEB', color:'#d97706' }}>
              {atencoes} atenção
            </span>
          )}
          {positivos > 0 && (
            <span style={{ padding:'3px 10px', borderRadius:99, fontSize:11, fontWeight:600, background:'#F0FDF4', color:'#16a34a' }}>
              {positivos} positivo{positivos>1?'s':''}
            </span>
          )}
        </div>
      </div>

      {/* Lista */}
      <div style={{ padding:'4px 0' }}>
        {alertas.map((a, i) => {
          const cfg = ICONE[a.icon] || ICONE.alerta
          const { Icon } = cfg
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:14,
              padding:'11px 20px',
              borderBottom: i < alertas.length-1 ? '1px solid #F7F7F7' : 'none',
            }}>
              {/* Ícone */}
              <div style={{ width:32, height:32, borderRadius:8, background:cfg.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Icon size={15} color={cfg.color}/>
              </div>

              {/* Texto */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:13.5, fontWeight:500, color:'#1a1a1a' }}>{a.msg}</div>
                <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{a.detalhe}</div>
              </div>

              {/* Tipo e badge */}
              <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                <span style={{ padding:'3px 9px', borderRadius:99, fontSize:11, fontWeight:600, background:cfg.badgeBg, color:cfg.badgeColor }}>
                  {cfg.badge}
                </span>
                <span style={{ fontSize:11, color:'#BBB' }}>{a.tipoLabel}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
