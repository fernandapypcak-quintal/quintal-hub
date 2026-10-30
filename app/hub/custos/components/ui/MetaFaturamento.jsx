import React from 'react'
import { loadData, buscarTipo } from '../../../faturamento/data/loader.js'
import { fmtK, mesNome, mesAnteriorISO } from '../../utils.js'
import { COR, num, useCarga, Carregando } from './nf.jsx'

// v27.22 — Meta × faturamento do grupo: mês atual (até ontem, com o ritmo) e mês anterior.
// Usa os mesmos dados do dashboard de Faturamento (planilha + ZIG) e as metas de lá.

const Cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '')

async function carregar() {
  const [linhas, metasRes] = await Promise.all([loadData(false), buscarTipo('metas', 'metas').catch(() => ({ json: { metas: [] } }))])
  const fat = {}, porLoja = {}
  ;(linhas || []).forEach(r => {
    fat[r.Ano_Mes] = (fat[r.Ano_Mes] || 0) + (r.Valor || 0)
    const k = r.Ano_Mes + '|' + r.Loja
    porLoja[k] = (porLoja[k] || 0) + (r.Valor || 0)
  })
  const meta = {}, metaLoja = {}
  ;((metasRes.json && metasRes.json.metas) || []).forEach(m => {
    const key = m.Ano_Mes || `${m.Ano}-${String(m.Mes).padStart(2, '0')}`
    const v = parseFloat(m.Meta) || 0
    meta[key] = (meta[key] || 0) + v
    metaLoja[key + '|' + String(m.Loja || '').trim()] = v
  })
  const ultimoDia = (linhas || []).reduce((d, r) => (r.Data > d ? r.Data : d), '')
  return { fat, porLoja, meta, metaLoja, ultimoDia: typeof ultimoDia === 'string' ? ultimoDia : '' }
}

export default function MetaFaturamento({ mesAtual }) {
  const c = useCarga(carregar, [])
  if (!mesAtual) return null
  const ant = mesAnteriorISO(mesAtual)
  const card = { background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, breakInside: 'avoid' }
  if (c.carregando && !c.dados) return <section style={card}><Carregando texto="Buscando faturamento e metas…" /></section>
  if (c.erro || !c.dados) return <section style={card}><div style={{ fontSize: 13, color: COR.suave }}>Não consegui carregar o faturamento agora ({c.erro || 'sem dados'}).</div></section>
  const d = c.dados
  const [a, m] = mesAtual.split('-').map(Number)
  const diasMes = new Date(a, m, 0).getDate()
  const diaHoje = Math.max(1, Number(String(d.ultimoDia).substring(8, 10)) || new Date().getDate() - 1)
  const fatAt = d.fat[mesAtual] || 0, metaAt = d.meta[mesAtual] || 0
  const ritmo = diaHoje ? fatAt / diaHoje * diasMes : 0
  const fatAnt = d.fat[ant] || 0, metaAnt = d.meta[ant] || 0
  const pct = (v, mt) => (mt ? Math.round(v / mt * 100) : null)

  const bloco = (titulo, sub, fat, mt, extra, atual) => {
    const p = pct(fat, mt)
    return (
      <div style={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8, ...(atual ? { background: '#F4F8EC', borderRadius: 10, padding: 12 } : { padding: 12 }) }}>
        <div>
          {atual && <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, letterSpacing: 0.3, color: '#fff', background: '#4F6B14', borderRadius: 4, padding: '1px 6px', marginBottom: 4 }}>MÊS ATUAL</span>}
          <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div>
          <div style={{ fontSize: 11, color: COR.suave }}>{sub}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ ...num, fontSize: 24, fontWeight: 600 }}>{fmtK(fat)}</span>
          <span style={{ fontSize: 13, color: COR.suave }}>de {mt ? fmtK(mt) : 'meta não cadastrada'}</span>
          {p !== null && <span style={{ ...num, fontSize: 14, fontWeight: 600, color: p >= 100 ? '#4F6B14' : COR.texto }}>{p}%</span>}
        </div>
        {mt > 0 && (
          <div aria-hidden="true" style={{ height: 10, background: '#E3E3DA', borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.min(100, fat / mt * 100)}%`, background: '#3F5510', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }} />
          </div>
        )}
        {extra}
      </div>
    )
  }

  return (
    <section aria-labelledby="mf-tit" style={card}>
      <div>
        <h2 id="mf-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Meta × faturamento</h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3 }}>Faturamento do grupo (mesmos dados do dashboard de Faturamento) contra a meta do mês.</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
        {bloco(Cap(mesNome(mesAtual)), `até dia ${diaHoje} de ${diasMes}`, fatAt, metaAt,
          metaAt > 0 && <div style={{ fontSize: 12, color: COR.suave }}>No ritmo atual, fecha em <b style={{ color: COR.texto }}>{fmtK(ritmo)}</b> ({pct(ritmo, metaAt)}% da meta). Falta {fmtK(Math.max(0, metaAt - fatAt))} pra bater.</div>, true)}
        {bloco(Cap(mesNome(ant)), 'mês fechado', fatAnt, metaAnt,
          metaAnt > 0 && <div style={{ fontSize: 12, color: COR.suave }}>{fatAnt >= metaAnt ? `Bateu a meta (+${fmtK(fatAnt - metaAnt)}).` : `Ficou ${fmtK(metaAnt - fatAnt)} abaixo da meta.`}</div>, false)}
      </div>
    </section>
  )
}
