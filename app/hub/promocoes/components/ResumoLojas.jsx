// app/hub/promocoes/components/ResumoLojas.jsx
'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useResumoMensal, CATEGORIAS_LINHA, CATEGORIAS_BASE, TOTAL_PROMOCOES } from './DashboardPromocoes'

const brlK = (v) => { const n = v || 0; return Math.abs(n) >= 1000 ? `R$ ${(n / 1000).toFixed(1)}k` : `R$ ${n.toFixed(1)}` }
const brl = (v) => (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 1, maximumFractionDigits: 1 })
const pct = (v) => (isFinite(v) ? (v * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%' : '—')
const num = (v) => (isFinite(v) ? Math.round(v).toLocaleString('pt-BR') : '—')

// Uma cor por loja, na mesma linha do "Por Loja" do Faturamento (cores variadas por card)
const PALETA_CORES = ['#6d28d9', '#65a30d', '#52525b', '#ea580c', '#0369A1', '#8C1414', '#9A3412', '#0891b2', '#a16207', '#4d7c0f', '#be185d']

function corStatus(cmvPct) {
  if (!isFinite(cmvPct)) return '#9ca3af'
  if (cmvPct >= 0.80) return '#8C1414'
  if (cmvPct >= 0.35) return '#D9B504'
  return '#97A624'
}

function calcularKpisLoja(agregadoMes) {
  const totalPacotes = agregadoMes.faturamento[TOTAL_PROMOCOES]
  const peso = agregadoMes.faturamentoTotal ? totalPacotes / agregadoMes.faturamentoTotal : 0
  const custoTotal = CATEGORIAS_BASE.reduce((s, c) => s + agregadoMes.custoTotal[c], 0)
  const cmv = totalPacotes ? custoTotal / totalPacotes : 0
  const pessoas = CATEGORIAS_BASE.reduce((s, c) => s + agregadoMes.pessoas[c], 0)
  return { totalPacotes, peso, cmv, pessoas }
}

function CardLoja({ unitId, nome, cor, mesAtual, mesAnterior, agregarPorUnidades, todosMeses }) {
  const [aberto, setAberto] = useState(false)

  const agregadoAtual = useMemo(() => agregarPorUnidades([unitId], [mesAtual])[mesAtual], [unitId, mesAtual])
  const agregadoAnterior = useMemo(
    () => (mesAnterior ? agregarPorUnidades([unitId], [mesAnterior])[mesAnterior] : null),
    [unitId, mesAnterior]
  )

  const kpisAtual = calcularKpisLoja(agregadoAtual)
  const kpisAnterior = agregadoAnterior ? calcularKpisLoja(agregadoAnterior) : null
  const deltaFaturamento = kpisAnterior?.totalPacotes ? (kpisAtual.totalPacotes - kpisAnterior.totalPacotes) / kpisAnterior.totalPacotes : null

  // Evolução mensal (histórico completo disponível) — só calcula quando o card abre
  const historico = useMemo(() => {
    if (!aberto) return []
    const agregadoTodos = agregarPorUnidades([unitId], todosMeses)
    return todosMeses.map(m => ({
      mes: m.slice(2), // "26-07" fica mais compacto
      faturamento: agregadoTodos[m]?.faturamento[TOTAL_PROMOCOES] || 0,
    }))
  }, [aberto, unitId, todosMeses.join(',')])

  return (
    <div className="bg-white border border-surface-border rounded-xl overflow-hidden" style={{ borderLeft: `4px solid ${cor}` }}>
      <button
        onClick={() => setAberto(a => !a)}
        className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50/60 transition-colors"
      >
        <div className="flex items-center gap-6 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: cor }}>{nome}</p>
            <p className="text-xl font-bold text-brand-black leading-tight">{brlK(kpisAtual.totalPacotes)}</p>
          </div>

          <div className="hidden sm:block">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Δ vs mês anterior</p>
            <p className={`text-sm font-semibold ${deltaFaturamento == null ? 'text-zinc-400' : deltaFaturamento >= 0 ? 'text-brand-olive' : 'text-brand-crimson'}`}>
              {deltaFaturamento == null ? '—' : `${deltaFaturamento > 0 ? '+' : ''}${pct(deltaFaturamento)}`}
            </p>
          </div>

          <div className="hidden md:block">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Peso</p>
            <p className="text-sm font-semibold text-brand-black">{pct(kpisAtual.peso)}</p>
          </div>

          <div className="hidden md:block">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">CMV</p>
            <p className="text-sm font-semibold" style={{ color: corStatus(kpisAtual.cmv) }}>{pct(kpisAtual.cmv)}</p>
          </div>

          <div className="hidden lg:block">
            <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Pessoas</p>
            <p className="text-sm font-semibold text-brand-black">{num(kpisAtual.pessoas)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden sm:block w-28 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, kpisAtual.cmv * 100)}%`, background: corStatus(kpisAtual.cmv) }} />
          </div>
          {aberto ? <ChevronUp size={16} className="text-zinc-400" /> : <ChevronDown size={16} className="text-zinc-400" />}
        </div>
      </button>

      {aberto && (
        <div className="border-t border-zinc-100 px-5 py-4 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Evolução Mensal — Faturamento em Promoções</p>
            <div style={{ width: '100%', height: 200 }}>
              <ResponsiveContainer>
                <BarChart data={historico}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={brlK} width={50} />
                  <Tooltip formatter={(v) => brl(v)} labelFormatter={(l) => `Mês ${l}`} />
                  <Bar dataKey="faturamento" fill={cor} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-zinc-400 uppercase tracking-wide mb-2">{mesAtual} — Detalhe por Categoria</p>
            <div className="divide-y divide-zinc-100">
              {CATEGORIAS_LINHA.map(cat => {
                const fat = agregadoAtual.faturamento[cat] || 0
                const custo = agregadoAtual.custoTotal?.[cat] || 0
                const cmvCat = fat ? custo / fat : NaN
                const temCmv = CATEGORIAS_BASE.includes(cat)
                return (
                  <div key={cat} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-zinc-600">{cat}</span>
                    <div className="flex items-center gap-4">
                      {temCmv && (
                        <span className="text-xs font-mono" style={{ color: corStatus(cmvCat) }}>{pct(cmvCat)} CMV</span>
                      )}
                      <span className="font-mono font-semibold text-brand-black w-24 text-right">{brl(fat)}</span>
                    </div>
                  </div>
                )
              })}
              <div className="flex items-center justify-between py-2 text-sm font-bold">
                <span className="text-brand-black">Faturamento Total da Loja</span>
                <span className="font-mono text-brand-black">{brl(agregadoAtual.faturamentoTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ResumoLojas() {
  const { loading, erro, ALL_UNIT_IDS, labelForUnit, meses, agregarPorUnidades } = useResumoMensal()
  const [ordenarPor, setOrdenarPor] = useState('peso')
  const [mesSelecionado, setMesSelecionado] = useState(null)

  const mesMaisRecente = meses[meses.length - 1]
  const mes = mesSelecionado || mesMaisRecente
  const idxMes = meses.indexOf(mes)
  const mesAnterior = idxMes > 0 ? meses[idxMes - 1] : null

  const ranking = useMemo(() => {
    if (!mes) return []
    return ALL_UNIT_IDS.map(unitId => {
      const agregado = agregarPorUnidades([unitId], [mes])[mes]
      const kpis = calcularKpisLoja(agregado)
      return { unitId, nome: labelForUnit(unitId), ...kpis, faturamentoTotal: agregado.faturamentoTotal }
    })
  }, [mes, ALL_UNIT_IDS.join(',')])

  const ordenados = useMemo(() => {
    const copia = [...ranking]
    if (ordenarPor === 'faturamento') copia.sort((a, b) => b.faturamentoTotal - a.faturamentoTotal)
    else if (ordenarPor === 'cmv') copia.sort((a, b) => b.cmv - a.cmv)
    else copia.sort((a, b) => b.peso - a.peso)
    return copia
  }, [ranking, ordenarPor])

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

  if (erro) return <div className="p-6 text-sm text-brand-crimson">Erro ao carregar: {erro}</div>
  if (!meses.length) return <div className="p-6 text-sm text-zinc-400">Nenhum dado disponível ainda.</div>

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Resumo das Casas</h1>
          <p className="text-xs text-zinc-400">Clica numa loja pra ver a evolução e o detalhe por categoria — {mes}</p>
        </div>
        <div className="flex gap-2">
          <select value={mes} onChange={(e) => setMesSelecionado(e.target.value)} className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white">
            {meses.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={ordenarPor} onChange={(e) => setOrdenarPor(e.target.value)} className="px-3 py-2 rounded-lg border border-surface-border text-sm bg-white">
            <option value="peso">Ordenar por Peso %</option>
            <option value="faturamento">Ordenar por Faturamento</option>
            <option value="cmv">Ordenar por CMV</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {ordenados.map((l, idx) => (
          <CardLoja
            key={l.unitId}
            unitId={l.unitId}
            nome={l.nome}
            cor={PALETA_CORES[idx % PALETA_CORES.length]}
            mesAtual={mes}
            mesAnterior={mesAnterior}
            agregarPorUnidades={agregarPorUnidades}
            todosMeses={meses}
          />
        ))}
      </div>
    </div>
  )
}
