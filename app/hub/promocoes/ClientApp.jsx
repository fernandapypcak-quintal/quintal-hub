'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Calculator } from 'lucide-react'
import DashboardPromocoes from './components/DashboardPromocoes'
import SimuladorPromocoesClientApp from '../simulador-promocoes/ClientApp'

export default function PromocoesClientApp({ allowedLojas = '*' }) {
  const [aba, setAba] = useState('dashboard') // 'dashboard' | 'simulador'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif", color: '#0D0D0D' }}>
      {/* Voltar ao HUB + abas */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Promoções</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button
            onClick={() => setAba('dashboard')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${aba === 'dashboard' ? 'bg-white text-brand-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <LayoutDashboard size={13} /> Dashboard
          </button>
          <button
            onClick={() => setAba('simulador')}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${aba === 'simulador' ? 'bg-white text-brand-black' : 'text-zinc-400 hover:text-white'}`}
          >
            <Calculator size={13} /> Simulador
          </button>
        </div>
      </div>

      {aba === 'dashboard' ? <DashboardPromocoes /> : <SimuladorPromocoesClientApp allowedLojas={allowedLojas} mostrarBarraVoltar={false} />}
    </div>
  )
}
