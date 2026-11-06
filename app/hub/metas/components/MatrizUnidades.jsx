// app/hub/metas/components/MatrizUnidades.jsx
// Matriz unidade × indicador. Cada célula = real do indicador, pintada
// por status (bateu / não bateu / sem dado). Clique na linha abre o
// detalhe com meta, real e desvio. As colunas seguem os indicadores da
// vigência do mês (lib/metas/config.ts).

'use client'

import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { labelForUnit } from '@/lib/units'
import { useMetasData } from '../hooks/useMetasData'
import { COR_STATUS, fmtValor, fmtDelta, deltaBom, valorPrincipal, valorMeta, rotulos } from './formato'

function Celula({ ind, cfg }) {
  const status = ind?.status ?? 'sem_dado'
  const cor = COR_STATUS[status]
  return (
    <div className={`h-9 rounded-md border flex items-center justify-center text-xs font-medium tabular-nums ${cor.bg} ${cor.borda} ${cor.texto}`}>
      {status === 'sem_dado' ? 'sem dado' : valorPrincipal(cfg, ind)}
    </div>
  )
}

function Detalhe({ pontuacao, indicadores }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 px-3 py-3 bg-surface-muted/60 rounded-lg">
      {indicadores.map((cfg) => {
        const ind = pontuacao.indicadores[cfg.key]
        const r = rotulos(cfg)
        const bom = deltaBom(cfg, ind?.delta)
        const deltaFmt = cfg.direcao === 'saldo' ? 'moeda' : cfg.formato
        return (
          <div key={cfg.key} className="text-xs">
            <div className="text-zinc-500 mb-1">{cfg.label}</div>
            <div className="flex justify-between gap-2 text-zinc-500"><span>{r.meta}</span><span className="tabular-nums">{valorMeta(cfg, ind)}</span></div>
            <div className="flex justify-between gap-2 text-brand-black"><span>{r.real}</span><span className="tabular-nums font-medium">{fmtValor(cfg.formato, ind?.real)}</span></div>
            <div className="flex justify-between gap-2">
              <span className="text-zinc-500">{r.delta}</span>
              <span className={`tabular-nums ${bom == null ? 'text-zinc-400' : bom ? 'text-emerald-700' : 'text-rose-700'}`}>
                {ind?.status === 'sem_dado' ? '—' : fmtDelta(deltaFmt, ind?.delta)}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * linhas: [{ unidade, indicadores, qtdBateu, qtdComDado, gerenteNome?, gerenteCor?, critica? }]
 * mostrarGerente mostra o regional embaixo do nome (Visão por Unidade).
 */
export default function MatrizUnidades({ linhas, mostrarGerente = false }) {
  const { vigencia } = useMetasData()
  const indicadores = vigencia.indicadores
  const [aberta, setAberta] = useState(null)

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table className="w-full min-w-[760px] border-separate" style={{ borderSpacing: '4px 4px' }}>
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-zinc-500 px-2 pb-1">Unidade</th>
            {indicadores.map((cfg) => (
              <th key={cfg.key} className="text-center text-xs font-medium text-zinc-500 pb-1 w-[11%]" title={cfg.label}>
                {cfg.curto}
                <span className="block text-[10px] font-normal text-zinc-400">{cfg.peso} pts</span>
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
                <tr onClick={() => setAberta(isOpen ? null : l.unidade)} className="cursor-pointer group">
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
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.gerenteCor || '#A1A1AA' }} />
                        {l.gerenteNome}
                      </div>
                    )}
                  </td>
                  {indicadores.map((cfg) => (
                    <td key={cfg.key}>
                      <Celula ind={l.indicadores[cfg.key]} cfg={cfg} />
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
                    <td colSpan={indicadores.length + 2}>
                      <Detalhe pontuacao={l} indicadores={indicadores} />
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
  const { vigencia } = useMetasData()
  const temBandas = vigencia.indicadores.some((i) => i.direcao === 'saldo')
  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-500">
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-emerald-50 border border-emerald-200" /> Bateu</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-rose-50 border border-rose-200" /> Não bateu</span>
      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-zinc-50 border border-dashed border-zinc-300" /> Sem dado ou sem meta</span>
      <span className="text-zinc-400">
        Clique na unidade pra ver meta, real e desvio.{temBandas ? ' Bandas mostra o saldo (arrecadação − custo).' : ''}
      </span>
    </div>
  )
}
