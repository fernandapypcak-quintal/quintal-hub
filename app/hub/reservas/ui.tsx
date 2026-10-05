'use client'

// app/hub/reservas/ui.tsx
// Estilo e componentes pequenos da página de Reservas (mesmo padrão visual do Vendas).

import { pct } from './utils'

export const C = {
  borda: '#EBEBEB', bordaForte: '#1a1a1a', texto: '#1a1a1a', suave: '#888', muito: '#BBB',
  verde: '#97A624', verdeFundo: '#F4F6E6', vermelho: '#8C1414', vermelhoFundo: '#FBEFEF', fundo: '#FAFAF8',
  azul: '#0F766E', azulFundo: '#E6F2F1', amarelo: '#D9B504', b2b: '#0ea5e9', zebra: '#F6F6F2',
}
export const MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }
export const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 10 }
export const pill = (ativo: boolean): React.CSSProperties => ({
  height: 30, padding: '0 12px', borderRadius: 99, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
  border: `1px solid ${ativo ? C.bordaForte : '#E8E8E8'}`, background: '#fff',
  color: ativo ? C.texto : '#666', fontWeight: ativo ? 600 : 400, outline: 'none', whiteSpace: 'nowrap',
})
export const botao: React.CSSProperties = {
  height: 30, padding: '0 12px', borderRadius: 8, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
  border: `1px solid ${C.bordaForte}`, background: C.texto, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap',
}
export const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: C.suave, padding: '9px 12px',
  borderBottom: `1px solid ${C.borda}`, background: '#fff', whiteSpace: 'nowrap',
}
export const thNum: React.CSSProperties = { ...th, textAlign: 'right' }
export const td: React.CSSProperties = { fontSize: 13, padding: '8px 12px', borderBottom: '1px solid #F3F3F3' }
export const tdNum: React.CSSProperties = { ...td, ...MONO, textAlign: 'right', whiteSpace: 'nowrap' }

export function Spinner({ texto = 'Carregando reservas...' }: { texto?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 50 }}>
      <div style={{ width: 26, height: 26, border: '2px solid #E8E8E8', borderTopColor: C.texto, borderRadius: '50%', animation: 'rspin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#999' }}>{texto}</div>
      <style>{`@keyframes rspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

export function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'info'; children: React.ReactNode }) {
  const erro = tipo === 'erro'
  return (
    <div style={{ fontSize: 13, padding: '10px 14px', borderRadius: 8, background: erro ? C.vermelhoFundo : '#F5F5F2', color: erro ? C.vermelho : '#555' }}>
      {children}
    </div>
  )
}

export function Var({ v, inverso = false }: { v: number | null; inverso?: boolean }) {
  if (v === null || !isFinite(v)) return <span style={{ color: C.muito }}>—</span>
  const bom = inverso ? v < 0 : v > 0
  const cor = Math.abs(v) < 0.005 ? C.suave : bom ? C.verde : C.vermelho
  return <span style={{ ...MONO, color: cor }}>{v > 0 ? '▲' : v < 0 ? '▼' : ''} {pct(Math.abs(v))}</span>
}

export function Secao({ titulo, sub, children, direita }: { titulo: string; sub?: string; children: React.ReactNode; direita?: React.ReactNode }) {
  return (
    <section style={{ ...card, padding: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div>
          {sub && <div style={{ fontSize: 12, color: C.suave, marginTop: 2 }}>{sub}</div>}
        </div>
        {direita}
      </div>
      {children}
    </section>
  )
}

export function Kpi({ label, valor, detalhe, anterior, v, anoAnterior, vAno, inverso, cor }: {
  label: string; valor: string; detalhe?: string
  anterior?: string; v?: number | null          // vs período anterior
  anoAnterior?: string; vAno?: number | null    // vs ano anterior
  inverso?: boolean; cor?: string
}) {
  return (
    <div style={{ ...card, padding: '14px 16px', borderTop: cor ? `3px solid ${cor}` : card.border }}>
      <div style={{ fontSize: 12, color: C.suave }}>{label}</div>
      <div style={{ ...MONO, fontSize: 26, fontWeight: 500, marginTop: 4, letterSpacing: -0.5 }}>{valor}</div>
      {detalhe && <div style={{ fontSize: 12, color: C.suave, marginTop: 2 }}>{detalhe}</div>}
      {anterior !== undefined && (
        <div style={{ fontSize: 12, color: C.suave, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>anterior <span style={MONO}>{anterior}</span></span>
          <Var v={v ?? null} inverso={inverso} />
        </div>
      )}
      {anoAnterior !== undefined && (
        <div style={{ fontSize: 12, color: C.suave, marginTop: 2, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span>ano anterior <span style={MONO}>{anoAnterior}</span></span>
          <Var v={vAno ?? null} inverso={inverso} />
        </div>
      )}
    </div>
  )
}

export function BarraH({ label, valor, max, texto, cor = C.azul, apagado = false }: {
  label: string; valor: number; max: number; texto: string; cor?: string; apagado?: boolean
}) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr 110px', alignItems: 'center', gap: 10, fontSize: 12.5, padding: '4px 0', opacity: apagado ? 0.5 : 1 }}>
      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={label}>{label}</div>
      <div style={{ background: '#F3F3F0', borderRadius: 4, height: 14, overflow: 'hidden' }}>
        <div style={{ width: `${max ? (valor / max) * 100 : 0}%`, height: '100%', background: cor, borderRadius: 4 }} />
      </div>
      <div style={{ ...MONO, textAlign: 'right' }}>{texto}</div>
    </div>
  )
}

export function Tag({ children, cor = C.b2b }: { children: React.ReactNode; cor?: string }) {
  return <span style={{ fontSize: 10.5, fontWeight: 600, color: cor, border: `1px solid ${cor}`, borderRadius: 4, padding: '0 4px', marginLeft: 6 }}>{children}</span>
}

export function Drawer({ titulo, sub, onFechar, acoes, children }: {
  titulo: string; sub?: string; onFechar: () => void; acoes?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div role="dialog" aria-label={titulo}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end', background: 'rgb(0 0 0 / 0.25)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div style={{ width: 'min(1100px, 100%)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgb(0 0 0 / 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.borda}` }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600 }}>{titulo}</div>
            {sub && <div style={{ fontSize: 12, color: C.suave, marginTop: 2 }}>{sub}</div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {acoes}
            <button onClick={onFechar} style={pill(false)}>Fechar</button>
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>{children}</div>
      </div>
    </div>
  )
}
