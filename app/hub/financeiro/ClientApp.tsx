'use client'

import Link from 'next/link'
import { useFinanceiro } from './hooks/useFinanceiro'
import { labelForUnit } from '@/lib/units'

const COR = '#0369A1' // azul — cor do dashboard Financeiro em lib/dashboards.ts

function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

type Loja = {
  unidade: string
  unidade_nome: string
  banco: number
  aplicacoes: number
  recebiveis: number
  total: number
}

type KpiCardProps = {
  label: string
  valor: string
  sub?: string
  cor?: string
  destaque?: boolean
}

function KpiCard({ label, valor, sub, cor = '#0D0D0D', destaque = false }: KpiCardProps) {
  return (
    <div style={{
      background: '#fff',
      border: destaque ? `2px solid ${COR}` : '1px solid #E8E8E2',
      borderRadius: 8,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#ABABAB', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: destaque ? COR : '#0D0D0D', fontFamily: "'DM Mono', monospace", letterSpacing: '-0.02em', lineHeight: 1.1 }}>
        {valor}
      </div>
      {sub && <div style={{ fontSize: 12, color: cor, fontWeight: 500, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

function CardIndisponivel({ label, motivo }: { label: string; motivo: string }) {
  return (
    <div style={{ background: '#fff', border: '1px dashed #D0D0CC', borderRadius: 8, padding: '16px 20px', opacity: 0.7 }}>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: '#ABABAB', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ fontSize: 13, color: '#999' }}>{motivo}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E8E8E8', borderTopColor: '#0D0D0D', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#999' }}>Carregando dados financeiros...</div>
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

type FinanceiroClientAppProps = {
  allowedLojas?: string[] | '*'
  isAdmin?: boolean
}

export default function FinanceiroClientApp({ allowedLojas = '*', isAdmin = false }: FinanceiroClientAppProps) {
  const { data, loading, erro } = useFinanceiro() as { data: any; loading: boolean; erro: string | null }

  // Entidades não-loja (holding, mott serviços) só aparecem pra quem tem
  // acesso total — não são unidades operacionais de verdade.
  function unidadeVisivel(id: string): boolean {
    if (allowedLojas === '*') return true
    if (id === 'holding' || id === 'servicos') return isAdmin
    return Array.isArray(allowedLojas) && allowedLojas.includes(id)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Voltar ao HUB */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Financeiro — Fluxo de Caixa</span>
      </div>

      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, #024E82 0%, ${COR} 100%)`,
        padding: '16px 24px',
        color: '#fff',
      }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Fluxo de Caixa</div>
        {data?.ultima_data && (
          <div style={{ fontSize: 12, opacity: 0.85, fontFamily: "'DM Mono', monospace", marginTop: 2 }}>
            Última atualização: {formatarData(data.ultima_data)}
          </div>
        )}
      </div>

      {loading && <LoadingScreen />}
      {erro && !loading && <ErrorScreen error={erro} />}

      {!loading && !erro && data && (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* CARDS PRINCIPAIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <KpiCard label="Saldo Atual (Total)" valor={formatarMoeda(data.saldo_atual.total)} destaque />
            <KpiCard label="Saldo em Banco" valor={formatarMoeda(data.saldo_atual.banco)} />
            <KpiCard label="Aplicações" valor={formatarMoeda(data.saldo_atual.aplicacoes)} />
            <KpiCard label="Recebíveis em Aberto" valor={formatarMoeda(data.saldo_atual.recebiveis)} />
          </div>

          {/* VARIAÇÕES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            {data.vs_mes_anterior ? (
              <KpiCard
                label="vs Mês Anterior"
                valor={`${data.vs_mes_anterior.variacao_absoluta >= 0 ? '+' : ''}${formatarMoeda(data.vs_mes_anterior.variacao_absoluta)}`}
                sub={`${data.vs_mes_anterior.variacao_percentual != null ? (data.vs_mes_anterior.variacao_percentual * 100).toFixed(1) + '%' : '—'} vs ${formatarData(data.vs_mes_anterior.data_anterior)}`}
                cor={data.vs_mes_anterior.variacao_absoluta >= 0 ? '#4F8A10' : '#8C1414'}
              />
            ) : (
              <CardIndisponivel label="vs Mês Anterior" motivo="Aguardando 2 meses completos de histórico" />
            )}
            <CardIndisponivel label="vs Ano Anterior" motivo="Aguardando histórico de 2025" />
            <CardIndisponivel label="Caixa Projetado" motivo="Ainda não implementado" />
          </div>

          {/* POR LOJA */}
          <div style={{ background: '#fff', border: '1px solid #E8E8E2', borderRadius: 8, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Por Loja</div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#ABABAB', fontFamily: "'DM Mono', monospace", fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #E8E8E2' }}>Unidade</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #E8E8E2', textAlign: 'right' }}>Banco</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #E8E8E2', textAlign: 'right' }}>Aplicações</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #E8E8E2', textAlign: 'right' }}>Recebíveis</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #E8E8E2', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(data.por_loja as Loja[])
                  .filter((loja: Loja) => unidadeVisivel(loja.unidade))
                  .sort((a: Loja, b: Loja) => b.total - a.total)
                  .map((loja: Loja) => (
                    <tr key={loja.unidade}>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F5F5F3' }}>
                        {loja.unidade === 'holding' || loja.unidade === 'servicos'
                          ? loja.unidade_nome
                          : labelForUnit(loja.unidade as any)}
                      </td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F5F5F3', textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{formatarMoeda(loja.banco)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F5F5F3', textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{formatarMoeda(loja.aplicacoes)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F5F5F3', textAlign: 'right', fontFamily: "'DM Mono', monospace" }}>{formatarMoeda(loja.recebiveis)}</td>
                      <td style={{ padding: '8px', borderBottom: '1px solid #F5F5F3', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>{formatarMoeda(loja.total)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>

          {/* ROIC — fora de escopo */}
          <div style={{ background: '#fff', border: '1px solid #E8E8E2', borderRadius: 8, padding: 20, opacity: 0.6 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>ROIC</div>
            <div style={{ fontSize: 13, color: '#999' }}>
              Fora de escopo por enquanto — depende de dados de DRE/Balanço que ainda não estão conectados ao HUB.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
