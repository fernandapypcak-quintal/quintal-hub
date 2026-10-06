// app/hub/promocoes/components/pages/AnaliseDiaria.jsx
'use client'

import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'
import { labelForUnit } from '@/lib/units'
import { CMV_META } from '@/lib/promocoesConfig'
import { agrupar, derivar, fatTotalPeriodo, total } from '../../data/modelo'
import { Card, Kpi, Aviso, TabelaOrdenavel, COLS_METRICAS, brl, brlK, pct, mesLabel, dataBR, diaSemana } from '../ui'

export default function AnaliseDiaria({ dados, filtros }) {
  const { pacotes, consumoDia, fatTotal, unidades, nomes, categoriaDaChave, status } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const categoria = filtros.categoria || undefined
  const [aberta, setAberta] = useState(null)

  const dias = useMemo(() => {
    const g = agrupar(pacotes, consumoDia, { units, mes, categoria }, (r) => r.data || '')
    return [...g.entries()].filter(([d]) => d)
      .map(([data, a]) => ({ data, ...derivar(a, fatTotalPeriodo(fatTotal, units, { data })) }))
      .sort((a, b) => a.data.localeCompare(b.data))
  }, [pacotes, consumoDia, fatTotal, units.join(','), mes, categoria])

  const diarioAte = status?.diarioAte
  const diasSemCusto = dias.filter((d) => d.fat > 0 && !d.usos && (!diarioAte || d.data > diarioAte)).length

  const comCusto = dias.filter((d) => d.usos > 0)
  const fatCC = comCusto.reduce((s, d) => s + d.fat, 0)
  const custoCC = comCusto.reduce((s, d) => s + d.custo, 0)
  const melhorMargem = comCusto.reduce((m, d) => (!m || d.margem > m.margem ? d : m), null)
  const piorCmv = comCusto.filter((d) => d.cmv != null).reduce((m, d) => (!m || d.cmv > m.cmv ? d : m), null)

  // Média por dia da semana no mês
  const ordemDow = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const semana = ordemDow.map((k) => {
    const ds = dias.filter((d) => diaSemana(d.data) === k)
    if (!ds.length) return null
    const fat = ds.reduce((s, d) => s + d.fat, 0)
    const custoDs = ds.filter((d) => d.usos)
    const fatC = custoDs.reduce((s, d) => s + d.fat, 0)
    const custo = custoDs.reduce((s, d) => s + d.custo, 0)
    const ft = ds.reduce((s, d) => s + (d.fatTotal || 0), 0)
    const pessoas = ds.reduce((s, d) => s + d.pessoas, 0)
    return {
      dia: k, n: ds.length,
      fatMedio: fat / ds.length,
      peso: ft ? fat / ft : null,
      pessoasMedia: pessoas / ds.length,
      ticket: pessoas ? fat / pessoas : null,
      cmv: fatC ? custo / fatC : null,
      margemMedia: custoDs.length ? (fatC - custo) / custoDs.length : null,
    }
  }).filter(Boolean)

  const grafico = dias.map((d) => ({ dia: `${d.data.slice(8)} ${diaSemana(d.data)}`, fat: d.fat, peso: d.peso, cmv: d.cmv }))

  const colunas = [
    { id: 'data', label: 'Dia', align: 'left', valor: (d) => d.data, render: (d) => <span className="font-semibold text-brand-black">{dataBR(d.data)} <span className="text-zinc-400 font-normal">{diaSemana(d.data)}</span></span> },
    COLS_METRICAS.fatTotal,
    COLS_METRICAS.fat,
    COLS_METRICAS.peso,
    COLS_METRICAS.pessoas,
    COLS_METRICAS.ticket,
    COLS_METRICAS.custo,
    COLS_METRICAS.cmv,
    COLS_METRICAS.margem,
    COLS_METRICAS.status,
  ]

  function detalhe(d) {
    const ft = d.fatTotal
    const g = agrupar(pacotes, consumoDia, { units, data: d.data, categoria }, (r) => r.chave)
    const promos = [...g.entries()].map(([k, a]) => ({ chave: k, nome: nomes.get(k) || k, categoria: categoriaDaChave.get(k) || '—', ...derivar(a, ft) }))
    const porCasa = units.length > 1
      ? [...agrupar(pacotes, consumoDia, { units, data: d.data, categoria }, (r) => r.unit).entries()]
          .map(([u, a]) => ({ unit: u, nome: labelForUnit(u), ...derivar(a, fatTotalPeriodo(fatTotal, [u], { data: d.data })) }))
      : []
    return (
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <div className="bg-white rounded-lg border border-zinc-100 p-2 xl:col-span-2">
          <TabelaOrdenavel
            colunas={[
              { id: 'nome', label: 'Promoção', align: 'left', valor: (x) => x.nome, className: 'font-medium max-w-[240px] truncate' },
              { id: 'categoria', label: 'Categoria', align: 'left', valor: (x) => x.categoria, className: 'text-zinc-500' },
              COLS_METRICAS.fat, COLS_METRICAS.pessoas, COLS_METRICAS.ticket, COLS_METRICAS.cmv, COLS_METRICAS.margem, COLS_METRICAS.status,
            ]}
            linhas={promos} chave={(x) => x.chave} ordemInicial={{ id: 'fat', dir: 'desc' }}
          />
        </div>
        {porCasa.length > 0 && (
          <div className="bg-white rounded-lg border border-zinc-100 p-2">
            <TabelaOrdenavel
              colunas={[{ id: 'nome', label: 'Casa', align: 'left', valor: (x) => x.nome }, COLS_METRICAS.fat, COLS_METRICAS.peso, COLS_METRICAS.cmv]}
              linhas={porCasa} chave={(x) => x.unit} ordemInicial={{ id: 'fat', dir: 'desc' }}
            />
          </div>
        )}
      </div>
    )
  }

  const totMes = derivar(total(pacotes, consumoDia, { units, mes, categoria }), null)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand-black">Análise diária — {mesLabel(mes)}</h1>
        <p className="text-xs text-zinc-400">{filtros.unidade ? labelForUnit(filtros.unidade) : 'Rede'} · {categoria || 'todas as promoções'} · clique num dia pra ver as promoções</p>
      </div>

      {diasSemCusto > 0 && (
        <Aviso>
          {diasSemCusto} dia(s) com pacote vendido ainda sem custo — o pipeline diário está processado até {diarioAte ? dataBR(diarioAte) : '—'}.
        </Aviso>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="CMV dos dias com custo" valor={pct(fatCC ? custoCC / fatCC : null)} sub={`${comCusto.length}/${dias.length} dias`} />
        <Kpi label="Margem bruta no mês" valor={brlK(comCusto.length ? fatCC - custoCC : null)} sub={totMes.pessoas ? `${brlK(totMes.fat)} faturados` : null} />
        <Kpi label="Melhor dia (margem)" valor={melhorMargem ? `${dataBR(melhorMargem.data).slice(0, 5)} ${diaSemana(melhorMargem.data)}` : '—'} sub={melhorMargem ? brl(melhorMargem.margem) : null} />
        <Kpi label="Pior dia (CMV)" valor={piorCmv ? `${dataBR(piorCmv.data).slice(0, 5)} ${diaSemana(piorCmv.data)}` : '—'} sub={piorCmv ? `CMV ${pct(piorCmv.cmv)}` : null} corSub={piorCmv ? '#8C1414' : undefined} />
      </div>

      <Card titulo="Faturamento das promoções (barras), peso e CMV (linhas)">
        <div style={{ width: '100%', height: 270 }}>
          <ResponsiveContainer>
            <ComposedChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={brlK} width={58} />
              <YAxis yAxisId="p" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={pct} width={44} />
              <Tooltip formatter={(v, n) => (n === 'Faturamento' ? brl(v) : pct(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="p" y={CMV_META} stroke="#97A624" strokeDasharray="4 4" />
              <Bar yAxisId="r" dataKey="fat" name="Faturamento" fill="#9A3412" radius={[3, 3, 0, 0]} />
              <Line yAxisId="p" dataKey="peso" name="Peso" stroke="#97A624" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line yAxisId="p" dataKey="cmv" name="CMV" stroke="#8C1414" strokeWidth={2} dot={{ r: 2 }} connectNulls />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10.5px] text-zinc-400">Linha tracejada = meta de CMV ({pct(CMV_META)}).</p>
      </Card>

      <Card titulo="Média por dia da semana">
        <TabelaOrdenavel
          colunas={[
            { id: 'dia', label: 'Dia', align: 'left', valor: (x) => x.dia, className: 'font-semibold' },
            { id: 'n', label: 'Dias no mês', valor: (x) => x.n },
            { id: 'fatMedio', label: 'Fat. promo médio', valor: (x) => x.fatMedio, render: (x) => brl(x.fatMedio) },
            { id: 'peso', label: 'Peso', valor: (x) => x.peso, render: (x) => pct(x.peso) },
            { id: 'pessoasMedia', label: 'Pessoas/dia', valor: (x) => x.pessoasMedia, render: (x) => Math.round(x.pessoasMedia).toLocaleString('pt-BR') },
            { id: 'ticket', label: 'Ticket', valor: (x) => x.ticket, render: (x) => brl(x.ticket) },
            COLS_METRICAS.cmv,
            { id: 'margemMedia', label: 'Margem média/dia', valor: (x) => x.margemMedia, render: (x) => brl(x.margemMedia) },
          ]}
          linhas={semana} chave={(x) => x.dia} ordemInicial={{ id: 'fatMedio', dir: 'desc' }}
        />
      </Card>

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas}
          linhas={dias}
          chave={(d) => d.data}
          ordemInicial={{ id: 'data', dir: 'asc' }}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))}
          aberta={aberta}
          renderDetalhe={detalhe}
        />
      </Card>
    </div>
  )
}
