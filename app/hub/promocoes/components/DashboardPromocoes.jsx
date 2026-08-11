// app/hub/promocoes/components/DashboardPromocoes.jsx
'use client'

import { useMemo, useState } from 'react'
import { usePromocoesData } from '../data/usePromocoesData'

const brlK = (v) => { const n = v || 0; return Math.abs(n) >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : `R$ ${n.toFixed(1)}` }
const brl = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (v) => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—')
const num = (v) => (isFinite(v) ? Math.round(v).toLocaleString('pt-BR') : '—')

function corDelta(v, invertido) {
  if (!isFinite(v) || v === 0) return 'text-zinc-400'
  const positivo = invertido ? v < 0 : v > 0
  return positivo ? 'text-brand-olive' : 'text-brand-crimson'
}

export const TOTAL_PROMOCOES = 'Total de Promoções'
export const CATEGORIAS_BASE = ['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes']
export const CATEGORIAS_LINHA = [...CATEGORIAS_BASE, TOTAL_PROMOCOES, 'Sem Promos']

function KpiCard({ label, value, sub, ok, icon }) {
  return (
    <div className="bg-white border border-surface-border rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</p>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <p className="text-[26px] font-bold text-brand-black leading-none tracking-tight">{value}</p>
      {sub && (
        <p className={`text-[12px] mt-1.5 font-medium ${ok === true ? 'text-brand-olive' : ok === false ? 'text-brand-crimson' : 'text-zinc-400'}`}>
          {sub}
        </p>
      )}
    </div>
  )
}

// Hook compartilhado (Dashboard + Resumo das Casas + Análise Diária usam a mesma agregação)
export function useResumoMensal() {
  const { dados, dadosDiarios, loading, erro, ALL_UNIT_IDS, labelForUnit } = usePromocoesData()

  const meses = useMemo(() => {
    if (!dados) return []
    const set = new Set()
    Object.values(dados).forEach(porMes => Object.keys(porMes).forEach(m => set.add(m)))
    return Array.from(set).sort()
  }, [dados])

  function agregarPorUnidades(unitIds, mesesAlvo) {
    const resultado = {}
    for (const mes of mesesAlvo) {
      const acc = {
        faturamento: Object.fromEntries(CATEGORIAS_LINHA.map(c => [c, 0])),
        pessoas: Object.fromEntries(CATEGORIAS_LINHA.map(c => [c, 0])),
        custoTotal: Object.fromEntries(CATEGORIAS_LINHA.map(c => [c, 0])),
        faturamentoTotal: 0,
      }
      for (const unitId of unitIds) {
        const slot = dados?.[unitId]?.[mes]
        if (!slot) continue
        acc.faturamentoTotal += slot.faturamentoTotal || 0
        for (const cat of CATEGORIAS_BASE) {
          acc.faturamento[cat] += slot.faturamento[cat] || 0
          acc.pessoas[cat] += slot.pessoas[cat] || 0
          acc.custoTotal[cat] += slot.custoTotal[cat] || 0
        }
      }
      // Total de Promoções = soma de TODAS as categorias de promoção/pacote —
      // aparece em toda análise (Faturamento, CMV, Peso, Pessoas, Ticket Médio)
      acc.faturamento[TOTAL_PROMOCOES] = CATEGORIAS_BASE.reduce((s, c) => s + acc.faturamento[c], 0)
      acc.pessoas[TOTAL_PROMOCOES] = CATEGORIAS_BASE.reduce((s, c) => s + acc.pessoas[c], 0)
      acc.custoTotal[TOTAL_PROMOCOES] = CATEGORIAS_BASE.reduce((s, c) => s + acc.custoTotal[c], 0)
      acc.faturamento['Sem Promos'] = Math.max(0, acc.faturamentoTotal - acc.faturamento[TOTAL_PROMOCOES])
      resultado[mes] = acc
    }
    return resultado
  }

  return { dados, dadosDiarios, loading, erro, ALL_UNIT_IDS, labelForUnit, meses, agregarPorUnidades }
}

export default function DashboardPromocoes() {
  const { loading, erro, ALL_UNIT_IDS, labelForUnit, meses, agregarPorUnidades } = useResumoMensal()
  const [unidadeSelecionada, setUnidadeSelecionada] = useState('rede')

  const mesesExibidos = meses.slice(-3)
  const unidadesParaSomar = unidadeSelecionada === 'rede' ? ALL_UNIT_IDS : [unidadeSelecionada]
  const dadosAgregados = useMemo(
    () => agregarPorUnidades(unidadesParaSomar, mesesExibidos),
    [unidadesParaSomar.join(','), mesesExibidos.join(',')]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-24">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-brand-olive border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-zinc-400">Carregando dados de promoções...</p>
        </div>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="flex items-center justify-center h-full p-12 text-center">
        <div>
          <p className="text-4xl mb-4">⚠️</p>
          <p className="font-semibold text-brand-black mb-2">Erro ao carregar dados</p>
          <p className="text-sm text-zinc-400 max-w-md">{erro}</p>
        </div>
      </div>
    )
  }

  if (!mesesExibidos.length) {
    return <div className="p-6 text-sm text-zinc-400">Nenhum dado disponível ainda.</div>
  }

  const mesAtual = mesesExibidos[mesesExibidos.length - 1]
  const mesAnterior = mesesExibidos.length > 1 ? mesesExibidos[mesesExibidos.length - 2] : null
  const dAtual = dadosAgregados[mesAtual]
  const dAnterior = mesAnterior ? dadosAgregados[mesAnterior] : null

  const totalPromocoesAtual = dAtual.faturamento[TOTAL_PROMOCOES]
  const pesoAtual = dAtual.faturamentoTotal ? totalPromocoesAtual / dAtual.faturamentoTotal : 0
  const pesoAnterior = dAnterior?.faturamentoTotal ? dAnterior.faturamento[TOTAL_PROMOCOES] / dAnterior.faturamentoTotal : null
  const deltaPeso = pesoAnterior != null ? pesoAtual - pesoAnterior : null

  const custoTotalAtual = dAtual.custoTotal[TOTAL_PROMOCOES]
  const cmvMedioAtual = totalPromocoesAtual ? custoTotalAtual / totalPromocoesAtual : 0

  const pessoasAtual = dAtual.pessoas[TOTAL_PROMOCOES]

  function linhaMetrica(label, getValor, formatador, invertido, destaque) {
    return (
      <tr key={label} className={`border-t border-zinc-100 ${destaque ? 'bg-zinc-50/70' : ''}`}>
        <td className={`py-1.5 px-3 ${destaque ? 'font-bold' : 'font-medium'} text-brand-black`}>{label}</td>
        {mesesExibidos.map((mes, idx) => {
          const valor = getValor(dadosAgregados[mes])
          const anterior = idx > 0 ? getValor(dadosAgregados[mesesExibidos[idx - 1]]) : null
          const delta = anterior != null && anterior !== 0 ? (valor - anterior) / anterior : null
          return (
            <td key={mes} className={`py-1.5 px-3 text-right font-mono tabular-nums ${destaque ? 'font-bold' : ''}`}>
              {formatador(valor)}
              {delta != null && (
                <div className={`text-[10.5px] font-normal ${corDelta(delta, invertido)}`}>
                  {delta > 0 ? '+' : ''}{pct(delta)}
                </div>
              )}
            </td>
          )
        })}
      </tr>
    )
  }

  function secao(titulo) {
    return (
      <tr key={titulo}>
        <td colSpan={mesesExibidos.length + 1} className="pt-4 pb-1 px-3 text-[11px] font-bold tracking-wide text-zinc-400 uppercase">
          {titulo}
        </td>
      </tr>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Resumo Mensal — Promoções</h1>
          <p className="text-xs text-zinc-400">Comparativo dos últimos {mesesExibidos.length} meses fechados</p>
        </div>
        <select
          value={unidadeSelecionada}
          onChange={(e) => setUnidadeSelecionada(e.target.value)}
          className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white"
        >
          <option value="rede">Rede (todas as unidades)</option>
          {ALL_UNIT_IDS.map(id => (
            <option key={id} value={id}>{labelForUnit(id)}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Faturamento em Promoções" value={brlK(totalPromocoesAtual)} icon="🎟️"
          sub={deltaPeso != null ? `${deltaPeso > 0 ? '+' : ''}${pct(deltaPeso)} peso vs mês anterior` : null}
          ok={deltaPeso != null ? deltaPeso <= 0 : null}
        />
        <KpiCard label="Peso sobre Faturamento Total" value={pct(pesoAtual)} icon="⚖️" />
        <KpiCard label="CMV Médio das Promoções" value={pct(cmvMedioAtual)} icon="🥩"
          sub={cmvMedioAtual >= 0.8 ? 'Crítico' : cmvMedioAtual >= 0.35 ? 'Atenção' : 'Dentro da meta'}
          ok={cmvMedioAtual < 0.35 ? true : cmvMedioAtual >= 0.8 ? false : null}
        />
        <KpiCard label="Pessoas Atendidas" value={num(pessoasAtual)} icon="👥" />
      </div>

      <div className="overflow-x-auto bg-white border border-surface-border rounded-xl">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-right text-[11px] text-zinc-400 uppercase">
              <th className="py-2.5 px-3 text-left">Categoria</th>
              {mesesExibidos.map(mes => <th key={mes} className="py-2.5 px-3">{mes}</th>)}
            </tr>
          </thead>
          <tbody>
            {secao('Faturamento')}
            {CATEGORIAS_LINHA.map(cat => linhaMetrica(cat, (d) => d?.faturamento[cat] ?? 0, brl, false, cat === TOTAL_PROMOCOES))}

            {secao('CMV (estimado)')}
            {[...CATEGORIAS_BASE, TOTAL_PROMOCOES].map(cat =>
              linhaMetrica(cat, (d) => (d?.faturamento[cat] ? (d.custoTotal[cat] || 0) / d.faturamento[cat] : 0), pct, true, cat === TOTAL_PROMOCOES)
            )}

            {secao('Peso das Promoções (% do faturamento total)')}
            {[...CATEGORIAS_BASE, TOTAL_PROMOCOES].map(cat =>
              linhaMetrica(cat, (d) => (d?.faturamentoTotal ? d.faturamento[cat] / d.faturamentoTotal : 0), pct, false, cat === TOTAL_PROMOCOES)
            )}

            {secao('Nº de Pessoas')}
            {[...CATEGORIAS_BASE, TOTAL_PROMOCOES].map(cat =>
              linhaMetrica(cat, (d) => d?.pessoas[cat] ?? 0, num, false, cat === TOTAL_PROMOCOES)
            )}

            {secao('Ticket Médio')}
            {[...CATEGORIAS_BASE, TOTAL_PROMOCOES].map(cat =>
              linhaMetrica(cat, (d) => (d?.pessoas[cat] ? d.faturamento[cat] / d.pessoas[cat] : 0), brl, false, cat === TOTAL_PROMOCOES)
            )}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-zinc-400">
        CMV estimado cruza o produto consumido (Promoções Utilizadas) com o custo unitário do catálogo de rede, e o faturamento soma vendas de caixa + notas emitidas — pode variar um pouco do CMV real por loja.
      </p>
    </div>
  )
}
