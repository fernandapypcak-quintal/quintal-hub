'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Dashboard } from '@/lib/dashboards'
import Image from 'next/image'
import Link from 'next/link'

interface Props {
  user: string
  dashboards: Dashboard[]
  isAdmin?: boolean
}

export default function HubClient({ user, dashboards, isAdmin = false }: Props) {
  const [active, setActive] = useState<Dashboard | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    setLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F0F3E3', fontFamily: 'var(--font-dm-sans)' }}>
      {/* Header verde */}
      <header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 36px', height: '68px',
        background: 'linear-gradient(135deg, #6B7A18 0%, #97A624 100%)',
        boxShadow: '0 2px 12px rgba(97,114,10,0.25)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
            <Image src="/quintal-tree.jpg" alt="Quintal" width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <span style={{ fontWeight: '800', fontSize: '18px', color: '#FFFFFF', letterSpacing: '-0.4px' }}>Quintal HUB</span>
            <span style={{ display: 'block', fontSize: '10px', color: 'rgba(255,255,255,0.65)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '-2px' }}>Central de dashboards</span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)' }}>{user}</span>
          {isAdmin && (
            <Link href="/hub/admin" style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', textDecoration: 'none', padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)' }}>
              ⚙️ Admin
            </Link>
          )}
          <button onClick={handleLogout} disabled={loggingOut} style={{
            padding: '7px 18px', borderRadius: '20px',
            border: '1.5px solid rgba(255,255,255,0.4)',
            background: 'rgba(255,255,255,0.12)',
            color: '#FFFFFF', fontSize: '13px', fontWeight: '600',
            cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', transition: 'all 0.15s',
            backdropFilter: 'blur(4px)'
          }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.22)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.12)'}>
            {loggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </header>

      {/* Faixa decorativa */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #97A624, #D9B504, #97A624)' }} />

      {/* Main */}
      <main style={{ flex: 1, padding: '40px 36px' }}>
        {!active ? (
          <>
            <div style={{ marginBottom: '28px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#3A4A08', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Seus dashboards</h2>
              <p style={{ fontSize: '13px', color: '#7A8A40', margin: 0 }}>
                {dashboards.length === 0 ? 'Nenhum dashboard disponível.' : `${dashboards.length} ${dashboards.length === 1 ? 'dashboard disponível' : 'dashboards disponíveis'}`}
              </p>
            </div>

            {dashboards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <p style={{ fontWeight: '600', color: '#3A4A08' }}>Sem acesso</p>
                <p style={{ fontSize: '13px', color: '#7A8A40' }}>Entre em contato com o administrador.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', maxWidth: '1100px' }}>
                {dashboards.map((dash, idx) => (
                  <div
                    key={dash.id}
                    style={
                      dashboards.length % 3 !== 0 && idx === dashboards.length - 1
                        ? { gridColumn: '2 / 3' }
                        : undefined
                    }
                  >
                    <DashboardCard dashboard={dash} onOpen={() => {
                    setActive(dash)
                    fetch('/api/log-access', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ dashboard: dash.id })
                    }).catch(() => {})
                  }} />
                  </div>
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

// Icon and tag map per dashboard id
const DASH_ICON: Record<string, string> = {
  faturamento: 'ti-chart-line',
  custos:      'ti-receipt',
  cmv:         'ti-percentage',
  turnover:    'ti-users',
}
const DASH_TAGS: Record<string, string> = {
  faturamento: 'Receitas · Tendência · Por loja',
  custos:      'Fixo · Variável · Evolução',
  cmv:         'Produtos · Desperdício · Delivery',
  turnover:    'Headcount · Admissões · Custos RH',
}

function DashboardCard({ dashboard, onOpen }: { dashboard: Dashboard; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false)
  const icon = DASH_ICON[dashboard.id] || 'ti-layout-dashboard'
  const tags = DASH_TAGS[dashboard.id] || dashboard.description

  const href = dashboard.internalPath || dashboard.url
  const isExternal = !dashboard.internalPath

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        overflow: 'hidden',
        border: hovered ? `1.5px solid ${dashboard.color}` : '1.5px solid #E8E8E0',
        boxShadow: hovered ? `0 6px 24px ${dashboard.color}22` : '0 1px 6px rgba(0,0,0,0.06)',
        transition: 'all 0.18s',
        display: 'flex', flexDirection: 'column',
        cursor: 'pointer',
      }}
    >
      {/* Faixa colorida no topo */}
      <div style={{
        height: '5px',
        background: dashboard.color,
        opacity: hovered ? 1 : 0.7,
        transition: 'opacity 0.18s',
      }} />

      {/* Conteúdo */}
      <div style={{ padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: '14px', flex: 1 }}>
        {/* Ícone + nome */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px', flexShrink: 0,
            background: `${dashboard.color}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: '22px', color: dashboard.color }} />
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0D0D0D', margin: '0 0 2px', letterSpacing: '-0.2px' }}>
              {dashboard.name}
            </h3>
            <p style={{ fontSize: '11px', color: '#AAAAAA', margin: 0, letterSpacing: '0.01em' }}>{tags}</p>
          </div>
        </div>

        {/* Botão */}
        <div style={{ marginTop: 'auto' }}>
          {dashboard.internalPath ? (
            <Link href={dashboard.internalPath} onClick={() => {
              fetch('/api/log-access', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dashboard: dashboard.id })
              }).catch(() => {})
            }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '10px', borderRadius: '9px', textDecoration: 'none',
              background: hovered ? dashboard.color : `${dashboard.color}15`,
              color: hovered ? '#FFFFFF' : dashboard.color,
              fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-dm-sans)',
              transition: 'all 0.18s', letterSpacing: '0.02em',
            }}>
              Abrir dashboard
              <i className="ti ti-arrow-right" style={{ fontSize: '15px' }} />
            </Link>
          ) : (
            <button onClick={onOpen} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
              width: '100%', padding: '10px', borderRadius: '9px', border: 'none', cursor: 'pointer',
              background: hovered ? dashboard.color : `${dashboard.color}15`,
              color: hovered ? '#FFFFFF' : dashboard.color,
              fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-dm-sans)',
              transition: 'all 0.18s', letterSpacing: '0.02em',
            }}>
              Abrir dashboard
              <i className="ti ti-arrow-right" style={{ fontSize: '15px' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function IframeViewer({ dashboard, onBack }: { dashboard: Dashboard; onBack: () => void }) {
  const [iframeKey, setIframeKey] = useState(0)
  const [reloading, setReloading] = useState(false)

  function handleReload() {
    setReloading(true)
    setIframeKey(k => k + 1)
    setTimeout(() => setReloading(false), 1500)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', borderRadius: '20px',
          background: '#FFFFFF', border: '1.5px solid #D4DC9A', color: '#6B7A18',
          fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', transition: 'all 0.15s'
        }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#F0F3E3'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = '#FFFFFF'}>
          ← Voltar
        </button>
        <span style={{ fontSize: '20px' }}>{dashboard.icon}</span>
        <span style={{ fontWeight: '700', fontSize: '16px', color: '#3A4A08' }}>{dashboard.name}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={handleReload} disabled={reloading} style={{
            padding: '8px 16px', borderRadius: '20px', border: '1.5px solid #D4DC9A',
            background: reloading ? '#E4EAC8' : '#FFFFFF', color: '#6B7A18',
            fontSize: '13px', fontWeight: '600', cursor: reloading ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-dm-sans)', transition: 'all 0.15s', display: 'flex', alignItems: 'center', gap: '6px'
          }}
            onMouseEnter={e => !reloading && ((e.currentTarget as HTMLElement).style.background = '#F0F3E3')}
            onMouseLeave={e => !reloading && ((e.currentTarget as HTMLElement).style.background = '#FFFFFF')}>
            <span style={{ display: 'inline-block', animation: reloading ? 'spin 0.8s linear infinite' : 'none' }}>↻</span>
            {reloading ? 'Atualizando...' : 'Atualizar'}
          </button>
          <a href={dashboard.url} target="_blank" rel="noopener noreferrer" style={{
            padding: '8px 18px', borderRadius: '20px', textDecoration: 'none',
            background: dashboard.color, color: '#FFFFFF',
            fontSize: '13px', fontWeight: '600', fontFamily: 'var(--font-dm-sans)'
          }}>
            ↗ Nova aba
          </a>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
      <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: `2px solid ${dashboard.color}44`, boxShadow: '0 4px 20px rgba(97,114,10,0.12)' }}>
        <iframe key={iframeKey} src={dashboard.url} style={{ width: '100%', height: '100%', border: 'none' }} title={dashboard.name} allow="fullscreen" />
      </div>
    </div>
  )
}
