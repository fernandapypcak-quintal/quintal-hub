'use client'

import { useMemo, useState } from 'react'
import { type Linha, dataCurta, grupoLabel, n0, statusLabel, CANCELADAS } from '../utils'
import { C, MONO, Tag, td, tdNum, th, thNum } from '../ui'

type Coluna = 'u' | 'dr' | 'dc' | 'p' | 'o' | 'oc' | 's' | 'g'
const ROTULOS: Record<Coluna, string> = {
  u: 'Unidade', dr: 'Data reserva', dc: 'Criada em', p: 'Pessoas', o: 'Operador', oc: 'Ocasião', s: 'Status', g: 'Grupo',
}

export default function TabelaReservas({ linhas, colunas = ['u', 'dr', 'p', 'g', 'o', 'oc', 's', 'dc'], limite = 500 }: {
  linhas: Linha[]; colunas?: Coluna[]; limite?: number
}) {
  const [ord, setOrd] = useState<{ col: Coluna; desc: boolean }>({ col: 'dr', desc: false })
  const ordenadas = useMemo(() => {
    const val = (r: Linha, c: Coluna): string | number => (c === 'p' ? r.p : c === 'dc' ? r.dc + r.h : String(r[c]))
    return [...linhas].sort((a, b) => {
      const x = val(a, ord.col), y = val(b, ord.col)
      const cmp = typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))
      return ord.desc ? -cmp : cmp
    })
  }, [linhas, ord])

  const cab = (c: Coluna) => (
    <th key={c} style={{ ...(c === 'p' ? thNum : th), cursor: 'pointer' }}
      onClick={() => setOrd(o => ({ col: c, desc: o.col === c ? !o.desc : c === 'p' }))}>
      {ROTULOS[c]}{ord.col === c ? (ord.desc ? ' ↓' : ' ↑') : ''}
    </th>
  )

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>{colunas.map(cab)}</tr></thead>
        <tbody>
          {ordenadas.slice(0, limite).map(r => (
            <tr key={r.id} style={{ opacity: CANCELADAS.has(r.s) ? 0.5 : 1 }}>
              {colunas.map(c => {
                if (c === 'p') return <td key={c} style={tdNum}>{n0(r.p)}</td>
                if (c === 'dr') return <td key={c} style={{ ...td, ...MONO, whiteSpace: 'nowrap' }}>{r.dr ? dataCurta(r.dr) : '—'}</td>
                if (c === 'dc') return <td key={c} style={{ ...td, ...MONO, whiteSpace: 'nowrap', color: C.suave }}>{dataCurta(r.dc)} {r.h}</td>
                if (c === 'u') return <td key={c} style={td}>{r.u}{r.b && <Tag>B2B</Tag>}</td>
                if (c === 'g') return <td key={c} style={{ ...td, color: C.suave }}>{grupoLabel(r.g)}</td>
                if (c === 's') return <td key={c} style={td}>{statusLabel(r.s)}</td>
                if (c === 'oc') return <td key={c} style={{ ...td, color: r.oc === 'Não Informado' ? C.muito : C.texto }}>{r.oc}</td>
                return <td key={c} style={td}>{r[c]}</td>
              })}
            </tr>
          ))}
          {!linhas.length && <tr><td style={{ ...td, color: C.suave }} colSpan={colunas.length}>Nenhuma reserva.</td></tr>}
        </tbody>
      </table>
      {linhas.length > limite && (
        <div style={{ fontSize: 12, color: C.suave, padding: '8px 12px' }}>
          Mostrando {n0(limite)} de {n0(linhas.length)}. Use o Exportar para ver todas.
        </div>
      )}
    </div>
  )
}
