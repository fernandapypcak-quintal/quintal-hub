'use client'

import { useState, useEffect } from 'react'
import { MESES, UNIDADES, useGASData } from './useGASData'
import Sidebar from './components/Sidebar'
import BottomNav from './components/BottomNav'
import PageRH from './components/PageRH'
import PageCustos from './components/PageCustos'
import ExportButton from './components/ExportButton'
import Link from 'next/link'
import { allowedNativeLabels } from '@/lib/units'

function selStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? '#0D0D0D' : '#fff',
    color: active ? '#fff' : '#0D0D0D',
    border: `1px solid ${active ? '#0D0D0D' : '#E8E8E2'}`,
    borderRadius: 6, padding: '5px 26px 5px 10px', fontSize: 12,
    fontFamily: "'DM Sans', sans-serif", cursor: 'pointer',
    outline: 'none', appearance: 'none',
    backgroundImage: active
      ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='white'/%3E%3C/svg%3E")`
      : `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%230D0D0D'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
  }
}

export default function TurnoverClientApp({ allowedLojas = '*' }: { allowedLojas?: string[] | '*' }) {
  const [pagina, setPagina] = useState('rh')
  const [mesIdx, setMesIdx] = useState(5)

  const lojasPermitidas = allowedNativeLabels(allowedLojas as any, 'turnoverLabel')
  const unidadesPermitidas = lojasPermitidas === '*' ? UNIDADES : UNIDADES.filter(u => lojasPermitidas.includes(u))
  // "Todas" busca o pacote completo direto no Apps Script (que não sabe
  // de permissão por unidade) — só oferecemos essa opção pra quem tem
  // acesso a todas as unidades. Quem tem acesso parcial escolhe uma
  // unidade específica de cada vez.
  const podeVerTodas = allowedLojas === '*'
  const [unidade, setUnidade] = useState(
    podeVerTodas ? 'Todas' : (unidadesPermitidas[0] ?? 'Todas')
  )

  const { data: gas, loading } = useGASData(mesIdx, unidade) as { data: any, loading: boolean }
  const todasUnidades = podeVerTodas ? ['Todas', ...unidadesPermitidas] : unidadesPermitidas

  const ultimaAtualizacao = gas?.gerado_em
    ? new Date(gas.gerado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : null


  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif", flexDirection: 'column' }}>
      {/* Back to hub */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800 no-print">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Turnover & Headcount</span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar — hidden on mobile */}
        <div className="hidden lg:flex">
          <Sidebar pagina={pagina} setPagina={setPagina} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* HEADER */}
          <div className="no-print" style={{ background: '#fff', borderBottom: '1px solid #E8E8E2', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#0D0D0D', letterSpacing: '-0.02em' }}>
                {pagina === 'rh' ? 'Turnover & Headcount' : 'Custos com Pessoas'}
              </div>
              <div style={{ fontSize: 11, color: '#ABABAB', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span>Quintal · {unidade === 'Todas' ? 'Todas as unidades' : unidade}</span>
                {ultimaAtualizacao && <span style={{ color: '#97A624', fontWeight: 500 }}>● {ultimaAtualizacao}</span>}
                {loading && <span>⏳ Carregando...</span>}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <ExportButton gas={gas} cfg={null} mesIdx={mesIdx} unidade={unidade} />
              <select value={unidade} onChange={e => setUnidade(e.target.value)} style={selStyle(unidade !== 'Todas')}>
                {todasUnidades.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
              <select value={mesIdx} onChange={e => setMesIdx(Number(e.target.value))} style={selStyle(true)}>
                {MESES.map((m: string, i: number) => <option key={m} value={i}>{m}</option>)}
              </select>
            </div>
          </div>

          {/* PÁGINA */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 16, paddingBottom: 80 }} className="lg:pb-4">
            {pagina === 'rh'
              ? <PageRH mesIdx={mesIdx} unidade={unidade} gas={gas} loading={loading} />
              : <PageCustos mesIdx={mesIdx} unidade={unidade} gas={gas} loading={loading} />}
          </div>
        </div>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <BottomNav pagina={pagina} setPagina={setPagina} />
      </div>
    </div>
  )
}
