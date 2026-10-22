'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { UnitId } from '@/lib/units'
import { MetasDataProvider, useMetasData } from './hooks/useMetasData'
import Home from './components/pages/Home'
import Admin from './components/pages/Admin'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const anoAtual = new Date().getFullYear()
const ANOS = [anoAtual, anoAtual - 1, anoAtual - 2].map(String)

const selectStyle = {
  padding: '5px 10px', borderRadius: 8, border: 'none',
  fontSize: 12, background: 'rgba(255,255,255,0.15)',
  color: '#fff', cursor: 'pointer',
}
const optStyle = { color: '#0D0F14' }

interface FiltrosMetas {
  anoMes: string
  setAnoMes: (v: string) => void
  visao: 'mes' | 'trimestre'
  setVisao: (v: 'mes' | 'trimestre') => void
}

function HeaderFiltros() {
  const { anoMes, setAnoMes, visao, setVisao } = useMetasData() as unknown as FiltrosMetas
  const [ano, mes] = anoMes.split('-')
  const mesNum = Number(mes)
  const tri = Math.floor((mesNum - 1) / 3) + 1

  const subtitulo = visao === 'trimestre'
    ? `Regionais · ${tri}º trimestre ${ano}`
    : `Regionais · ${MESES[mesNum - 1]}/${ano}`

  return (
    <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🎯</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Metas dos Regionais</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{subtitulo}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select value={visao} onChange={(e) => setVisao(e.target.value as 'mes' | 'trimestre')} style={selectStyle}>
          <option value="mes" style={optStyle}>Mês</option>
          <option value="trimestre" style={optStyle}>Trimestre</option>
        </select>

        <select value={ano} onChange={(e) => setAnoMes(`${e.target.value}-${mes}`)} style={selectStyle}>
          {ANOS.map((a) => <option key={a} value={a} style={optStyle}>{a}</option>)}
        </select>

        {visao === 'trimestre' ? (
          <select
            value={String(tri)}
            onChange={(e) => setAnoMes(`${ano}-${String((Number(e.target.value) - 1) * 3 + 1).padStart(2, '0')}`)}
            style={selectStyle}
          >
            {[1, 2, 3, 4].map((t) => <option key={t} value={String(t)} style={optStyle}>{t}º trimestre</option>)}
          </select>
        ) : (
          <select value={mes} onChange={(e) => setAnoMes(`${ano}-${e.target.value}`)} style={selectStyle}>
            {MESES.map((m, i) => {
              const v = String(i + 1).padStart(2, '0')
              return <option key={v} value={v} style={optStyle}>{m}</option>
            })}
          </select>
        )}
      </div>
    </div>
  )
}

function AppInner({ isAdmin }: { isAdmin: boolean }) {
  const [pagina, setPagina] = useState('home')

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Topbar HUB */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Metas</span>

        {isAdmin && (
          <div className="ml-auto flex gap-1">
            <button
              onClick={() => setPagina('home')}
              className={`text-xs px-2.5 py-1 rounded-md ${pagina === 'home' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setPagina('admin')}
              className={`text-xs px-2.5 py-1 rounded-md ${pagina === 'admin' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}
            >
              Input Manual
            </button>
          </div>
        )}
      </div>

      <HeaderFiltros />

      <main className="flex-1 min-w-0 overflow-y-auto">
        {pagina === 'admin' && isAdmin ? <Admin /> : <Home />}
      </main>
    </div>
  )
}

export default function MetasClientApp({
  allowedLojas = '*',
  isAdmin = false,
}: {
  allowedLojas?: UnitId[] | '*'
  isAdmin?: boolean
}) {
  return (
    <MetasDataProvider allowedLojas={allowedLojas as any} isAdmin={isAdmin}>
      <AppInner isAdmin={isAdmin} />
    </MetasDataProvider>
  )
}
