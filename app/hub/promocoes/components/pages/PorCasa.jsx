// app/hub/promocoes/components/pages/PorCasa.jsx
'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { unificar, totalUnificado, fatTotalPeriodo, mesAnterior, corCmv } from '../../data/modelo'
import { Card, TabelaOrdenavel, CmvTxt, StatusTag, Delta, brl, brlK, pct, num, mesLabel, varPct } from '../ui'
import TabelaPromocoes from '../TabelaPromocoes'
import { linhaDeTotal } from './Promocoes'

export default function PorCasa({ dados, filtros }) {
  const { consumoMes, fatTotal, unidades, ultimoFechado } = dados
  const mes = filtros.mes
  const parcial = mes === ultimoFechado.slice(0, 7)
  const [aberta, setAberta] = useState(null)

  const casas = useMemo(() => unidades.map((u) => {
    const ft = fatTotalPeriodo(fatTotal, [u.id], { mes })
    const linhas = [...unificar({ ...dados, consumo: consumoMes }, { units: [u.id], mes }).values()].map((l) => ({ ...l, peso: ft ? l.receita / ft : null }))
    const t = totalUnificado(linhas, ft)
    const ant = parcial ? null : totalUnificado(unificar({ ...dados, consumo: consumoMes }, { units: [u.id], mes: mesAnterior(mes) }))
    return { ...t, unit: u.id, nome: u.label, fatTotal: ft, linhas, receitaAnt: ant ? ant.receita : null, temCusto: t.custo > 0 }
  }), [dados, consumoMes, fatTotal, unidades, mes, parcial])

  const rede = useMemo(() => {
    const ft = fatTotalPeriodo(fatTotal, unidades.map((u) => u.id), { mes })
    const t = totalUnificado([...unificar({ ...dados, consumo: consumoMes }, { units: unidades.map((u) => u.id), mes }).values()], ft)
    return { ...t, nome: 'Rede', fatTotal: ft, temCusto: t.custo > 0 }
  }, [dados, consumoMes, fatTotal, unidades, mes])

  const colunas = [
    { id: 'nome', label: 'Casa', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black' },
    { id: 'fatTotal', label: 'Fat. total casa', valor: (l) => l.fatTotal, render: (l) => brl(l.fatTotal) },
    { id: 'receita', label: 'Fat. promoções', valor: (l) => l.receita, render: (l) => brl(l.receita) },
    { id: 'var', label: 'Δ', valor: (l) => varPct(l.receita, l.receitaAnt), render: (l) => <Delta v={varPct(l.receita, l.receitaAnt)} /> },
    { id: 'peso', label: 'Peso', valor: (l) => l.peso, render: (l) => pct(l.peso) },
    { id: 'custo', label: 'Custo', valor: (l) => l.custo, render: (l) => brl(l.custo) },
    { id: 'cmv', label: 'CMV', valor: (l) => l.cmv, render: (l) => <CmvTxt v={l.cmv} /> },
    { id: 'margem', label: 'Margem', valor: (l) => l.margem, render: (l) => <span style={{ color: l.margem < 0 ? '#8C1414' : undefined }}>{brl(l.margem)}</span> },
    { id: 'pessoas', label: 'Pessoas', valor: (l) => l.pessoas, render: (l) => num(l.pessoas) },
    { id: 'ticket', label: 'Ticket', valor: (l) => l.ticket, render: (l) => brl(l.ticket) },
    { id: 'status', label: 'Status', valor: (l) => l.cmv ?? -1, render: (l) => (l.cmv != null ? <StatusTag d={l} /> : '—') },
  ]
  const grafico = casas.filter((c) => c.peso != null).sort((a, b) => b.peso - a.peso)

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand-black">Por casa — {mesLabel(mes)}{parcial ? ' (parcial)' : ''}</h1>
        <p className="text-xs text-zinc-400">Todas as promoções e pacotes · clique numa casa pra ver promoção a promoção</p>
      </div>

      <Card titulo="Peso das promoções no faturamento de cada casa (cor = faixa de CMV)">
        <div style={{ width: '100%', height: 230 }}>
          <ResponsiveContainer>
            <BarChart data={grafico}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
              <XAxis dataKey="nome" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={pct} width={48} />
              <Tooltip formatter={(v, n, p) => [`${pct(v)} · CMV ${pct(p.payload.cmv)} · ${brlK(p.payload.receita)}`, 'Peso']} />
              <Bar dataKey="peso" radius={[4, 4, 0, 0]}>
                {grafico.map((g) => <Cell key={g.unit} fill={corCmv(g.cmv)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas} linhas={casas} chave={(l) => l.unit} ordemInicial={{ id: 'receita', dir: 'desc' }} linhaTotal={rede}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))} aberta={aberta}
          renderDetalhe={(c) => (
            <div className="bg-white rounded-lg border border-zinc-100">
              <TabelaPromocoes linhas={c.linhas} linhaTotal={linhaDeTotal(c)} />
            </div>
          )}
        />
      </Card>
    </div>
  )
}
