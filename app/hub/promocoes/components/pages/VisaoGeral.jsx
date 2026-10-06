// app/hub/promocoes/components/pages/VisaoGeral.jsx
'use client'

import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { CATEGORIAS_PROMO } from '@/lib/promocoesConfig'
import { agrupar, total, derivar, fatTotalPeriodo, mesAnterior, corCmv } from '../../data/modelo'
import { Card, Kpi, Aviso, brl, brlK, pct, pp, num, varPct, mesLabel, CmvTxt } from '../ui'

const TOTAL = 'Total de Promoções'

export default function VisaoGeral({ dados, filtros }) {
  const { pacotes, consumoMes, fatTotal, meses, unidades, ultimoFechado } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const categoria = filtros.categoria || undefined
  const mes = filtros.mes
  const idx = meses.indexOf(mes)
  const mesesTabela = meses.slice(Math.max(0, idx - 2), idx + 1)
  const parcial = (m) => m === ultimoFechado.slice(0, 7)

  // Resumo por mês (todas as categorias + total)
  const porMes = useMemo(() => {
    const out = {}
    for (const m of meses) {
      const ft = fatTotalPeriodo(fatTotal, units, { mes: m })
      const grupos = agrupar(pacotes, consumoMes, { units, mes: m }, (r) => r.categoria)
      const cats = {}
      for (const c of CATEGORIAS_PROMO) cats[c] = derivar(grupos.get(c) || total([], [], {}), ft)
      const tot = derivar(total(pacotes, consumoMes, { units, mes: m, categoria }), ft)
      cats[TOTAL] = derivar(total(pacotes, consumoMes, { units, mes: m }), ft)
      out[m] = { cats, filtrado: tot, fatTotal: ft }
    }
    return out
  }, [pacotes, consumoMes, fatTotal, meses, units.join(','), categoria])

  const atual = porMes[mes]?.filtrado
  const ant = porMes[mesAnterior(mes)]?.filtrado

  const serie = meses.map((m) => ({
    mes: mesLabel(m) + (parcial(m) ? '*' : ''),
    fat: porMes[m].filtrado.fat,
    peso: porMes[m].filtrado.peso,
    cmv: porMes[m].filtrado.cmv,
  }))

  if (!atual) return null

  const linha = (label, getter, fmt, destaque = false, cmv = false) => (
    <tr key={label} className={`border-t border-zinc-100 ${destaque ? 'bg-zinc-50/70 font-bold' : ''}`}>
      <td className="py-1.5 px-3 text-left text-brand-black">{label}</td>
      {mesesTabela.map((m, i) => {
        const v = getter(porMes[m])
        const vAnt = i > 0 ? getter(porMes[mesesTabela[i - 1]]) : null
        const d = cmv || fmt === pct ? (v != null && vAnt != null ? v - vAnt : null) : varPct(v, vAnt)
        return (
          <td key={m} className="py-1.5 px-3 text-right font-mono tabular-nums">
            {cmv ? <CmvTxt v={v} /> : fmt(v)}
            {d != null && i > 0 && (
              <div className="text-[10px] font-normal" style={{ color: d === 0 ? '#a1a1aa' : (cmv ? d < 0 : d > 0) ? '#5f6b12' : '#8C1414' }}>
                {cmv || fmt === pct ? pp(d) : `${d > 0 ? '+' : ''}${pct(d)}`}
              </div>
            )}
          </td>
        )
      })}
    </tr>
  )
  const secao = (t) => (
    <tr key={t}><td colSpan={mesesTabela.length + 1} className="pt-4 pb-1 px-3 text-[10.5px] font-bold tracking-wide text-zinc-400 uppercase">{t}</td></tr>
  )
  const cats = [...CATEGORIAS_PROMO, TOTAL]

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand-black">Visão geral — {mesLabel(mes)}{parcial(mes) ? ' (parcial)' : ''}</h1>
        <p className="text-xs text-zinc-400">
          {filtros.unidade ? unidades.find((u) => u.id === filtros.unidade)?.label : 'Rede'}{categoria ? ` · ${categoria}` : ' · todas as promoções'}
          {parcial(mes) && ` · dados até ${ultimoFechado.split('-').reverse().join('/')}`}
        </p>
      </div>

      {atual.cobertura != null && atual.cobertura < 0.95 && (
        <Aviso>
          {pct(1 - atual.cobertura)} dos itens consumidos em promoção não têm custo na ficha técnica — o CMV está subestimado. Veja quais na aba Conferência.
        </Aviso>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Faturamento promoções" valor={brlK(atual.fat)}
          sub={ant ? `${varPct(atual.fat, ant.fat) >= 0 ? '▲' : '▼'} ${pct(Math.abs(varPct(atual.fat, ant.fat) ?? 0))} vs ${mesLabel(mesAnterior(mes))}` : null} />
        <Kpi label="CMV promoções" valor={pct(atual.cmv)} corValor={corCmv(atual.cmv)}
          sub={`custo ${brlK(atual.custo)}${atual.cobertura != null ? ` · cobertura ${pct(atual.cobertura)}` : ''}`} />
        <Kpi label="Peso no faturamento" valor={pct(atual.peso)}
          sub={atual.fatTotal != null ? `de ${brlK(atual.fatTotal)}${ant?.peso != null && atual.peso != null ? ` · ${pp(atual.peso - ant.peso)}` : ''}` : 'sem faturamento total'} />
        <Kpi label="Pessoas" valor={num(atual.pessoas)}
          sub={ant ? `${ant.pessoas ? `${varPct(atual.pessoas, ant.pessoas) >= 0 ? '▲' : '▼'} ${pct(Math.abs(varPct(atual.pessoas, ant.pessoas)))}` : ''} vs mês ant.` : null} />
        <Kpi label="Ticket médio" valor={brl(atual.ticket)}
          sub={ant?.ticket ? `mês ant. ${brl(ant.ticket)}` : null} />
        <Kpi label="Margem bruta" valor={brlK(atual.usos ? atual.margem : null)}
          sub={atual.margemPessoa != null && atual.usos ? `${brl(atual.margemPessoa)} por pessoa` : null}
          corValor={atual.usos && atual.margem < 0 ? '#8C1414' : undefined} />
      </div>

      <Card titulo="Evolução mensal — faturamento (barras), peso e CMV (linhas)">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <ComposedChart data={serie}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={brlK} width={62} />
              <YAxis yAxisId="p" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={pct} width={48} />
              <Tooltip formatter={(v, n) => (n === 'Faturamento' ? brl(v) : pct(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar yAxisId="r" dataKey="fat" name="Faturamento" fill="#9A3412" radius={[4, 4, 0, 0]} />
              <Line yAxisId="p" dataKey="peso" name="Peso" stroke="#97A624" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line yAxisId="p" dataKey="cmv" name="CMV" stroke="#8C1414" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        {serie.some((s) => s.mes.endsWith('*')) && <p className="text-[10.5px] text-zinc-400 mt-1">* mês em andamento</p>}
      </Card>

      <Card titulo="Resumo por categoria" className="overflow-hidden">
        <div className="overflow-x-auto -mx-4">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="text-right text-[10.5px] text-zinc-400 uppercase">
                <th className="py-2 px-3 text-left">Categoria</th>
                {mesesTabela.map((m) => <th key={m} className="py-2 px-3">{mesLabel(m)}{parcial(m) ? '*' : ''}</th>)}
              </tr>
            </thead>
            <tbody>
              {secao('Faturamento')}
              {cats.map((c) => linha(c, (d) => d.cats[c].fat, brl, c === TOTAL))}
              {linha('Sem promoções', (d) => (d.fatTotal != null ? Math.max(0, d.fatTotal - d.cats[TOTAL].fat) : null), brl)}
              {linha('Faturamento total da casa', (d) => d.fatTotal, brl, true)}
              {secao('CMV')}
              {cats.map((c) => linha(c, (d) => d.cats[c].cmv, pct, c === TOTAL, true))}
              {secao('Peso sobre o faturamento total')}
              {cats.map((c) => linha(c, (d) => d.cats[c].peso, pct, c === TOTAL))}
              {secao('Nº de pessoas')}
              {cats.map((c) => linha(c, (d) => d.cats[c].pessoas, num, c === TOTAL))}
              {secao('Ticket médio')}
              {cats.map((c) => linha(c, (d) => d.cats[c].ticket, brl, c === TOTAL))}
              {secao('Margem bruta (faturamento − custo)')}
              {cats.map((c) => linha(c, (d) => (d.cats[c].usos ? d.cats[c].margem : null), brl, c === TOTAL))}
            </tbody>
          </table>
        </div>
      </Card>

      <p className="text-[11px] text-zinc-400">
        Faturamento e pessoas: relatório de Pacotes da ZIG (coluna Faturamento). Custo: itens consumidos nas promoções × custo da ficha técnica.
        Peso: faturamento das promoções ÷ faturamento total da casa (canal CASA, mesma base do dashboard de Faturamento).
      </p>
    </div>
  )
}
