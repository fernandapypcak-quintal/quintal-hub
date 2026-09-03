'use client'

import { useState, useEffect } from 'react'
import { FilterProvider, useFilters } from './hooks/useFilters'
import { MetasProvider } from './hooks/useMetas'
import { LabelsProvider } from './hooks/useLabels'
import { AlmocoProvider } from './hooks/useAlmoco'
import { TicketProvider } from './hooks/useTicket'
import { CompradoresProvider } from './hooks/useCompradores'
import { AreasProvider } from './hooks/useAreas'
import { MixProdutosProvider } from './hooks/useMixProdutos'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Header from './components/layout/Header'
import Overview from './components/pages/Overview'
import Hoje from './components/pages/Hoje'
import Trend from './components/pages/Trend'
import Weekly from './components/pages/Weekly'
import Stores from './components/pages/Stores'
import History from './components/pages/History'
import ComparableDays from './components/pages/ComparableDays'
import LoadingScreen, { ErrorScreen } from './components/ui/LoadingScreen'
import Link from 'next/link'

const PAGES: Record<string, React.ComponentType> = {
  hoje: Hoje,
  overview: Overview,
  trend: Trend,
  weekly: Weekly,
  comparable: ComparableDays,
  stores: Stores,
  history: History,
}

function Dashboard() {
  const [activePage, setActivePage] = useState('overview')
  const { loading, error } = useFilters()
  const PageComponent = PAGES[activePage] || Overview

  if (loading) return <LoadingScreen message="Carregando faturamento..." />
  if (error) return <ErrorScreen error={error} />


  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {/* Sidebar — só em telas grandes */}
      <div className="hidden lg:flex">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
      </div>

      {/* Conteúdo principal */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Barra de volta pro hub */}
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link
            href="/hub"
            className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
          >
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">Faturamento</span>
        </div>

        <Header activePage={activePage} />
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <PageComponent key={activePage} />
        </main>
      </div>

      {/* Bottom nav — só mobile */}
      <div className="lg:hidden">
        <BottomNav activePage={activePage} onPageChange={setActivePage} />
      </div>
    </div>
  )
}

export default function FaturamentoClientApp({ allowedLojas = '*' }: { allowedLojas?: string[] | '*' }) {
  return (
    <FilterProvider allowedLojas={allowedLojas as any}>
      <MetasProvider>
        <LabelsProvider>
          <AlmocoProvider>
            <TicketProvider>
              <CompradoresProvider allowedLojas={allowedLojas as any}>
                <AreasProvider>
                  <MixProdutosProvider>
                    <Dashboard />
                  </MixProdutosProvider>
                </AreasProvider>
              </CompradoresProvider>
            </TicketProvider>
          </AlmocoProvider>
        </LabelsProvider>
      </MetasProvider>
    </FilterProvider>
  )
}
