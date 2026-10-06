// app/hub/promocoes/components/pages/PorCasa.jsx
'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { CATEGORIAS_PROMO } from '@/lib/promocoesConfig'
import { agrupar, total, derivar, fatTotalPeriodo, mesAnterior, corCmv } from '../../data/modelo'
import { Card, TabelaOrdenavel, COLS_METRICAS, brl, brlK, pct, mesLabel, varPct, Delta } from '../ui'

export default function PorCasa({ dados, filtros }) {
  const { pacotes, consumoMes, fatTotal, unidades, nomes, ultimoFechado } = dados
  const mes = filtros.mes
  const categoria = filtros.categoria || undefined
  const [aberta, setAberta] = useState(null)

  const linhas = useMemo(() => {
    const atual = agrupar(pacotes, consumoMes, { mes, categoria }, (r) => r.unit)
    const ant = agrupar(pacotes, consumoMes, { mes: mesAnterior(mes), categoria }, (r) => r.unit)
    return unidades.map((u) => {
      const d = derivar(atual.get(u.id) || total([], [], {}), fatTotalPeriodo(fatTotal, [u.id], { mes }))
      const a = ant.get(u.id)
      return { ...d, unit: u.id, nome: u.label, fatAnt: a ? a.fat : null }
    })
  }, [pacotes, consumoMes, fatTotal, unidades, mes, categoria])

  const rede = useMemo(() => {
    const units = unidades.map((u) => u.id)
    const d = derivar(total(pacotes, consumoMes, { mes, categoria }), fatTotalPeriodo(fatTotal, units, { mes }))
    const a = total(pacotes, consumoMes, { mes: mesAnterior(mes), categoria })
    return { ...d, nome: 'Rede', fatAnt: a.nPacotes ? a.fat : null }
  }, [pacotes, consumoMes, fatTotal, unidades, mes, categoria])

  const colunas = [
    { id: 'nome', label: 'Casa', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black' },
    COLS_METRICAS.fatTotal,
    COLS_METRICAS.fat,
    { id: 'var', label: 'Δ fat. promo', valor: (l) => varPct(l.fat, l.fatAnt), render: (l) => <Delta v={varPct(l.fat, l.fatAnt)} /> },
    COLS_METRICAS.peso,
    COLS_METRICAS.cmv,
    COLS_METRICAS.pessoas,
    COLS_METRICAS.ticket,
    COLS_METRICAS.margem,
    COLS_METRICAS.status,
  ]

  const grafico = [...linhas].filter((l) => l.peso != null).sort((a, b) => b.peso - a.peso)

  function detalhe(l) {
    const ft = l.fatTotal
    const porCat = agrupar(pacotes, consumoMes, { units: [l.unit], mes }, (r) => r.categoria)
    const cats = CATEGORIAS_PROMO.map((c) => ({ nome: c, ...derivar(porCat.get(c) || total([], [], {}), ft) }))
    const porPromo = agrupar(pacotes, consumoMes, { units: [l.unit], mes, categoria }, (r) => r.chave)
    const top = [...porPromo.entries()].map(([k, a]) => ({ nome: nomes.get(k) || k, ...derivar(a, ft) }))
      .sort((a, b) => b.fat - a.fat).slice(0, 8)
    const colsDet = [
      { id: 'nome', label: 'Categoria', align: 'left', valor: (x) => x.nome },
      COLS_METRICAS.fat, COLS_METRICAS.peso, COLS_METRICAS.cmv, COLS_METRICAS.pessoas, COLS_METRICAS.ticket, COLS_METRICAS.margem,
    ]
    return (
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-zinc-100 p-2">
          <TabelaOrdenavel colunas={colsDet} linhas={cats} chave={(x) => x.nome} ordemInicial={{ id: 'fat', dir: 'desc' }} />
        </div>
        <div className="bg-white rounded-lg border border-zinc-100 p-2">
          <TabelaOrdenavel
            colunas={[{ id: 'nome', label: 'Principais promoções', align: 'left', valor: (x) => x.nome }, COLS_METRICAS.fat, COLS_METRICAS.cmv, COLS_METRICAS.pessoas, COLS_METRICAS.status]}
            linhas={top} chave={(x) => x.nome} ordemInicial={{ id: 'fat', dir: 'desc' }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand-black">Por casa — {mesLabel(mes)}{mes === ultimoFechado.slice(0, 7) ? ' (parcial)' : ''}</h1>
        <p className="text-xs text-zinc-400">{categoria || 'Todas as promoções'} · clique numa casa pra abrir por categoria e promoção</p>
      </div>

      <Card titulo="Peso das promoções no faturamento de cada casa">
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer>
            <BarChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={pct} width={48} />
              <Tooltip formatter={(v, n, p) => [`${pct(v)} · CMV ${pct(p.payload.cmv)} · ${brlK(p.payload.fat)}`, 'Peso']} />
              <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
                {grafico.map((g) => <Cell key={g.unit} fill={corCmv(g.cmv)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="text-[10.5px] text-zinc-400">Cor da barra = faixa de CMV da casa (verde rentável, âmbar atenção, vermelho crítico).</p>
      </Card>

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas}
          linhas={linhas}
          chave={(l) => l.unit}
          ordemInicial={{ id: 'fat', dir: 'desc' }}
          linhaTotal={rede}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))}
          aberta={aberta}
          renderDetalhe={detalhe}
        />
      </Card>
    </div>
  )
}
