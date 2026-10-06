// app/hub/promocoes/components/pages/Pacotes.jsx
// Relatório de Pacotes da ZIG, por nome do pacote: pessoas, receita, ticket, consumo.
'use client'

import { useMemo, useState } from 'react'
import { labelForUnit } from '@/lib/units'
import { agruparPacotes, fatTotalPeriodo, mesAnterior } from '../../data/modelo'
import { Card, Kpi, TabelaOrdenavel, Delta, brl, brlK, pct, num, mesLabel, dataBR, diaSemana, varPct } from '../ui'

export default function Pacotes({ dados, filtros }) {
  const { pacotes, fatTotal, unidades, nomes, ultimoFechado } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const parcial = mes === ultimoFechado.slice(0, 7)
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState(null)

  const ftMes = fatTotalPeriodo(fatTotal, units, { mes })
  const linhas = useMemo(() => {
    const atual = agruparPacotes(pacotes, { units, mes }, (p) => p.chave)
    const ant = parcial ? new Map() : agruparPacotes(pacotes, { units, mes: mesAnterior(mes) }, (p) => p.chave)
    return [...atual.entries()].map(([k, a]) => ({
      k, nome: nomes.get(k) || k, ...a,
      peso: ftMes ? a.fat / ftMes : null,
      fatAnt: ant.get(k)?.fat ?? null,
    }))
  }, [pacotes, units.join(','), mes, ftMes, parcial])

  const tot = linhas.reduce((t, l) => ({ n: t.n + l.n, pessoas: t.pessoas + l.pessoas, fat: t.fat + l.fat, produtos: t.produtos + l.produtos, faturamento: t.faturamento + l.faturamento, emitido: t.emitido + l.emitido }),
    { n: 0, pessoas: 0, fat: 0, produtos: 0, faturamento: 0, emitido: 0 })
  const filtradas = linhas.filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()))

  const colunas = [
    { id: 'nome', label: 'Pacote', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black max-w-[260px] truncate' },
    { id: 'n', label: 'Reservas', valor: (l) => l.n, render: (l) => num(l.n) },
    { id: 'pessoas', label: 'Pessoas', valor: (l) => l.pessoas, render: (l) => num(l.pessoas) },
    { id: 'fat', label: 'Receita', valor: (l) => l.fat, render: (l) => brl(l.fat) },
    { id: 'var', label: 'Δ receita', valor: (l) => varPct(l.fat, l.fatAnt), render: (l) => <Delta v={varPct(l.fat, l.fatAnt)} /> },
    { id: 'ticket', label: 'Ticket/pessoa', valor: (l) => l.ticket, render: (l) => brl(l.ticket) },
    { id: 'produtosPessoa', label: 'Produtos/pessoa', valor: (l) => l.produtosPessoa, render: (l) => (l.produtosPessoa != null ? l.produtosPessoa.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—') },
    { id: 'peso', label: 'Peso', valor: (l) => l.peso, render: (l) => pct(l.peso) },
    { id: 'nCasas', label: 'Casas', valor: (l) => l.nCasas },
  ]

  function detalhe(l) {
    const reservas = pacotes.filter((p) => p.chave === l.k && p.mes === mes && units.includes(p.unit)).sort((a, b) => a.data.localeCompare(b.data))
    return (
      <div className="bg-white rounded-lg border border-zinc-100 p-2">
        <TabelaOrdenavel
          colunas={[
            { id: 'data', label: 'Dia', align: 'left', valor: (r) => r.data, render: (r) => `${dataBR(r.data)} ${diaSemana(r.data)}` },
            { id: 'casa', label: 'Casa', align: 'left', valor: (r) => labelForUnit(r.unit) },
            { id: 'pessoas', label: 'Pessoas', valor: (r) => r.pessoas, render: (r) => num(r.pessoas) },
            { id: 'produtos', label: 'Produtos', valor: (r) => r.produtos, render: (r) => num(r.produtos) },
            { id: 'faturamento', label: 'Pago na casa', valor: (r) => r.faturamento, render: (r) => brl(r.faturamento) },
            { id: 'emitido', label: 'Por NF', valor: (r) => r.emitido, render: (r) => brl(r.emitido) },
            { id: 'fat', label: 'Receita', valor: (r) => r.fat, render: (r) => brl(r.fat) },
            { id: 'ticket', label: 'Ticket', valor: (r) => (r.pessoas ? r.fat / r.pessoas : null), render: (r) => brl(r.pessoas ? r.fat / r.pessoas : null) },
          ]}
          linhas={reservas} chave={(r, i) => `${r.unit}|${r.data}|${r.fat}|${r.pessoas}`} ordemInicial={{ id: 'data', dir: 'asc' }}
        />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Pacotes — {mesLabel(mes)}{parcial ? ' (parcial)' : ''}</h1>
          <p className="text-xs text-zinc-400">{filtros.unidade ? labelForUnit(filtros.unidade) : 'Rede'} · relatório de Pacotes da ZIG, pelo nome do pacote · clique pra ver dia a dia</p>
        </div>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pacote…" className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white w-56" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Receita de pacotes" valor={brlK(tot.fat)} sub={`${brlK(tot.faturamento)} na casa · ${brlK(tot.emitido)} por NF`} />
        <Kpi label="Pessoas" valor={num(tot.pessoas)} sub={`${num(tot.n)} reservas`} />
        <Kpi label="Ticket por pessoa" valor={brl(tot.pessoas ? tot.fat / tot.pessoas : null)} />
        <Kpi label="Produtos por pessoa" valor={tot.pessoas ? (tot.produtos / tot.pessoas).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—'} />
        <Kpi label="Peso no faturamento" valor={pct(ftMes ? tot.fat / ftMes : null)} sub={ftMes ? `de ${brlK(ftMes)}` : null} />
      </div>

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas} linhas={filtradas} chave={(l) => l.k} ordemInicial={{ id: 'fat', dir: 'desc' }}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))} aberta={aberta} renderDetalhe={detalhe}
        />
      </Card>
    </div>
  )
}
