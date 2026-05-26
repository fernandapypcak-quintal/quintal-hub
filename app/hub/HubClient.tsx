'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Dashboard } from '@/lib/dashboards'

interface Props {
  user: string
  dashboards: Dashboard[]
}

export default function HubClient({ user, dashboards }: Props) {
  const [active, setActive] = useState<Dashboard | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    setLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#0a150a', color: '#e2f0e2' }}>

      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b" style={{ borderColor: 'rgba(74,222,128,0.1)', background: 'rgba(0,0,0,0.3)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base" style={{ background: 'linear-gradient(135deg, #16a34a, #4ade80)' }}>
            🌿
          </div>
          <span className="font-bold text-lg tracking-tight text-white">Quintal <span style={{ color: '#4ade80' }}>HUB</span></span>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs hidden sm:block" style={{ color: '#4a7a4a' }}>
            {user}
          </span>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="px-4 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#fca5a5',
            }}
          >
            {loggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-8">
        {!active ? (
          <>
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-1">Seus dashboards</h2>
              <p className="text-sm" style={{ color: '#4a7a4a' }}>
                {dashboards.length === 0
                  ? 'Nenhum dashboard disponível para sua conta.'
                  : `${dashboards.length} ${dashboards.length === 1 ? 'dashboard disponível' : 'dashboards disponíveis'}`}
              </p>
            </div>

            {dashboards.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="text-5xl mb-4">🔒</div>
                <p className="text-lg font-semibold text-white mb-2">Sem acesso</p>
                <p className="text-sm" style={{ color: '#4a7a4a' }}>Entre em contato com o administrador para solicitar acesso.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl">
                {dashboards.map(dash => (
                  <DashboardCard key={dash.id} dashboard={dash} onOpen={() => setActive(dash)} />
                ))}
              </div>
            )}
          </>
        ) : (
          <IframeViewer dashboard={active} onBack={() => setActive(null)} />
        )}
      </main>
    </div>
  )
}

function DashboardCard({ dashboard, onOpen }: { dashboard: Dashboard; onOpen: () => void }) {
  return (
    <div
      className="rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 cursor-pointer group"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: `1px solid rgba(255,255,255,0.07)`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = dashboard.color + '55'
        ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.05)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'
        ;(e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)'
      }}
    >
      <div className="flex items-start justify-between">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: dashboard.color + '20' }}
        >
          {dashboard.icon}
        </div>
        <div
          className="w-2 h-2 rounded-full mt-1"
          style={{ background: dashboard.color }}
        />
      </div>

      <div>
        <h3 className="font-bold text-white text-lg mb-1">{dashboard.name}</h3>
        <p className="text-xs leading-relaxed" style={{ color: '#4a7a4a' }}>{dashboard.description}</p>
      </div>

      <div className="flex gap-2 mt-auto pt-2">
        <button
          onClick={onOpen}
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: dashboard.color + '20',
            border: `1px solid ${dashboard.color}40`,
            color: dashboard.color,
          }}
        >
          Abrir aqui
        </button>
        <a
          href={dashboard.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-center transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af',
          }}
          onClick={e => e.stopPropagation()}
        >
          ↗ Nova aba
        </a>
      </div>
    </div>
  )
}

function IframeViewer({ dashboard, onBack }: { dashboard: Dashboard; onBack: () => void }) {
  return (
    <div className="flex flex-col h-full" style={{ height: 'calc(100vh - 140px)' }}>
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#9ca3af',
          }}
        >
          ← Voltar
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xl">{dashboard.icon}</span>
          <span className="font-bold text-white">{dashboard.name}</span>
        </div>

        <a
          href={dashboard.url}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: dashboard.color + '20',
            border: `1px solid ${dashboard.color}40`,
            color: dashboard.color,
          }}
        >
          ↗ Abrir em nova aba
        </a>
      </div>

      {/* Iframe */}
      <div className="flex-1 rounded-2xl overflow-hidden" style={{ border: `1px solid ${dashboard.color}30` }}>
        <iframe
          src={dashboard.url}
          className="w-full h-full"
          title={dashboard.name}
          allow="fullscreen"
        />
      </div>
    </div>
  )
}
