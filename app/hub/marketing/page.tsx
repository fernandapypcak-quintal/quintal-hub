'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMarketing } from './useMarketing'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtBRL(v: number | null) { return v === null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) }
function fmtPct(v: number | null) { return v === null ? '—' : v.toFixed(1) + '%' }
function fmtX(v: number | null)   { return v === null ? '—' : v.toFixed(2) + 'x' }

// ── Badge Planejado ───────────────────────────────────────────────────────────
function Badge() {

  return (
    <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 8px', borderRadius: 20, background: '#fef9c3', color: '#854d0e', border: '0.5px solid #fde047', whiteSpace: 'nowrap' }}>
      Planejado
    </span>
  )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sublabel, formula, fonte, accentColor = '#0ea5e9' }: {
  label: string; value: string; sublabel: string; formula: string; fonte: string; accentColor?: string
}) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, overflow: 'hidden', opacity: 0.85 }}>
      <div style={{ height: 4, background: accentColor }} />
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 10, fontWeight: 600, color: '#ABABAB', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</span>
          <Badge />
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#CCCCCC', lineHeight: 1.1, marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>{value}</div>
        <div style={{ fontSize: 12, color: '#888888', marginBottom: 14, fontWeight: 400 }}>{sublabel}</div>
        <div style={{ background: '#F8F8F5', border: '0.5px solid #E8E8E2', borderRadius: 8, padding: '8px 12px', marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: '#ABABAB', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Fórmula</div>
          <div style={{ fontSize: 11, fontFamily: "'DM Mono', monospace", color: '#555', lineHeight: 1.5 }}>{formula}</div>
        </div>
        <div style={{ fontSize: 11, color: '#CCCCCC' }}>Fonte: {fonte}</div>
      </div>
    </div>
  )
}

// ── Linha de detalhe ──────────────────────────────────────────────────────────
function DetalheRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid #F3F3EE' }}>
      <span style={{ fontSize: 13, color: '#777' }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 600, color: '#0D0D0D', fontFamily: "'DM Mono', monospace" }}>{value}</span>
    </div>
  )
}

// ── Gráfico placeholder ───────────────────────────────────────────────────────
function ChartPlaceholder({ titulo }: { titulo: string }) {
  return (
    <div style={{ background: '#F8F8F5', border: '0.5px dashed #D5D5CE', borderRadius: 10, height: 160, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, color: '#CCCCCC' }}>
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path d="M3 3v18h18M7 16l4-4 4 4 4-6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span style={{ fontSize: 12 }}>{titulo} — aguardando dados</span>
    </div>
  )
}

// ── Seção de detalhe ──────────────────────────────────────────────────────────
function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, padding: '18px 22px', marginBottom: 14 }}>
      <h2 style={{ fontSize: 14, fontWeight: 600, color: '#0D0D0D', margin: '0 0 12px', letterSpacing: '-0.2px' }}>{titulo}</h2>
      {children}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function MarketingPage() {
  const { kpis, loading, error } = useMarketing()

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fff', flexDirection: 'column' }}>

      {/* Barra de volta — padrão do hub */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Marketing</span>
      </div>

      {/* Header verde — igual aos outros dashboards */}
      <div style={{
        background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)',
        borderBottom: '1px solid #3d5210',
        padding: '14px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'rgba(255,255,255,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, flexShrink: 0,
        }}>
          📣
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>
            Marketing
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
            Quintal do Espeto · Performance de campanhas
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 48px' }}>

          {/* Banner em construção */}
          <div style={{ background: '#EFF6FF', border: '0.5px solid #BFDBFE', borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 24 }}>
            <span style={{ fontSize: 15 }}>ℹ️</span>
            <div>
              <p style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600, margin: '0 0 2px' }}>Dashboard em construção</p>
              <p style={{ fontSize: 12, color: '#1E40AF', margin: 0, lineHeight: 1.5 }}>
                A estrutura e as fórmulas já estão definidas. Assim que as fontes forem conectadas (Meta Ads, Google Ads ou planilha consolidada), os valores aparecerão automaticamente.
              </p>
            </div>
          </div>

          {/* Cards KPI */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 28 }}>
            <KpiCard label="ROAS" value={fmtX(kpis.roas)} sublabel="Return on Ad Spend" formula="Receita anúncios ÷ Gasto em anúncios" fonte="Meta Ads · Google Ads" accentColor="#0ea5e9" />
            <KpiCard label="LTV" value={fmtBRL(kpis.ltv)} sublabel="Lifetime Value por cliente" formula="Ticket médio × Frequência × Tempo de relacionamento" fonte="A definir" accentColor="#8b5cf6" />
            <KpiCard label="ROI de Marketing" value={fmtPct(kpis.roiMarketing)} sublabel="Retorno sobre investimento em marketing" formula="(Receita − Investimento) ÷ Investimento × 100" fonte="A definir" accentColor="#f59e0b" />
          </div>

          {/* Detalhamentos */}
          <Secao titulo="Detalhamento ROAS">
            <DetalheRow label="Receita gerada por anúncios" value={fmtBRL(kpis.roasReceitaAnuncios)} />
            <DetalheRow label="Gasto em anúncios" value={fmtBRL(kpis.roasGastoAnuncios)} />
            <DetalheRow label="ROAS calculado" value={fmtX(kpis.roas)} />
          </Secao>

          <Secao titulo="Detalhamento LTV">
            <DetalheRow label="Ticket médio" value={fmtBRL(kpis.ltvTicketMedio)} />
            <DetalheRow label="Frequência de visitas / mês" value={kpis.ltvFrequencia !== null ? kpis.ltvFrequencia.toFixed(1) + 'x' : '—'} />
            <DetalheRow label="Tempo de relacionamento (meses)" value={kpis.ltvTempoRelacionamento !== null ? kpis.ltvTempoRelacionamento + ' meses' : '—'} />
            <DetalheRow label="LTV calculado" value={fmtBRL(kpis.ltv)} />
          </Secao>

          <Secao titulo="Detalhamento ROI de Marketing">
            <DetalheRow label="Receita gerada" value={fmtBRL(kpis.roiReceitaGerada)} />
            <DetalheRow label="Investimento em marketing" value={fmtBRL(kpis.roiInvestimento)} />
            <DetalheRow label="ROI calculado" value={fmtPct(kpis.roiMarketing)} />
          </Secao>

          {/* Gráficos placeholder */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <Secao titulo="Evolução ROAS × ROI">
              <ChartPlaceholder titulo="Evolução mensal" />
            </Secao>
            <Secao titulo="Investimento vs Receita gerada">
              <ChartPlaceholder titulo="Investimento vs Receita" />
            </Secao>
          </div>

          {/* Rodapé */}
          <div style={{ textAlign: 'center', fontSize: 11, color: '#CCCCCC', marginTop: 32 }}>
            {kpis.fonteAtualizada
              ? `Última atualização: ${new Date(kpis.fonteAtualizada).toLocaleString('pt-BR')}`
              : 'Dados ainda não configurados'}
          </div>

        </div>
      </div>

    </div>
  )
}
