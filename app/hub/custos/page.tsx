'use client'

import { useState, useEffect } from 'react'
import { FinanceiroProvider, useFinanceiro } from './hooks/useFinanceiro'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Home from './components/pages/Home'
import ContasPagar from './components/pages/ContasPagar'
import CustoFixo from './components/pages/CustoFixo'
import CustoVariavel from './components/pages/CustoVariavel'
import Evolucao from './components/pages/Evolucao'
import Link from 'next/link'

const PAGES: Record<string, React.ComponentType<any>> = {
  home: Home,
  contas: ContasPagar,
  custos: CustoFixo,
  variavel: CustoVariavel,
  evolucao: Evolucao,
}

function LoadingScreen() {

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E8E8E8', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#999' }}>Carregando dados...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40 }}>
      <div style={{ fontSize: 28 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Erro ao carregar dados</div>
      <div style={{ fontSize: 13, color: '#dc2626', background: '#FEF2F2', padding: '10px 16px', borderRadius: 8, maxWidth: 480, textAlign: 'center' }}>{error}</div>
    </div>
  )
}

function AppInner() {
  const [page, setPage] = useState('home')
  const [collapsed, setCollapsed] = useState(false)
  const { loading, error } = useFinanceiro()
  const PageComponent = PAGES[page] || PAGES.home

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff', flexDirection: 'column' }}>
      {/* Back to hub bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Custos</span>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar — hidden on mobile */}
        <div className="hidden lg:flex">
          <Sidebar page={page} setPage={setPage} collapsed={collapsed} setCollapsed={setCollapsed} />
        </div>
        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: 60 }} className="lg:pb-0">
          {loading ? <LoadingScreen /> : error ? <ErrorScreen error={error} /> : <PageComponent />}
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <div className="lg:hidden">
        <BottomNav activePage={page} onPageChange={setPage} />
      </div>
    </div>
  )
}

export default function CustosPage() {
  return (
    <FinanceiroProvider>
      <AppInner />
    </FinanceiroProvider>
  )
}
