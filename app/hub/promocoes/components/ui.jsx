// app/hub/promocoes/components/ui.jsx
'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { corCmv, statusPromo } from '../data/modelo'

// ── Formatação (R$ sempre com 1 casa) ──────────────────────────────────────
const nf1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
export const brl = (v) => (v == null || !isFinite(v) ? '—' : `R$ ${nf1.format(v)}`)
export const brlK = (v) => {
  if (v == null || !isFinite(v)) return '—'
  const a = Math.abs(v)
  if (a >= 1e6) return `R$ ${nf1.format(v / 1e6)}M`
  if (a >= 1e3) return `R$ ${nf1.format(v / 1e3)}k`
  return `R$ ${nf1.format(v)}`
}
export const pct = (v) => (v == null || !isFinite(v) ? '—' : `${nf1.format(v * 100)}%`)
export const pp = (v) => (v == null || !isFinite(v) ? '—' : `${v > 0 ? '+' : ''}${nf1.format(v * 100)} p.p.`)
export const num = (v) => (v == null || !isFinite(v) ? '—' : Math.round(v).toLocaleString('pt-BR'))
export const varPct = (a, b) => (a == null || b == null || !b ? null : (a - b) / Math.abs(b))
export const dataBR = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')
const DOW = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
export const diaSemana = (iso) => { const [a, m, d] = iso.split('-').map(Number); return DOW[new Date(a, m - 1, d).getDay()] }
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
export const mesLabel = (mes) => { if (!mes) return '—'; const [a, m] = mes.split('-'); return `${MESES[+m - 1]}/${a.slice(2)}` }

// ── Blocos ─────────────────────────────────────────────────────────────────
export function Card({ titulo, extra, children, className = '' }) {
  return (
    <div className={`bg-white border border-surface-border rounded-xl ${className}`}>
      {(titulo || extra) && (
        <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-2">
          {titulo && <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide">{titulo}</p>}
          {extra}
        </div>
      )}
      <div className={titulo || extra ? 'px-4 pb-4' : 'p-4'}>{children}</div>
    </div>
  )
}

export function Kpi({ label, valor, sub, corSub, corValor }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4">
      <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">{label}</p>
      <p className="text-[24px] font-bold leading-none tracking-tight" style={{ color: corValor || '#0D0D0D' }}>{valor}</p>
      {sub && <p className="text-[11.5px] mt-1.5 font-medium" style={{ color: corSub || '#a1a1aa' }}>{sub}</p>}
    </div>
  )
}

export function Delta({ v, invertido = false, formato = pct }) {
  if (v == null || !isFinite(v)) return null
  const bom = invertido ? v < 0 : v > 0
  const cor = v === 0 ? '#a1a1aa' : bom ? '#5f6b12' : '#8C1414'
  return <span style={{ color: cor }}>{v > 0 ? '▲' : v < 0 ? '▼' : ''} {formato === pct ? pct(Math.abs(v)) : formato(v)}</span>
}

export function CmvTxt({ v }) {
  return <span style={{ color: corCmv(v), fontWeight: 600 }}>{pct(v)}</span>
}

export function StatusTag({ d }) {
  const s = statusPromo(d)
  if (s.id === 'na') return <span className="text-zinc-300">—</span>
  return (
    <span className="inline-block text-[10.5px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: s.cor, background: s.bg }}>
      {s.label}
    </span>
  )
}

export function Carregando() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: '#97A624', borderTopColor: 'transparent' }} />
        <p className="text-sm text-zinc-400">Carregando promoções e faturamento…</p>
      </div>
    </div>
  )
}

export function Aviso({ children, tom = 'amber' }) {
  const cores = tom === 'red'
    ? 'bg-red-50 border-red-100 text-red-800'
    : tom === 'zinc' ? 'bg-zinc-50 border-zinc-200 text-zinc-600' : 'bg-amber-50 border-amber-100 text-amber-800'
  return <div className={`border text-[12.5px] rounded-lg px-3 py-2 ${cores}`}>{children}</div>
}

// Tabela ordenável simples. colunas: [{ id, label, valor(row), render?(row), align?, className? }]
export function TabelaOrdenavel({ colunas, linhas, chave, ordemInicial, linhaTotal, onLinhaClick, aberta, renderDetalhe, vazia = 'Sem dados no período.' }) {
  const [ordem, setOrdem] = useState(ordemInicial || { id: colunas[1]?.id, dir: 'desc' })
  const col = colunas.find((c) => c.id === ordem.id)
  const ordenadas = col
    ? [...linhas].sort((a, b) => {
        const va = col.valor(a), vb = col.valor(b)
        if (va == null && vb == null) return 0
        if (va == null) return 1
        if (vb == null) return -1
        const r = typeof va === 'string' ? va.localeCompare(vb) : va - vb
        return ordem.dir === 'asc' ? r : -r
      })
    : linhas

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12.5px]">
        <thead>
          <tr className="text-[10.5px] text-zinc-400 uppercase border-b border-zinc-100">
            {colunas.map((c) => (
              <th
                key={c.id}
                onClick={() => c.valor && setOrdem((o) => ({ id: c.id, dir: o.id === c.id && o.dir === 'desc' ? 'asc' : 'desc' }))}
                className={`py-2 px-2.5 font-semibold whitespace-nowrap select-none ${c.valor ? 'cursor-pointer hover:text-zinc-600' : ''} ${c.align === 'left' ? 'text-left' : 'text-right'}`}
              >
                {c.label}{ordem.id === c.id ? (ordem.dir === 'desc' ? ' ↓' : ' ↑') : ''}
              </th>
            ))}
            {renderDetalhe && <th className="w-6" />}
          </tr>
        </thead>
        <tbody>
          {ordenadas.length === 0 && (
            <tr><td colSpan={colunas.length + 1} className="py-6 text-center text-zinc-400">{vazia}</td></tr>
          )}
          {ordenadas.map((l) => {
            const k = chave(l)
            const estaAberta = aberta === k
            return [
              <tr
                key={k}
                onClick={onLinhaClick ? () => onLinhaClick(k) : undefined}
                className={`border-b border-zinc-50 ${onLinhaClick ? 'cursor-pointer hover:bg-zinc-50' : ''} ${estaAberta ? 'bg-zinc-50' : ''}`}
              >
                {colunas.map((c) => (
                  <td key={c.id} className={`py-2 px-2.5 ${c.align === 'left' ? 'text-left' : 'text-right font-mono tabular-nums'} ${c.className || ''}`}>
                    {c.render ? c.render(l) : c.valor(l)}
                  </td>
                ))}
                {renderDetalhe && (
                  <td className="py-2 px-1 text-zinc-400">{estaAberta ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</td>
                )}
              </tr>,
              estaAberta && renderDetalhe ? (
                <tr key={k + '__det'}>
                  <td colSpan={colunas.length + 1} className="bg-zinc-50/70 px-3 py-3">{renderDetalhe(l)}</td>
                </tr>
              ) : null,
            ]
          })}
          {linhaTotal && (
            <tr className="border-t-2 border-zinc-200 font-bold bg-zinc-50/60">
              {colunas.map((c) => (
                <td key={c.id} className={`py-2 px-2.5 ${c.align === 'left' ? 'text-left' : 'text-right font-mono tabular-nums'}`}>
                  {c.render ? c.render(linhaTotal) : c.valor(linhaTotal)}
                </td>
              ))}
              {renderDetalhe && <td />}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

// Colunas padrão de métricas (reaproveitadas em várias telas)
export const COLS_METRICAS = {
  fat: { id: 'fat', label: 'Faturamento', valor: (l) => l.fat, render: (l) => brl(l.fat) },
  pessoas: { id: 'pessoas', label: 'Pessoas', valor: (l) => l.pessoas, render: (l) => num(l.pessoas) },
  ticket: { id: 'ticket', label: 'Ticket médio', valor: (l) => l.ticket, render: (l) => brl(l.ticket) },
  custo: { id: 'custo', label: 'Custo (CMV R$)', valor: (l) => l.custo, render: (l) => (l.usos ? brl(l.custo) : '—') },
  cmv: { id: 'cmv', label: 'CMV %', valor: (l) => l.cmv, render: (l) => <CmvTxt v={l.cmv} /> },
  margem: { id: 'margem', label: 'Margem bruta', valor: (l) => (l.usos ? l.margem : null), render: (l) => (l.usos ? brl(l.margem) : '—') },
  margemPessoa: { id: 'margemPessoa', label: 'Margem/pessoa', valor: (l) => (l.usos ? l.margemPessoa : null), render: (l) => (l.usos ? brl(l.margemPessoa) : '—') },
  peso: { id: 'peso', label: 'Peso', valor: (l) => l.peso, render: (l) => pct(l.peso) },
  fatTotal: { id: 'fatTotal', label: 'Fat. total casa', valor: (l) => l.fatTotal, render: (l) => brl(l.fatTotal) },
  status: { id: 'status', label: 'Status', valor: (l) => l.cmv ?? (l.fat ? -1 : -2), render: (l) => <StatusTag d={l} /> },
}
