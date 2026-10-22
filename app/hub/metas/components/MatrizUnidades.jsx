// app/hub/metas/components/MatrizUnidades.jsx
// Matriz unidade × indicador. Cada célula = real do indicador, pintada
// por status (bateu / não bateu / sem dado). Clique na linha abre o
// detalhe com meta, real e desvio. Unidade não tem pontos — a última
// coluna mostra quantas metas bateu. Usada na Visão por Unidade e no
// card do gerente.

'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { labelForUnit } from '@/lib/units'
import { INDICADORES, COR_STATUS, fmtValor, fmtDelta, fmtMoeda, deltaBom, valorPrincipal, rotulos, GERENTE_COLORS } from './formato'

function Celula({ ind, indicador, tipo }) {
  const status = ind?.status ?? 'sem_dado'
  const cor = COR_STATUS[status]
  return (
    <div className={`h-9 rounded-md border flex items-center justify-center text-xs font-medium tabular-nums ${cor.bg} ${cor.borda} ${cor.texto}`}>
      {status === 'sem_dado' ? 'sem dado' : valorPrincipal(indicador, tipo, ind)}
    </div>
  )
}

function Detalhe({ pontuacao }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-3 py-3 bg-surface-muted/60 rounded-lg">
      {INDICADORES.map((g) => {
        const ind = pontuacao.indicadores[g.key]
        const r = rotulos(g.key)
        const metaV = g.key === 'bandas' ? fmtMoeda(ind?.custoArtista) : fmtValor(g.tipo, ind?.meta)
        const realV = fmtValor(g.tipo, ind?.real)
        const bom = deltaBom(g.key, ind?.delta)
        const deltaTipo = g.key === 'bandas' ? 'moeda' : g.tipo
        return (
          <div key={g.key} className="text-xs">
            <div className="text-zinc-500 mb-1">{g.label}</div>
            <div className="flex justify-between gap-2 text-zinc-500"><span>{r.meta}</span><span className="tabular-nums">{metaV}</span></div>
            <div className="flex justify-between gap-2 text-brand-black"><span>{r.real}</span><span className="tabular-nums font-medium">{realV}</span></div>
            <div className="flex justify-between gap-2">
              <span className="text-zinc-500">{g.key === 'bandas' ? 'Saldo' : 'Desvio'}</span>
              <span className={`tabular-nums ${bom == null ? 'text-zinc-400' : bom ? 'text-emerald-700' : 'text-rose-700'}`}>
                {ind?.status === 'sem_dado' ? '—' : fmtDelta(deltaTipo, ind?.delta)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * linhas: [{ unidade, indicadores, qtdBateu, qtdComDado, gerenteId?, gerenteNome?, critica? }]
 * mostrarGerente mostra o regional embaixo do nome (Visão por Unidade).
 */
export default function MatrizUnidades({ linhas, mostrarGerente = false }) {
  const [aberta, setAberta] = useState(null)

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[760px] border-separate" style={{ borderSpacing: '4px 4px' }}>
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-zinc-500 px-2 pb-1">Unidade</th>
            {INDICADORES.map((g) => (
              <th key={g.key} className="text-center text-xs font-medium text-zinc-500 pb-1 w-[11%]">
                {g.curto}
              </th>
            ))}
            <th className="text-right text-xs font-medium text-zinc-500 px-2 pb-1 w-20">Batidas</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const isOpen = aberta === l.unidade
            return (
              <Fragment key={l.unidade}>
                <tr
                  onClick={() => setAberta(isOpen ? null : l.unidade)}
                  className="cursor-pointer group"
                >
                  <td className="px-2 rounded-md group-hover:bg-surface-muted">
                    <div className="flex items-center gap-1.5">
                      {isOpen ? <ChevronDown size={14} className="text-zinc-400 shrink-0" /> : <ChevronRight size={14} className="text-zinc-400 shrink-0" />}
                      <span className="text-sm font-medium text-brand-black whitespace-nowrap">{labelForUnit(l.unidade)}</span>
                      {l.critica && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 whitespace-nowrap">crítica</span>
                      )}
                    </div>
                    {mostrarGerente && (
                      <div className="flex items-center gap-1.5 pl-5 text-xs text-zinc-500">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: GERENTE_COLORS[l.gerenteId] || '#A1A1AA' }} />
                        {l.gerenteNome}
                      </div>
                    )}
                  </td>
                  {INDICADORES.map((g) => (
                    <td key={g.key}>
                      <Celula ind={l.indicadores[g.key]} indicador={g.key} tipo={g.tipo} />
                    </td>
                  ))}
                  <td className="text-right px-2">
                    <span className="text-sm font-semibold text-brand-black tabular-nums whitespace-nowrap">
                      {l.qtdBateu}<span className="font-normal text-zinc-400">/{l.qtdComDado}</span>
                    </span>
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={INDICADORES.length + 2}>
                      <Detalhe pontuacao={l} />
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Legenda() {
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200" /> Bateu</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-50 border border-rose-200" /> Não bateu</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-zinc-50 border border-dashed border-zinc-300" /> Sem dado ou sem meta</span>
      <span className="text-zinc-400">Clique na unidade pra ver meta, real e desvio. Bandas mostra o saldo (arrecadação − custo).</span>
    </div>
  )
}
