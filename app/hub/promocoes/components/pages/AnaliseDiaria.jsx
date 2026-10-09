// app/hub/promocoes/components/pages/AnaliseDiaria.jsx
// Dia a dia na visão unificada, com filtro por promoção/pacote e por dia.
'use client'

import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'
import { labelForUnit } from '@/lib/units'
import { CMV_META } from '@/lib/promocoesConfig'
import { unificar, totalUnificado, fatTotalPeriodo } from '../../data/modelo'
import { Card, Kpi, Aviso, TabelaOrdenavel, CmvTxt, StatusTag, brl, brlK, pct, num, mesLabel, dataBR, diaSemana } from '../ui'
import TabelaPromocoes from '../TabelaPromocoes'
import { linhaDeTotal } from './Promocoes'

export default function AnaliseDiaria({ dados, filtros }) {
  const { consumoDia, consumoMes, fatTotal, unidades, status } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const [sel, setSel] = useState('')       // chave da promoção/pacote ('' = todas)
  const [selDia, setSelDia] = useState('')
  const [aberta, setAberta] = useState(null)

  // Opções do filtro = linhas unificadas do mês
  const opcoes = useMemo(() => {
    const m = unificar({ ...dados, consumo: consumoMes }, { units, mes })
    return [...m.values()].filter((l) => l.receita > 0 || l.temCusto).sort((a, b) => b.receita - a.receita).map((l) => [l.k, l.nome])
  }, [dados, consumoMes, mes, units.join(',')])
  const nomeSel = sel ? opcoes.find(([k]) => k === sel)?.[1] : null

  // Uma "foto" unificada por dia
  const dias = useMemo(() => {
    const set = new Set()
    for (const p of dados.pacotes) if (p.mes === mes && p.data) set.add(p.data)
    for (const c of consumoDia) if (c.mes === mes && c.data) set.add(c.data)
    return [...set].sort().map((data) => {
      const linhasDia = unificar({ ...dados, consumo: consumoDia }, { units, data })
      const ftDia = fatTotalPeriodo(fatTotal, units, { data })
      const linhas = [...linhasDia.values()].map((l) => ({ ...l, peso: ftDia ? l.receita / ftDia : null }))
      const base = sel ? linhas.filter((l) => l.k === sel) : linhas
      const t = totalUnificado(base, ftDia)
      return { data, linhas, ...t, fatTotal: ftDia, temCusto: t.custo > 0 }
    }).filter((d) => d.receita > 0 || d.custo > 0)
  }, [dados, consumoDia, fatTotal, mes, units.join(','), sel])

  const diasTabela = selDia ? dias.filter((d) => d.data === selDia) : dias
  const comCmv = dias.filter((d) => d.cmv != null)
  const totMes = dias.reduce((t, d) => ({ receita: t.receita + d.receita, custo: t.custo + d.custo }), { receita: 0, custo: 0 })
  const melhor = comCmv.reduce((m, d) => (!m || d.margem > m.margem ? d : m), null)
  const pior = comCmv.reduce((m, d) => (!m || d.cmv > m.cmv ? d : m), null)
  const diaSel = selDia ? dias.find((d) => d.data === selDia) : null

  const ordemDow = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const semana = ordemDow.map((k) => {
    const ds = dias.filter((d) => diaSemana(d.data) === k)
    if (!ds.length) return null
    const receita = ds.reduce((s, d) => s + d.receita, 0)
    const custo = ds.reduce((s, d) => s + d.custo, 0)
    const pessoas = ds.reduce((s, d) => s + d.pessoas, 0)
    const ft = ds.reduce((s, d) => s + (d.fatTotal || 0), 0)
    return { dia: k, n: ds.length, receitaMedia: receita / ds.length, peso: ft ? receita / ft : null, pessoasDia: pessoas / ds.length, cmv: receita && custo ? custo / receita : null, margemDia: (receita - custo) / ds.length }
  }).filter(Boolean)

  const grafico = dias.map((d) => ({ dia: `${d.data.slice(8)} ${diaSemana(d.data)}`, receita: d.receita, cmv: d.cmv, peso: d.peso }))

  const colunas = [
    { id: 'data', label: 'Dia', align: 'left', valor: (d) => d.data, render: (d) => <span className="font-semibold text-brand-black">{dataBR(d.data)} <span className="text-zinc-400 font-normal">{diaSemana(d.data)}</span></span> },
    { id: 'n', label: 'Reservas', valor: (d) => d.n, render: (d) => (d.n ? num(d.n) : '—') },
    { id: 'pessoas', label: 'Pessoas', valor: (d) => d.pessoas, render: (d) => (d.pessoas ? num(d.pessoas) : '—') },
    { id: 'receita', label: 'Faturamento', valor: (d) => d.receita, render: (d) => brl(d.receita) },
    { id: 'custo', label: 'Custo', valor: (d) => d.custo, render: (d) => (d.custo ? brl(d.custo) : '—') },
    { id: 'cmv', label: 'CMV', valor: (d) => d.cmv, render: (d) => <CmvTxt v={d.cmv} /> },
    { id: 'margem', label: 'Margem', valor: (d) => d.margem, render: (d) => <span style={{ color: d.margem < 0 ? '#8C1414' : undefined }}>{brl(d.margem)}</span> },
    { id: 'peso', label: 'Peso', valor: (d) => d.peso, render: (d) => pct(d.peso) },
    { id: 'status', label: 'Status', valor: (d) => d.cmv ?? -1, render: (d) => (d.cmv != null ? <StatusTag d={d} /> : <span className="text-zinc-300">—</span>) },
  ]

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand-black">Análise diária — {mesLabel(mes)}</h1>
        <p className="text-xs text-zinc-400">{filtros.unidade ? labelForUnit(filtros.unidade) : 'Rede'} · {nomeSel || 'todas as promoções e pacotes'} · clique num dia pra ver promoção a promoção</p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <select value={sel} onChange={(e) => { setSel(e.target.value); setAberta(selDia || null) }}
          className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white min-w-[260px]">
          <option value="">Todas as promoções e pacotes</option>
          {opcoes.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
        </select>
        <select value={selDia} onChange={(e) => { setSelDia(e.target.value); setAberta(e.target.value || null) }}
          className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white">
          <option value="">Mês todo</option>
          {dias.map((d) => <option key={d.data} value={d.data}>{dataBR(d.data)} {diaSemana(d.data)}</option>)}
        </select>
        {(sel || selDia) && <button onClick={() => { setSel(''); setSelDia(''); setAberta(null) }} className="text-xs text-zinc-500 underline">limpar filtros</button>}
      </div>

      {status?.diarioAte && <p className="text-[11px] text-zinc-400">Dados coletados até {dataBR(status.diarioAte)}.</p>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {diaSel ? (
          <Kpi label={`CMV em ${dataBR(diaSel.data).slice(0, 5)}`} valor={pct(diaSel.cmv)} sub={`faturamento ${brl(diaSel.receita)} · custo ${brl(diaSel.custo)}`} />
        ) : (
          <Kpi label="CMV no mês" valor={pct(totMes.receita && totMes.custo ? totMes.custo / totMes.receita : null)} sub={`${dias.length} dias`} />
        )}
        <Kpi label="Margem no mês" valor={brlK(totMes.receita - totMes.custo)} sub={`${brlK(totMes.receita)} faturados`} />
        <Kpi label="Melhor dia (margem)" valor={melhor ? `${dataBR(melhor.data).slice(0, 5)} ${diaSemana(melhor.data)}` : '—'} sub={melhor ? brl(melhor.margem) : null} />
        <Kpi label="Pior dia (CMV)" valor={pior ? `${dataBR(pior.data).slice(0, 5)} ${diaSemana(pior.data)}` : '—'} sub={pior ? `CMV ${pct(pior.cmv)}` : null} corSub={pior ? '#8C1414' : undefined} />
      </div>

      <Card titulo="Faturamento (barras), CMV e peso (linhas)">
        <div style={{ width: '100%', height: 260 }}>
          <ResponsiveContainer>
            <ComposedChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="r" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={brlK} width={58} />
              <YAxis yAxisId="p" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={pct} width={44} />
              <Tooltip formatter={(v, n) => (n === 'Faturamento' ? brl(v) : pct(v))} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine yAxisId="p" y={CMV_META} stroke="#97A624" strokeDasharray="4 4" />
              <Bar yAxisId="r" dataKey="receita" name="Faturamento" fill="#9A3412" radius={[3, 3, 0, 0]} />
              <Line yAxisId="p" dataKey="cmv" name="CMV" stroke="#8C1414" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              <Line yAxisId="p" dataKey="peso" name="Peso" stroke="#97A624" strokeWidth={2} dot={{ r: 2 }} connectNulls />
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
            { id: 'receitaMedia', label: 'Faturamento médio', valor: (x) => x.receitaMedia, render: (x) => brl(x.receitaMedia) },
            { id: 'pessoasDia', label: 'Pessoas/dia', valor: (x) => x.pessoasDia, render: (x) => num(x.pessoasDia) },
            { id: 'cmv', label: 'CMV', valor: (x) => x.cmv, render: (x) => <CmvTxt v={x.cmv} /> },
            { id: 'margemDia', label: 'Margem média/dia', valor: (x) => x.margemDia, render: (x) => brl(x.margemDia) },
            { id: 'peso', label: 'Peso', valor: (x) => x.peso, render: (x) => pct(x.peso) },
          ]}
          linhas={semana} chave={(x) => x.dia} ordemInicial={{ id: 'receitaMedia', dir: 'desc' }}
        />
      </Card>

      {dias.length === 0 && <Aviso tom="zinc">Sem movimento {nomeSel ? `de "${nomeSel}" ` : ''}nesse mês.</Aviso>}

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas}
          linhas={diasTabela}
          chave={(d) => d.data}
          ordemInicial={{ id: 'data', dir: 'asc' }}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))}
          aberta={aberta}
          renderDetalhe={(d) => {
            const linhas = sel ? d.linhas.filter((l) => l.k === sel) : d.linhas
            return <div className="bg-white rounded-lg border border-zinc-100"><TabelaPromocoes linhas={linhas} mostrarDias={false} vazia="Nada nesse dia." /></div>
          }}
        />
      </Card>
    </div>
  )
}
