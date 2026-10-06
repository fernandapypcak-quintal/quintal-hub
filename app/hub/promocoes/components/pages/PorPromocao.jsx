// app/hub/promocoes/components/pages/PorPromocao.jsx
'use client'

import { useMemo, useState } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, ReferenceLine } from 'recharts'
import { labelForUnit } from '@/lib/units'
import { CMV_META } from '@/lib/promocoesConfig'
import { agrupar, derivar, fatTotalPeriodo, statusPromo } from '../../data/modelo'
import { Card, Aviso, TabelaOrdenavel, COLS_METRICAS, brl, brlK, pct, num, mesLabel, dataBR, diaSemana } from '../ui'

export default function PorPromocao({ dados, filtros }) {
  const { pacotes, consumoMes, consumoDia, fatTotal, unidades, nomes, categoriaDaChave, fonteCustoMes } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const categoria = filtros.categoria || undefined
  const [busca, setBusca] = useState('')
  const [soProblemas, setSoProblemas] = useState(false)
  const [aberta, setAberta] = useState(null)

  const ftMes = fatTotalPeriodo(fatTotal, units, { mes })

  const linhas = useMemo(() => {
    const g = agrupar(pacotes, consumoMes, { units, mes, categoria }, (r) => r.chave)
    return [...g.entries()].map(([chave, a]) => ({
      chave,
      nome: nomes.get(chave) || chave,
      categoria: categoriaDaChave.get(chave) || '—',
      ...derivar(a, ftMes),
    }))
  }, [pacotes, consumoMes, units.join(','), mes, categoria, ftMes])

  const filtradas = linhas.filter((l) => {
    if (busca && !l.nome.toLowerCase().includes(busca.toLowerCase())) return false
    if (soProblemas && !['atencao', 'critico', 'sem_receita', 'sem_consumo'].includes(statusPromo(l).id)) return false
    return true
  })

  const colunas = [
    { id: 'nome', label: 'Promoção', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black max-w-[260px] truncate' },
    { id: 'categoria', label: 'Categoria', align: 'left', valor: (l) => l.categoria, className: 'text-zinc-500 whitespace-nowrap' },
    { id: 'nDias', label: 'Dias', valor: (l) => l.nDias, render: (l) => num(l.nDias) },
    COLS_METRICAS.pessoas,
    COLS_METRICAS.fat,
    COLS_METRICAS.ticket,
    COLS_METRICAS.custo,
    COLS_METRICAS.cmv,
    COLS_METRICAS.margem,
    COLS_METRICAS.margemPessoa,
    { id: 'peso', label: 'Peso', valor: (l) => l.peso, render: (l) => pct(l.peso) },
    COLS_METRICAS.status,
  ]

  function detalhe(l) {
    const filtroBase = { units, mes, chave: l.chave }
    const porDia = agrupar(pacotes, consumoDia, filtroBase, (r) => r.data || '')
    const dias = [...porDia.entries()].filter(([d]) => d)
      .map(([data, a]) => ({ data, ...derivar(a, fatTotalPeriodo(fatTotal, units, { data })) }))
      .sort((a, b) => a.data.localeCompare(b.data))
    const porCasa = units.length > 1
      ? [...agrupar(pacotes, consumoMes, filtroBase, (r) => r.unit).entries()].map(([u, a]) => ({ unit: u, nome: labelForUnit(u), ...derivar(a, fatTotalPeriodo(fatTotal, [u], { mes })) }))
      : []
    const grafico = dias.map((d) => ({ dia: `${d.data.slice(8)} ${diaSemana(d.data)}`, fat: d.fat, cmv: d.cmv }))

    // Por dia da semana: média por ocorrência
    const dow = {}
    for (const d of dias) {
      const k = diaSemana(d.data)
      dow[k] ??= { dia: k, n: 0, fat: 0, custo: 0, pessoas: 0, usos: 0 }
      dow[k].n++; dow[k].fat += d.fat; dow[k].custo += d.custo; dow[k].pessoas += d.pessoas; dow[k].usos += d.usos
    }
    const ordemDow = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
    const semana = ordemDow.filter((k) => dow[k]).map((k) => {
      const x = dow[k]
      return { ...x, fatMedio: x.fat / x.n, cmv: x.fat && x.usos ? x.custo / x.fat : null, ticket: x.pessoas ? x.fat / x.pessoas : null, margemMedia: x.usos ? (x.fat - x.custo) / x.n : null }
    })

    return (
      <div className="space-y-3">
        {fonteCustoMes[mes] !== 'diario' && (
          <Aviso>O custo dia a dia deste mês ainda está sendo processado pelo pipeline diário — dias sem custo aparecem com CMV "—". O total do mês (linha acima) já usa o relatório mensal.</Aviso>
        )}
        <div className="bg-white rounded-lg border border-zinc-100 p-3">
          <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Dia a dia — faturamento (barras) e CMV (linha)</p>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer>
              <ComposedChart data={grafico}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="r" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={brlK} width={58} />
                <YAxis yAxisId="p" orientation="right" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={pct} width={44} />
                <Tooltip formatter={(v, n) => (n === 'CMV' ? pct(v) : brl(v))} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="p" y={CMV_META} stroke="#97A624" strokeDasharray="4 4" />
                <Bar yAxisId="r" dataKey="fat" name="Faturamento" fill="#9A3412" radius={[3, 3, 0, 0]} />
                <Line yAxisId="p" dataKey="cmv" name="CMV" stroke="#8C1414" strokeWidth={2} dot={{ r: 2 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-zinc-100 p-2">
            <TabelaOrdenavel
              colunas={[
                { id: 'data', label: 'Dia', align: 'left', valor: (d) => d.data, render: (d) => `${dataBR(d.data)} ${diaSemana(d.data)}` },
                COLS_METRICAS.fat, COLS_METRICAS.pessoas, COLS_METRICAS.ticket, COLS_METRICAS.cmv, COLS_METRICAS.margem, COLS_METRICAS.status,
              ]}
              linhas={dias} chave={(d) => d.data} ordemInicial={{ id: 'data', dir: 'asc' }}
            />
          </div>
          <div className="space-y-3">
            <div className="bg-white rounded-lg border border-zinc-100 p-2">
              <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">Média por dia da semana</p>
              <TabelaOrdenavel
                colunas={[
                  { id: 'dia', label: 'Dia', align: 'left', valor: (x) => x.dia },
                  { id: 'n', label: 'Ocorr.', valor: (x) => x.n },
                  { id: 'fatMedio', label: 'Fat. médio', valor: (x) => x.fatMedio, render: (x) => brl(x.fatMedio) },
                  { id: 'ticket', label: 'Ticket', valor: (x) => x.ticket, render: (x) => brl(x.ticket) },
                  COLS_METRICAS.cmv,
                  { id: 'margemMedia', label: 'Margem média', valor: (x) => x.margemMedia, render: (x) => brl(x.margemMedia) },
                ]}
                linhas={semana} chave={(x) => x.dia} ordemInicial={{ id: 'n', dir: 'desc' }}
              />
            </div>
            {porCasa.length > 0 && (
              <div className="bg-white rounded-lg border border-zinc-100 p-2">
                <TabelaOrdenavel
                  colunas={[{ id: 'nome', label: 'Casa', align: 'left', valor: (x) => x.nome }, COLS_METRICAS.fat, COLS_METRICAS.pessoas, COLS_METRICAS.cmv, COLS_METRICAS.margem, COLS_METRICAS.status]}
                  linhas={porCasa} chave={(x) => x.unit} ordemInicial={{ id: 'fat', dir: 'desc' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  const totalFiltradas = filtradas.reduce((s, l) => s + l.fat, 0)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Por promoção — {mesLabel(mes)}</h1>
          <p className="text-xs text-zinc-400">
            {filtros.unidade ? labelForUnit(filtros.unidade) : 'Rede'} · {filtradas.length} promoções · {brl(totalFiltradas)} · clique numa linha pra ver dia a dia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
            <input type="checkbox" checked={soProblemas} onChange={(e) => setSoProblemas(e.target.checked)} /> só com problema
          </label>
          <input
            value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar promoção…"
            className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white w-56"
          />
        </div>
      </div>

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas}
          linhas={filtradas}
          chave={(l) => l.chave}
          ordemInicial={{ id: 'fat', dir: 'desc' }}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))}
          aberta={aberta}
          renderDetalhe={detalhe}
        />
      </Card>

      <p className="text-[11px] text-zinc-400">
        Cada linha junta o pacote (faturamento/pessoas) e a promoção utilizada (itens consumidos/custo) que têm o mesmo nome.
        "Sem consumo" = pacote vendido sem item lançado na promoção de mesmo nome (comum em reservas com nome do cliente);
        "Sem receita casada" = itens consumidos numa promoção sem pacote de mesmo nome. A aba Conferência lista esses casos.
      </p>
    </div>
  )
}
