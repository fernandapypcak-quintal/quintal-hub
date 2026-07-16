'use client'

import { useState, useEffect } from 'react'
import { CMVProvider, useCMV } from './hooks/useCMV'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Header from './components/layout/Header'
import Home from './components/pages/Home'
import Rentabilidade from './components/pages/Rentabilidade'
import Volume from './components/pages/Volume'
import Desperdicio from './components/pages/Desperdicio'
import Variacao from './components/pages/Variacao'
import DeliveryRentabilidade from './components/pages/DeliveryRentabilidade'
import DeliveryVolume from './components/pages/DeliveryVolume'
import DeliveryVariacao from './components/pages/DeliveryVariacao'
import Link from 'next/link'

const PAGES: Record<string, React.ComponentType<any>> = {
  home: Home,
  rentabilidade: Rentabilidade,
  volume: Volume,
  desperdicio: Desperdicio,
  variacao: Variacao,
  delivery_rent: DeliveryRentabilidade,
  delivery_volume: DeliveryVolume,
  delivery_variacao: DeliveryVariacao,
}

function Inner() {
  const [page, setPage] = useState('home')
  const { loading, error } = useCMV()
  const Page = PAGES[page] ?? Home


  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {/* Sidebar — hidden on mobile */}
      <div className="hidden lg:flex">
        <Sidebar activePage={page} onPageChange={setPage} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Back to hub bar */}
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">CMV</span>
        </div>
        <Header activePage={page} onMenuClick={() => {}} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-brand-olive border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-zinc-400">Carregando dados CMV...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-12 text-center">
              <div>
                <p className="text-4xl mb-4">⚠️</p>
                <p className="font-semibold text-brand-black mb-2">Erro ao carregar dados</p>
                <p className="text-sm text-zinc-400 max-w-md">{error}</p>
              </div>
            </div>
          ) : (
            <Page onPageChange={setPage} />
          )}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <BottomNav activePage={page} onPageChange={setPage} />
      </div>
    </div>
  )
}

export default function CMVClientApp({ allowedLojas = '*' }: { allowedLojas?: string[] | '*' }) {
  return <CMVProvider allowedLojas={allowedLojas as any}><Inner /></CMVProvider>
}
