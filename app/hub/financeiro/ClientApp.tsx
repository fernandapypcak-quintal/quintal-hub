'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { useFinanceiro } from './hooks/useFinanceiro'
import { labelForUnit } from '@/lib/units'

const MONO = { fontFamily: "'DM Mono', monospace" }

type Loja = {
  unidade: string
  unidade_nome: string
  banco: number
  aplicacoes: number
  recebiveis: number
  total: number
}

type Payload = {
  ultima_data: string
  ultima_data_saldos?: string
  ultima_data_recebiveis?: string
  datas_disponiveis?: string[]
  saldo_atual: { banco: number; aplicacoes: number; recebiveis: number; total: number }
  por_loja: Loja[]
  vs_mes_anterior: {
    variacao_absoluta: number
    variacao_percentual: number | null
    data_anterior: string
  } | null
}

function formatarMoeda(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
}

function formatarMoedaCompacta(valor: number | null | undefined): string {
  if (valor == null) return '—'
  const abs = Math.abs(valor)
  const sinal = valor < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sinal}R$ ${(abs / 1_000_000).toFixed(1)}M`
  if (abs >= 1_000) return `${sinal}R$ ${(abs / 1_000).toFixed(1)}k`
  return formatarMoeda(valor)
}

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function KpiCard({
  label, valor, subtitulo, subtituloColor,
}: { label: string; valor: string; subtitulo?: string; subtituloColor?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#999' }}>{label}</span>
      <div style={{ ...MONO, fontSize: 24, fontWeight: 600, color: '#111' }}>{valor}</div>
      {subtitulo && <div style={{ fontSize: 12, color: subtituloColor || '#999' }}>{subtitulo}</div>}
    </div>
  )
}

function CardIndisponivel({ label, motivo }: { label: string; motivo: string }) {
  return (
    <div style={{ background: '#FAFAFA', border: '1px dashed #E0E0E0', borderRadius: 10, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase', color: '#BBB' }}>{label}</span>
      <div style={{ fontSize: 13, color: '#AAA' }}>{motivo}</div>
    </div>
  )
}

function CardResumoLoja({ loja, nome }: { loja: Loja; nome: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1a1a' }}>{nome}</div>
      <div style={{ ...MONO, fontSize: 20, fontWeight: 700, color: '#111' }}>{formatarMoedaCompacta(loja.total)}</div>
      <div style={{ display: 'flex', gap: 10, fontSize: 11, color: '#999', ...MONO }}>
        <span>Banco {formatarMoedaCompacta(loja.banco)}</span>
        <span>Apl. {formatarMoedaCompacta(loja.aplicacoes)}</span>
        {loja.recebiveis > 0 && <span>Receb. {formatarMoedaCompacta(loja.recebiveis)}</span>}
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, minHeight: '60vh' }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E8E8E8', borderTopColor: '#1a1a1a', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#999' }}>Carregando dados financeiros...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function ErrorScreen({ error }: { error: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 40, minHeight: '60vh' }}>
      <div style={{ fontSize: 28 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 600 }}>Erro ao carregar dados</div>
      <div style={{ fontSize: 13, color: '#dc2626', background: '#FEF2F2', padding: '10px 16px', borderRadius: 8, maxWidth: 480, textAlign: 'center' }}>{error}</div>
    </div>
  )
}

function selectStyle(ativo: boolean): React.CSSProperties {
  return {
    appearance: 'none', WebkitAppearance: 'none',
    padding: '0 28px 0 12px', height: 32,
    border: ativo ? '1px solid #1a1a1a' : '1px solid #E8E8E8',
    borderRadius: 99, fontSize: 12.5,
    color: ativo ? '#1a1a1a' : '#666',
    background: '#fff', cursor: 'pointer', outline: 'none',
    fontFamily: 'inherit', fontWeight: ativo ? 600 : 400,
  }
}

type FinanceiroClientAppProps = {
  allowedLojas?: string[] | '*'
  isAdmin?: boolean
}

export default function FinanceiroClientApp({ allowedLojas = '*', isAdmin = false }: FinanceiroClientAppProps) {
  const [lojaFiltro, setLojaFiltro] = useState('Todas')
  const [dataFiltro, setDataFiltro] = useState('') // '' = mais recente

  const { data, loading, erro } = useFinanceiro(dataFiltro || undefined) as { data: Payload | null; loading: boolean; erro: string | null }

  function unidadeVisivel(id: string): boolean {
    if (allowedLojas === '*') return true
    if (id === 'holding' || id === 'servicos') return isAdmin
    return Array.isArray(allowedLojas) && allowedLojas.includes(id)
  }

  function nomeLoja(loja: Loja): string {
    return loja.unidade === 'holding' || loja.unidade === 'servicos'
      ? loja.unidade_nome
      : labelForUnit(loja.unidade as any)
  }

  const lojasVisiveis = useMemo(
    () => (data?.por_loja ?? []).filter((l) => unidadeVisivel(l.unidade)),
    [data, allowedLojas, isAdmin]
  )

  const lojasOrdenadas = useMemo(
    () => [...lojasVisiveis].sort((a, b) => b.total - a.total),
    [lojasVisiveis]
  )

  const opcoesLoja = ['Todas', ...lojasOrdenadas.map((l) => nomeLoja(l))]

  const linhasFiltradas = lojaFiltro === 'Todas'
    ? lojasOrdenadas
    : lojasOrdenadas.filter((l) => nomeLoja(l) === lojaFiltro)

  // KPIs recalculados a partir da seleção de loja (Todas = agregado geral)
  const kpi = linhasFiltradas.reduce(
    (acc, l) => ({
      banco: acc.banco + l.banco,
      aplicacoes: acc.aplicacoes + l.aplicacoes,
      recebiveis: acc.recebiveis + l.recebiveis,
      total: acc.total + l.total,
    }),
    { banco: 0, aplicacoes: 0, recebiveis: 0, total: 0 }
  )

  // Datas disponíveis, mais recente primeiro
  const datasOrdenadas = useMemo(
    () => [...(data?.datas_disponiveis ?? [])].sort().reverse(),
    [data]
  )

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

      {/* Header branco, no mesmo padrão dos outros dashboards */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #F0F0F0',
        padding: '12px 28px', position: 'sticky', top: 0, zIndex: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', margin: 0, lineHeight: 1.2 }}>
            Fluxo de Caixa
          </h1>
          {data?.ultima_data && !dataFiltro && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              Última atualização: {formatarData(data.ultima_data)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Data */}
          {datasOrdenadas.length > 0 && (
            <div style={{ position: 'relative' }}>
              <select
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                style={selectStyle(!!dataFiltro)}
              >
                <option value="">Mais recente</option>
                {datasOrdenadas.map((d) => (
                  <option key={d} value={d}>{formatarData(d)}</option>
                ))}
              </select>
              <ChevronDown size={12} color="#999" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          )}

          {/* Loja */}
          {opcoesLoja.length > 1 && (
            <div style={{ position: 'relative' }}>
              <select
                value={lojaFiltro}
                onChange={(e) => setLojaFiltro(e.target.value)}
                style={selectStyle(lojaFiltro !== 'Todas')}
              >
                {opcoesLoja.map((l) => (
                  <option key={l} value={l}>{l === 'Todas' ? 'Todas as lojas' : l}</option>
                ))}
              </select>
              <ChevronDown size={12} color="#999" style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
            </div>
          )}
        </div>
      </header>

      {loading && <LoadingScreen />}
      {erro && !loading && <ErrorScreen error={erro} />}

      {!loading && !erro && data && (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* CARDS PRINCIPAIS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <KpiCard label="Saldo Atual (Total)" valor={formatarMoeda(kpi.total)} />
            <KpiCard label="Saldo em Banco" valor={formatarMoeda(kpi.banco)} />
            <KpiCard label="Aplicações" valor={formatarMoeda(kpi.aplicacoes)} />
            <KpiCard label="Recebíveis em Aberto" valor={formatarMoeda(kpi.recebiveis)} />
          </div>

          {/* VARIAÇÕES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {data.vs_mes_anterior && lojaFiltro === 'Todas' ? (
              <KpiCard
                label="vs Mês Anterior"
                valor={`${data.vs_mes_anterior.variacao_absoluta >= 0 ? '+' : ''}${formatarMoeda(data.vs_mes_anterior.variacao_absoluta)}`}
                subtitulo={`${data.vs_mes_anterior.variacao_percentual != null ? (data.vs_mes_anterior.variacao_percentual * 100).toFixed(1) + '%' : '—'} vs ${formatarData(data.vs_mes_anterior.data_anterior)}`}
                subtituloColor={data.vs_mes_anterior.variacao_absoluta >= 0 ? '#4F8A10' : '#C0392B'}
              />
            ) : (
              <CardIndisponivel
                label="vs Mês Anterior"
                motivo={lojaFiltro !== 'Todas' ? 'Disponível só na visão "Todas as lojas"' : 'Aguardando 2 meses completos de histórico'}
              />
            )}
            <CardIndisponivel label="vs Ano Anterior" motivo="Aguardando histórico de 2025" />
            <CardIndisponivel label="Caixa Projetado" motivo="Ainda não implementado" />
          </div>

          {/* RESUMO POR LOJA — visão em cards, sempre visível, sem precisar filtrar */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 10 }}>Resumo por Loja</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              {lojasOrdenadas.map((loja) => (
                <CardResumoLoja key={loja.unidade} loja={loja} nome={nomeLoja(loja)} />
              ))}
            </div>
          </div>

          {/* TABELA DETALHADA */}
          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, padding: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', marginBottom: 12 }}>Detalhamento por Loja</div>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: '#999', fontSize: 10.5, fontWeight: 500, letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #F0F0F0' }}>Unidade</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #F0F0F0', textAlign: 'right' }}>Banco</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #F0F0F0', textAlign: 'right' }}>Aplicações</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #F0F0F0', textAlign: 'right' }}>Recebíveis</th>
                  <th style={{ padding: '6px 8px', borderBottom: '1px solid #F0F0F0', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {linhasFiltradas.map((loja) => (
                  <tr key={loja.unidade}>
                    <td style={{ padding: '8px', borderBottom: '1px solid #F7F7F7', color: '#1a1a1a' }}>{nomeLoja(loja)}</td>
                    <td style={{ ...MONO, padding: '8px', borderBottom: '1px solid #F7F7F7', textAlign: 'right', color: '#333' }}>{formatarMoeda(loja.banco)}</td>
                    <td style={{ ...MONO, padding: '8px', borderBottom: '1px solid #F7F7F7', textAlign: 'right', color: '#333' }}>{formatarMoeda(loja.aplicacoes)}</td>
                    <td style={{ ...MONO, padding: '8px', borderBottom: '1px solid #F7F7F7', textAlign: 'right', color: '#333' }}>{formatarMoeda(loja.recebiveis)}</td>
                    <td style={{ ...MONO, padding: '8px', borderBottom: '1px solid #F7F7F7', textAlign: 'right', fontWeight: 700, color: '#111' }}>{formatarMoeda(loja.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ROIC — fora de escopo */}
          <div style={{ background: '#FAFAFA', border: '1px dashed #E0E0E0', borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#999', marginBottom: 4 }}>ROIC</div>
            <div style={{ fontSize: 12.5, color: '#AAA' }}>
              Fora de escopo por enquanto — depende de dados de DRE/Balanço que ainda não estão conectados ao HUB.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
