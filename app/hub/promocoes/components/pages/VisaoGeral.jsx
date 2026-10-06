// app/hub/promocoes/components/pages/VisaoGeral.jsx
'use client'

import { useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { total, derivar, fatTotalPeriodo, mesAnterior, corCmv } from '../../data/modelo'
import { Card, Kpi, Aviso, brl, brlK, pct, pp, num, varPct, mesLabel } from '../ui'
import DetalheSeparado from '../DetalheSeparado'

export default function VisaoGeral({ dados, filtros }) {
  const { pacotes, consumoMes, fatTotal, meses, unidades, ultimoFechado } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const idx = meses.indexOf(mes)
  const mesesTabela = meses.slice(Math.max(0, idx - 2), idx + 1)
  const parcial = (m) => m === ultimoFechado.slice(0, 7)

  // Total por mês (KPIs + gráfico)
  const porMes = useMemo(() => {
    const out = {}
    for (const m of meses) {
      const ft = fatTotalPeriodo(fatTotal, units, { mes: m })
      out[m] = derivar(total(pacotes, consumoMes, { units, mes: m }), ft)
    }
    return out
  }, [pacotes, consumoMes, fatTotal, meses, units.join(',')])

  const atual = porMes[mes]
  const ant = parcial(mes) ? null : porMes[mesAnterior(mes)]
  if (!atual) return null

  const serie = meses.map((m) => ({ mes: mesLabel(m) + (parcial(m) ? '*' : ''), fat: porMes[m].fat, peso: porMes[m].peso, cmv: porMes[m].cmv }))

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand-black">Visão geral — {mesLabel(mes)}{parcial(mes) ? ' (parcial)' : ''}</h1>
        <p className="text-xs text-zinc-400">
          {filtros.unidade ? unidades.find((u) => u.id === filtros.unidade)?.label : 'Rede'} · todas as promoções
          {parcial(mes) && ` · dados até ${ultimoFechado.split('-').reverse().join('/')}`}
        </p>
      </div>

      {atual.cobertura != null && atual.cobertura < 0.95 && (
        <Aviso>{pct(1 - atual.cobertura)} dos itens consumidos em promoção não têm custo na ficha técnica — o CMV está subestimado. Veja quais na Conferência.</Aviso>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        <Kpi label="Faturamento promoções" valor={brlK(atual.fat)}
          sub={ant ? `${varPct(atual.fat, ant.fat) >= 0 ? '▲' : '▼'} ${pct(Math.abs(varPct(atual.fat, ant.fat) ?? 0))} vs ${mesLabel(mesAnterior(mes))}` : parcial(mes) ? 'mês em andamento' : null} />
        <Kpi label="CMV promoções" valor={pct(atual.cmv)} corValor={corCmv(atual.cmv)}
          sub={`custo ${brlK(atual.custo)}${atual.cobertura != null ? ` · cobertura ${pct(atual.cobertura)}` : ''}`} />
        <Kpi label="Peso no faturamento" valor={pct(atual.peso)}
          sub={atual.fatTotal != null ? `de ${brlK(atual.fatTotal)}${ant?.peso != null && atual.peso != null ? ` · ${pp(atual.peso - ant.peso)}` : ''}` : 'sem faturamento total'} />
        <Kpi label="Pessoas" valor={num(atual.pessoas)} sub={ant?.pessoas ? `mês ant. ${num(ant.pessoas)}` : null} />
        <Kpi label="Ticket médio" valor={brl(atual.ticket)} sub={ant?.ticket ? `mês ant. ${brl(ant.ticket)}` : null} />
        <Kpi label="Margem bruta" valor={brlK(atual.usos ? atual.margem : null)}
          sub={atual.margemPessoa != null && atual.usos ? `${brl(atual.margemPessoa)} por pessoa` : null}
          corValor={atual.usos && atual.margem < 0 ? '#8C1414' : undefined} />
      </div>

      <Card titulo="Evolução mensal — faturamento (barras), peso e CMV (linhas)">
        <div style={{ width: '100%', height: 250 }}>
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

      <Card titulo={`Pacotes e promoções — ${mesLabel(mes)}`}>
        <DetalheSeparado dados={dados} filtro={{ units, mes }} />
      </Card>

      <p className="text-[11px] text-zinc-400">
        Receita e pessoas: relatório de Pacotes da ZIG (Faturamento + Emissão de NF). Custo: itens consumidos nas promoções (Promoções Utilizadas) × ficha técnica.
        CMV = custo de todas as promoções ÷ receita de todos os pacotes (+ o que o cliente pagou nas promoções de desconto). Peso: receita ÷ faturamento total da casa (canal CASA).
      </p>
    </div>
  )
}
