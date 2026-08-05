'use client'

import { KidsProvider, useKids } from './hooks/useKids.jsx'
import Home from './components/pages/Home'
import Link from 'next/link'

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
  const { loading, error } = useKids()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff', flexDirection: 'column' }}>
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Kids</span>
      </div>

      <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {loading ? <LoadingScreen /> : error ? <ErrorScreen error={error} /> : <Home />}
      </main>
    </div>
  )
}

export default function KidsClientApp({ allowedLojas = '*' }: { allowedLojas?: string[] | '*' }) {
  return (
    <KidsProvider allowedLojas={allowedLojas as any}>
      <AppInner />
    </KidsProvider>
  )
}
