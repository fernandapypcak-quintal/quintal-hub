'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Building2, CalendarDays, Calculator } from 'lucide-react'
import DashboardPromocoes from './components/DashboardPromocoes'
import ResumoLojas from './components/ResumoLojas'
import AnaliseDiaria from './components/AnaliseDiaria'
import SimuladorPromocoesClientApp from '../simulador-promocoes/ClientApp'

const ABAS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'lojas', label: 'Resumo das Casas', icon: Building2 },
  { id: 'diaria', label: 'Análise Diária', icon: CalendarDays },
  { id: 'simulador', label: 'Simulador', icon: Calculator },
]

export default function PromocoesClientApp({ allowedLojas = '*' }) {
  const [aba, setAba] = useState('dashboard')

  return (
    <div className="flex flex-col min-h-screen bg-surface-base">
      {/* Voltar ao HUB + abas */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Promoções</span>

        <div className="ml-auto flex gap-1.5">
          {ABAS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                aba === id ? 'bg-white text-brand-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        {aba === 'dashboard' && <DashboardPromocoes />}
        {aba === 'lojas' && <ResumoLojas />}
        {aba === 'diaria' && <AnaliseDiaria />}
        {aba === 'simulador' && <SimuladorPromocoesClientApp allowedLojas={allowedLojas} mostrarBarraVoltar={false} />}
      </div>
    </div>
  )
}
