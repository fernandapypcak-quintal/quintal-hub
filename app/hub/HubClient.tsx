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

function logAccess(id: string) {
  fetch('/api/log-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dashboard: id }),
  }).catch(() => {})
}

/* ── CSS responsivo (layout) — cores/tipografia seguem inline ───────────── */
const HUB_CSS = `
.hub-root { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; background: #F0F3E3; font-family: var(--font-dm-sans); overflow-x: hidden; }

.hub-header { position: sticky; top: 0; z-index: 20; display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 0 36px; padding-top: env(safe-area-inset-top, 0px); min-height: 68px;
  background: linear-gradient(135deg, #6B7A18 0%, #97A624 100%); box-shadow: 0 2px 12px rgba(97,114,10,0.25); }
.hub-brand { display: flex; align-items: center; gap: 12px; min-width: 0; }
.hub-brand-text { min-width: 0; line-height: 1.15; }
.hub-brand-sub { display: block; font-size: 10px; color: rgba(255,255,255,0.65); letter-spacing: 0.08em; text-transform: uppercase; white-space: nowrap; }
.hub-actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.hub-user { font-size: 13px; color: rgba(255,255,255,0.75); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hub-admin { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: rgba(255,255,255,0.85); text-decoration: none;
  padding: 6px 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.08); }
.hub-logout { padding: 7px 18px; border-radius: 20px; border: 1.5px solid rgba(255,255,255,0.4); background: rgba(255,255,255,0.12);
  color: #FFFFFF; font-size: 13px; font-weight: 600; cursor: pointer; font-family: var(--font-dm-sans); transition: background 0.15s; }
.hub-logout:hover { background: rgba(255,255,255,0.22); }

.hub-main { flex: 1; padding: 40px 36px; padding-bottom: calc(40px + env(safe-area-inset-bottom, 0px)); }

.hub-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; max-width: 1100px; }
.hub-grid > .hub-last-center { grid-column: 2 / 3; }

.hub-card { display: flex; flex-direction: column; height: 100%; background: #FFFFFF; border-radius: 16px; overflow: hidden;
  border: 1.5px solid #E8E8E0; box-shadow: 0 1px 6px rgba(0,0,0,0.06); transition: border-color .18s, box-shadow .18s;
  text-decoration: none; color: inherit; cursor: pointer; text-align: left; font: inherit; padding: 0; width: 100%;
  -webkit-tap-highlight-color: transparent; }
.hub-card:focus-visible { outline: 2px solid #6B7A18; outline-offset: 2px; }
.hub-card-stripe { height: 5px; opacity: .7; transition: opacity .18s; flex-shrink: 0; }
.hub-card-body { padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 14px; flex: 1; }
.hub-card-head { display: flex; align-items: center; gap: 14px; min-width: 0; }
.hub-card-icon { width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.hub-card-text { min-width: 0; flex: 1; }
.hub-card-title { font-size: 16px; font-weight: 700; color: #0D0D0D; margin: 0 0 2px; letter-spacing: -0.2px; line-height: 1.25; }
.hub-card-tags { font-size: 11px; color: #9A9A9A; margin: 0; line-height: 1.45; }
.hub-card-cta { margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px;
  border-radius: 9px; font-size: 13px; font-weight: 600; letter-spacing: 0.02em; white-space: nowrap; transition: background .18s, color .18s; box-sizing: border-box; }
.hub-card-chevron { display: none; }

/* Tablet: 2 colunas */
@media (max-width: 1024px) {
  .hub-header { padding-left: 24px; padding-right: 24px; }
  .hub-main { padding: 32px 24px; }
  .hub-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .hub-grid > .hub-last-center { grid-column: auto; }
}

/* Mobile: lista compacta, card inteiro clicável */
@media (max-width: 640px) {
  .hub-header { padding-left: 16px; padding-right: 12px; min-height: 58px; }
  .hub-brand { gap: 10px; }
  .hub-brand-sub { display: none; }
  .hub-user { display: none; }
  .hub-actions { gap: 8px; }
  .hub-admin-label { display: none; }
  .hub-admin { padding: 7px 9px; }
  .hub-logout { padding: 6px 14px; font-size: 12px; }

  .hub-main { padding: 22px 14px; padding-bottom: calc(28px + env(safe-area-inset-bottom, 0px)); }
  .hub-title { font-size: 20px !important; }

  .hub-grid { grid-template-columns: minmax(0, 1fr); gap: 10px; }

  .hub-card { flex-direction: row; border-radius: 14px; }
  .hub-card-stripe { width: 4px; height: auto; opacity: 1; }
  .hub-card-body { padding: 14px 12px 14px 14px; gap: 0; flex-direction: row; align-items: center; }
  .hub-card-head { gap: 12px; flex: 1; align-items: center; }
  .hub-card-icon { width: 40px; height: 40px; border-radius: 11px; }
  .hub-card-title { font-size: 15px; }
  .hub-card-tags { font-size: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .hub-card-cta { display: none; }
  .hub-card-chevron { display: flex; flex-shrink: 0; margin-left: 8px; font-size: 20px; color: #B5B5AC; }
  .hub-card:active { background: #F7F8EF; }
}

/* Iframe viewer */
.hub-viewer { display: flex; flex-direction: column; height: calc(100vh - 160px); height: calc(100dvh - 160px); }
.hub-viewer-bar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
.hub-viewer-name { font-weight: 700; font-size: 16px; color: #3A4A08; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hub-viewer-right { margin-left: auto; display: flex; gap: 8px; align-items: center; }
@media (max-width: 640px) {
  .hub-viewer { height: calc(100dvh - 120px); }
  .hub-viewer-bar { gap: 8px; margin-bottom: 10px; }
  .hub-viewer-name { flex: 1; font-size: 15px; }
  .hub-viewer-label { display: none; }
}
@keyframes hub-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
@media (prefers-reduced-motion: reduce) { .hub-card, .hub-card-stripe, .hub-card-cta { transition: none; } }
`

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

  const lastCentered = dashboards.length % 3 !== 0

  return (
    <div className="hub-root">
      <style>{HUB_CSS}</style>

      {/* Header verde */}
      <header className="hub-header">
        <div className="hub-brand">
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', overflow: 'hidden', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
            <Image src="/quintal-tree.jpg" alt="Quintal" width={38} height={38} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div className="hub-brand-text">
            <span style={{ fontWeight: 800, fontSize: '18px', color: '#FFFFFF', letterSpacing: '-0.4px', whiteSpace: 'nowrap' }}>Quintal HUB</span>
            <span className="hub-brand-sub">Central de dashboards</span>
          </div>
        </div>

        <div className="hub-actions">
          <span className="hub-user" title={user}>{user}</span>
          {isAdmin && (
            <Link href="/hub/admin" className="hub-admin" aria-label="Admin">
              <i className="ti ti-settings" style={{ fontSize: '16px' }} />
              <span className="hub-admin-label">Admin</span>
            </Link>
          )}
          <button onClick={handleLogout} disabled={loggingOut} className="hub-logout">
            {loggingOut ? 'Saindo...' : 'Sair'}
          </button>
        </div>
      </header>

      {/* Faixa decorativa */}
      <div style={{ height: '4px', background: 'linear-gradient(90deg, #97A624, #D9B504, #97A624)' }} />

      <main className="hub-main">
        {!active ? (
          <>
            <div style={{ marginBottom: '22px' }}>
              <h2 className="hub-title" style={{ fontSize: '22px', fontWeight: 700, color: '#3A4A08', margin: '0 0 4px', letterSpacing: '-0.4px' }}>Seus dashboards</h2>
              <p style={{ fontSize: '13px', color: '#7A8A40', margin: 0 }}>
                {dashboards.length === 0 ? 'Nenhum dashboard disponível.' : `${dashboards.length} ${dashboards.length === 1 ? 'dashboard disponível' : 'dashboards disponíveis'}`}
              </p>
            </div>

            {dashboards.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
                <p style={{ fontWeight: 600, color: '#3A4A08' }}>Sem acesso</p>
                <p style={{ fontSize: '13px', color: '#7A8A40' }}>Entre em contato com o administrador.</p>
              </div>
            ) : (
              <div className="hub-grid">
                {dashboards.map((dash, idx) => (
                  <div key={dash.id} className={lastCentered && idx === dashboards.length - 1 ? 'hub-last-center' : undefined}>
                    <DashboardCard
                      dashboard={dash}
                      onOpen={() => { setActive(dash); logAccess(dash.id) }}
                    />
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
  const c = dashboard.color

  // hover só com mouse — no toque o estado "grudava" depois do tap
  const hoverProps = {
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setHovered(true) },
    onPointerLeave: () => setHovered(false),
  }
  const cardStyle: React.CSSProperties = hovered
    ? { borderColor: c, boxShadow: `0 6px 24px ${c}22` }
    : {}

  const inner = (
    <>
      <div className="hub-card-stripe" style={{ background: c, opacity: hovered ? 1 : undefined }} />
      <div className="hub-card-body">
        <div className="hub-card-head">
          <div className="hub-card-icon" style={{ background: `${c}15` }}>
            <i className={`ti ${icon}`} style={{ fontSize: '22px', color: c }} />
          </div>
          <div className="hub-card-text">
            <h3 className="hub-card-title">{dashboard.name}</h3>
            <p className="hub-card-tags">{tags}</p>
          </div>
        </div>
        <span className="hub-card-cta" style={{ background: hovered ? c : `${c}15`, color: hovered ? '#FFFFFF' : c }}>
          Abrir dashboard
          <i className="ti ti-arrow-right" style={{ fontSize: '15px' }} />
        </span>
        <i className="ti ti-chevron-right hub-card-chevron" aria-hidden="true" />
      </div>
    </>
  )

  if (dashboard.internalPath) {
    return (
      <Link href={dashboard.internalPath} onClick={() => logAccess(dashboard.id)} className="hub-card" style={cardStyle} {...hoverProps}>
        {inner}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onOpen} className="hub-card" style={cardStyle} {...hoverProps}>
      {inner}
    </button>
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

  const pill: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', borderRadius: '20px',
    border: '1.5px solid #D4DC9A', background: '#FFFFFF', color: '#6B7A18',
    fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-dm-sans)', whiteSpace: 'nowrap',
  }

  return (
    <div className="hub-viewer">
      <div className="hub-viewer-bar">
        <button onClick={onBack} style={pill}>← <span className="hub-viewer-label">Voltar</span></button>
        <span style={{ fontSize: '20px' }}>{dashboard.icon}</span>
        <span className="hub-viewer-name">{dashboard.name}</span>
        <div className="hub-viewer-right">
          <button onClick={handleReload} disabled={reloading} aria-label="Atualizar"
            style={{ ...pill, background: reloading ? '#E4EAC8' : '#FFFFFF', cursor: reloading ? 'not-allowed' : 'pointer' }}>
            <span style={{ display: 'inline-block', animation: reloading ? 'hub-spin 0.8s linear infinite' : 'none' }}>↻</span>
            <span className="hub-viewer-label">{reloading ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
          <a href={dashboard.url} target="_blank" rel="noopener noreferrer" aria-label="Abrir em nova aba"
            style={{ ...pill, border: 'none', textDecoration: 'none', background: dashboard.color, color: '#FFFFFF' }}>
            ↗ <span className="hub-viewer-label">Nova aba</span>
          </a>
        </div>
      </div>
      <div style={{ flex: 1, borderRadius: '16px', overflow: 'hidden', border: `2px solid ${dashboard.color}44`, boxShadow: '0 4px 20px rgba(97,114,10,0.12)' }}>
        <iframe key={iframeKey} src={dashboard.url} style={{ width: '100%', height: '100%', border: 'none' }} title={dashboard.name} allow="fullscreen" />
      </div>
    </div>
  )
}
