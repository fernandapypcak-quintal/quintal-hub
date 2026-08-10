'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useFinanceiro } from './hooks/useFinanceiro'
import { labelForUnit, ALL_UNIT_IDS } from '@/lib/units'

const MONO = { fontFamily: "'DM Mono', monospace" }

// Mesma paleta usada no dashboard de Faturamento (Stores.jsx) — mantém
// a mesma cor por loja em todo o HUB.
const STORE_COLORS = ['#97A624', '#D9B504', '#D9CB04', '#8C1414', '#0D9488', '#7C3AED', '#EA580C', '#0284C7', '#65A30D', '#6B7280']

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

function formatarData(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [ano, mes, dia] = iso.split('-')
  return `${dia}/${mes}/${ano}`
}

function corParaUnidade(id: string): string {
  const idx = ALL_UNIT_IDS.indexOf(id as any)
  if (idx >= 0) return STORE_COLORS[idx % STORE_COLORS.length]
  return '#6B7280'
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

function dateInputStyle(ativo: boolean): React.CSSProperties {
  return {
    height: 28, fontSize: 12.5, padding: '0 8px',
    border: 'none', background: 'transparent', outline: 'none',
    color: ativo ? '#1a1a1a' : '#666', fontFamily: 'inherit',
    fontWeight: ativo ? 600 : 400, cursor: 'pointer', width: 128,
  }
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

// Card expansível por loja — mesmo padrão visual do Stores.jsx (Faturamento)
function CardLoja({
  loja, nome, cor, expandido, onToggle, delta,
}: { loja: Loja; nome: string; cor: string; expandido: boolean; onToggle: () => void; delta?: number | null }) {
  const pctAplicado = loja.total > 0 ? (loja.aplicacoes / loja.total) * 100 : 0

  return (
    <div className="bg-white border border-surface-border rounded-2xl" style={{ borderLeft: `4px solid ${cor}` }}>
      <button
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-surface-muted/30 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-5 flex-wrap flex-1 min-w-0">
          <div className="min-w-[140px]">
            <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-0.5">{nome}</p>
            <p className="text-xl font-bold" style={{ ...MONO, color: cor }}>{formatarMoeda(loja.total)}</p>
          </div>

          <div className="flex items-center gap-6 flex-wrap text-sm">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Banco</p>
              <p className="font-semibold text-zinc-700" style={MONO}>{formatarMoeda(loja.banco)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Aplicações</p>
              <p className="font-semibold text-zinc-700" style={MONO}>{formatarMoeda(loja.aplicacoes)}</p>
            </div>
            {loja.recebiveis > 0 && (
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Recebíveis</p>
                <p className="font-semibold text-zinc-700" style={MONO}>{formatarMoeda(loja.recebiveis)}</p>
              </div>
            )}
            {delta != null ? (
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Variação no período</p>
                <p className={`font-bold ${delta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} style={MONO}>
                  {delta >= 0 ? '+' : ''}{formatarMoeda(delta)}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">% Aplicado</p>
                <p className="font-semibold text-zinc-600">{pctAplicado.toFixed(1)}%</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-4 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-2">
            <div className="w-20 h-1.5 bg-surface-muted rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${Math.min(pctAplicado, 100)}%`, backgroundColor: cor }} />
            </div>
          </div>
          {expandido ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
        </div>
      </button>

      {expandido && (
        <div className="border-t border-surface-border px-5 py-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Saldo em Banco</p>
              <p className="font-semibold text-zinc-700" style={MONO}>{formatarMoeda(loja.banco)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Aplicações Financeiras</p>
              <p className="font-semibold text-zinc-700" style={MONO}>{formatarMoeda(loja.aplicacoes)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Recebíveis em Aberto</p>
              <p className="font-semibold text-zinc-700" style={MONO}>{formatarMoeda(loja.recebiveis)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Total Geral</p>
              <p className="font-bold" style={{ ...MONO, color: cor }}>{formatarMoeda(loja.total)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

type FinanceiroClientAppProps = {
  allowedLojas?: string[] | '*'
  isAdmin?: boolean
}

export default function FinanceiroClientApp({ allowedLojas = '*', isAdmin = false }: FinanceiroClientAppProps) {
  const [lojaFiltro, setLojaFiltro] = useState('Todas')
  const [dataInicio, setDataInicio] = useState('') // '' = sem comparação de período
  const [dataFim, setDataFim] = useState('')       // '' = mais recente
  const [expandido, setExpandido] = useState<string | null>(null)

  const periodoAtivo = !!dataInicio

  const { data, loading, erro } = useFinanceiro(dataFim || undefined, true) as { data: Payload | null; loading: boolean; erro: string | null }
  const { data: dataInicioPayload, loading: loadingInicio } = useFinanceiro(dataInicio || undefined, periodoAtivo) as { data: Payload | null; loading: boolean; erro: string | null }

  // Dia anterior ao que está sendo exibido (pra comparação da Disponibilidade)
  const diaAnterior = useMemo(() => {
    const datas = [...(data?.datas_disponiveis ?? [])].sort()
    const dataAtual = data?.ultima_data_saldos || data?.ultima_data
    if (!dataAtual) return null
    const idx = datas.indexOf(dataAtual)
    return idx > 0 ? datas[idx - 1] : null
  }, [data])

  const { data: dataAnteriorPayload } = useFinanceiro(diaAnterior || undefined, !!diaAnterior) as { data: Payload | null; loading: boolean; erro: string | null }

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

  // Mapa unidade -> total no início do período, pra calcular a variação por loja
  const totaisInicio = useMemo(() => {
    const mapa: Record<string, number> = {}
    ;(dataInicioPayload?.por_loja ?? []).forEach((l) => { mapa[l.unidade] = l.total })
    return mapa
  }, [dataInicioPayload])

  const opcoesLoja = ['Todas', ...lojasOrdenadas.map((l) => nomeLoja(l))]

  const linhasFiltradas = lojaFiltro === 'Todas'
    ? lojasOrdenadas
    : lojasOrdenadas.filter((l) => nomeLoja(l) === lojaFiltro)

  const kpi = linhasFiltradas.reduce(
    (acc, l) => ({
      banco: acc.banco + l.banco,
      aplicacoes: acc.aplicacoes + l.aplicacoes,
      recebiveis: acc.recebiveis + l.recebiveis,
      total: acc.total + l.total,
    }),
    { banco: 0, aplicacoes: 0, recebiveis: 0, total: 0 }
  )

  const kpiInicio = periodoAtivo
    ? linhasFiltradas.reduce((acc, l) => acc + (totaisInicio[l.unidade] ?? 0), 0)
    : null

  const variacaoPeriodo = kpiInicio != null ? kpi.total - kpiInicio : null
  const variacaoPeriodoPct = kpiInicio != null && kpiInicio !== 0 ? (variacaoPeriodo! / kpiInicio) * 100 : null

  // Disponibilidade (banco + aplicações + recebíveis) do dia anterior, filtrada
  // pelas mesmas lojas selecionadas — pra comparar igual com igual.
  const disponibilidadeAtual = kpi.total + kpi.recebiveis
  const disponibilidadeAnterior = useMemo(() => {
    if (!dataAnteriorPayload) return null
    const idsVisiveis = new Set(linhasFiltradas.map((l) => l.unidade))
    return (dataAnteriorPayload.por_loja ?? [])
      .filter((l) => idsVisiveis.has(l.unidade))
      .reduce((acc, l) => acc + l.total + l.recebiveis, 0)
  }, [dataAnteriorPayload, linhasFiltradas])

  const variacaoDisponibilidade = disponibilidadeAnterior != null ? disponibilidadeAtual - disponibilidadeAnterior : null
  const variacaoDisponibilidadePct = disponibilidadeAnterior != null && disponibilidadeAnterior !== 0
    ? (variacaoDisponibilidade! / disponibilidadeAnterior) * 100
    : null

  const datasDisponiveis = data?.datas_disponiveis ?? []
  const minData = datasDisponiveis.length ? [...datasDisponiveis].sort()[0] : undefined
  const maxData = datasDisponiveis.length ? [...datasDisponiveis].sort().reverse()[0] : undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#FAFAF8', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Voltar ao HUB */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Financeiro — Saldo de Bancos</span>
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
            Saldo de Bancos
          </h1>
          {data?.ultima_data && !dataFim && (
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              Última atualização: {formatarData(data.ultima_data)}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Período: Início -> Fim */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#F7F7F7', borderRadius: 99, padding: '2px 10px' }}>
            <span style={{ fontSize: 11.5, color: '#888', whiteSpace: 'nowrap' }}>Período:</span>
            <input
              type="date"
              value={dataInicio}
              min={minData}
              max={dataFim || maxData}
              onChange={(e) => setDataInicio(e.target.value)}
              style={dateInputStyle(!!dataInicio)}
            />
            <span style={{ fontSize: 11, color: '#BBB' }}>→</span>
            <input
              type="date"
              value={dataFim}
              min={dataInicio || minData}
              max={maxData}
              onChange={(e) => setDataFim(e.target.value)}
              style={dateInputStyle(!!dataFim)}
            />
            {(dataInicio || dataFim) && (
              <button
                onClick={() => { setDataInicio(''); setDataFim('') }}
                title="Limpar período"
                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', padding: 2 }}
              >
                <X size={13} color="#999" />
              </button>
            )}
          </div>

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
            <KpiCard
              label={dataFim ? `Saldo em ${formatarData(dataFim)}` : 'Saldo Total'}
              valor={formatarMoeda(kpi.total)}
              subtitulo="Saldo em banco + Aplicações"
            />
            <KpiCard label="Saldo em Banco" valor={formatarMoeda(kpi.banco)} />
            <KpiCard label="Aplicações" valor={formatarMoeda(kpi.aplicacoes)} />
            <KpiCard label="Recebíveis em Aberto" valor={formatarMoeda(kpi.recebiveis)} />
            <KpiCard
              label="Disponibilidade"
              valor={formatarMoeda(disponibilidadeAtual)}
              subtitulo={
                diaAnterior
                  ? disponibilidadeAnterior != null
                    ? `${variacaoDisponibilidade! >= 0 ? '+' : ''}${formatarMoeda(variacaoDisponibilidade)} (${variacaoDisponibilidadePct != null ? variacaoDisponibilidadePct.toFixed(1) + '%' : '—'}) vs ${formatarData(diaAnterior)}`
                    : 'Calculando vs dia anterior...'
                  : 'Saldo em banco + Aplicações + Recebíveis'
              }
              subtituloColor={disponibilidadeAnterior != null ? (variacaoDisponibilidade! >= 0 ? '#4F8A10' : '#C0392B') : undefined}
            />
          </div>

          {/* VARIAÇÕES */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            {periodoAtivo ? (
              loadingInicio ? (
                <CardIndisponivel label="Variação no Período" motivo="Calculando..." />
              ) : variacaoPeriodo != null ? (
                <KpiCard
                  label="Variação no Período"
                  valor={`${variacaoPeriodo >= 0 ? '+' : ''}${formatarMoeda(variacaoPeriodo)}`}
                  subtitulo={`${variacaoPeriodoPct != null ? variacaoPeriodoPct.toFixed(1) + '%' : '—'} de ${formatarData(dataInicio)} até ${formatarData(dataFim || data.ultima_data)}`}
                  subtituloColor={variacaoPeriodo >= 0 ? '#4F8A10' : '#C0392B'}
                />
              ) : (
                <CardIndisponivel label="Variação no Período" motivo="Sem dado suficiente" />
              )
            ) : data.vs_mes_anterior && lojaFiltro === 'Todas' ? (
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
            <CardIndisponivel label="Caixa Projetado" motivo="Ainda não implementado" />
          </div>

          {/* RESUMO POR LOJA — cards expansíveis, mesmo padrão do Faturamento */}
          <div className="space-y-3">
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>Resumo por Loja</div>
            {lojasOrdenadas.map((loja) => (
              <CardLoja
                key={loja.unidade}
                loja={loja}
                nome={nomeLoja(loja)}
                cor={corParaUnidade(loja.unidade)}
                expandido={expandido === loja.unidade}
                onToggle={() => setExpandido(expandido === loja.unidade ? null : loja.unidade)}
                delta={periodoAtivo && totaisInicio[loja.unidade] != null ? loja.total - totaisInicio[loja.unidade] : null}
              />
            ))}
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
