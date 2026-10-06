// app/hub/promocoes/components/pages/PorPromocao.jsx  (aba "Promoções")
// Relatório Promoções Utilizadas da ZIG, por nome da promoção: consumo e custo (ficha técnica).
'use client'

import { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { labelForUnit } from '@/lib/units'
import { agruparConsumo, mesAnterior } from '../../data/modelo'
import { Card, Kpi, Aviso, TabelaOrdenavel, CmvTxt, Delta, brl, brlK, pct, num, mesLabel, dataBR, diaSemana, varPct } from '../ui'

export default function PorPromocao({ dados, filtros }) {
  const { consumoMes, consumoDia, unidades, nomes, categoriaDaChave, fonteCustoMes, ultimoFechado } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const parcial = mes === ultimoFechado.slice(0, 7)
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState(null)

  const linhas = useMemo(() => {
    const atual = agruparConsumo(consumoMes, { units, mes }, (c) => c.chave)
    const ant = parcial ? new Map() : agruparConsumo(consumoMes, { units, mes: mesAnterior(mes) }, (c) => c.chave)
    return [...atual.entries()].map(([k, a]) => ({ k, nome: nomes.get(k) || k, tipo: categoriaDaChave.get(k) || '—', ...a, custoAnt: ant.get(k)?.custo ?? null }))
  }, [consumoMes, units.join(','), mes, parcial])

  const tot = linhas.reduce((t, l) => ({ usos: t.usos + l.usos, cardapio: t.cardapio + l.cardapio, desconto: t.desconto + l.desconto, custo: t.custo + l.custo, pago: t.pago + l.pago, semCusto: t.semCusto + l.usosSemCusto }),
    { usos: 0, cardapio: 0, desconto: 0, custo: 0, pago: 0, semCusto: 0 })
  const filtradas = linhas.filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()))

  const colunas = [
    { id: 'nome', label: 'Promoção', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black max-w-[260px] truncate' },
    { id: 'tipo', label: 'Tipo', align: 'left', valor: (l) => l.tipo, className: 'text-zinc-500' },
    { id: 'usos', label: 'Itens consumidos', valor: (l) => l.usos, render: (l) => num(l.usos) },
    { id: 'cardapio', label: 'Valor de cardápio', valor: (l) => l.cardapio, render: (l) => brl(l.cardapio) },
    { id: 'desconto', label: 'Desconto', valor: (l) => l.desconto, render: (l) => brl(l.desconto) },
    { id: 'custo', label: 'Custo (ficha)', valor: (l) => l.custo, render: (l) => brl(l.custo) },
    { id: 'var', label: 'Δ custo', valor: (l) => varPct(l.custo, l.custoAnt), render: (l) => <Delta v={varPct(l.custo, l.custoAnt)} invertido /> },
    { id: 'cmvCardapio', label: 'CMV s/ cardápio', valor: (l) => l.cmvCardapio, render: (l) => <CmvTxt v={l.cmvCardapio} /> },
    { id: 'cmvPago', label: 'CMV s/ pago', valor: (l) => l.cmvPago, render: (l) => (l.tipo === 'Desconto' ? <CmvTxt v={l.cmvPago} /> : <span className="text-zinc-300">—</span>) },
    { id: 'cobertura', label: 'Com ficha', valor: (l) => l.cobertura, render: (l) => <span style={{ color: l.cobertura != null && l.cobertura < 0.95 ? '#B45309' : undefined }}>{pct(l.cobertura)}</span> },
  ]

  function detalhe(l) {
    const filtro = { units, mes, chave: l.k }
    const produtos = new Map()
    for (const c of consumoMes) {
      if (c.chave !== l.k || c.mes !== mes || !units.includes(c.unit)) continue
      const x = produtos.get(c.produto) || { produto: c.produto, usos: 0, cardapio: 0, custo: 0, temCusto: c.temCusto, custoUnit: c.custoUnit }
      x.usos += c.usos; x.cardapio += c.cardapio || 0; x.custo += c.custo
      produtos.set(c.produto, x)
    }
    const prods = [...produtos.values()].map((x) => ({ ...x, cmv: x.cardapio ? x.custo / x.cardapio : null }))
    const dias = [...agruparConsumo(consumoDia, filtro, (c) => c.data).entries()].map(([data, a]) => ({ data, ...a })).sort((a, b) => a.data.localeCompare(b.data))
    const casas = units.length > 1 ? [...agruparConsumo(consumoMes, filtro, (c) => c.unit).entries()].map(([u, a]) => ({ unit: u, nome: labelForUnit(u), ...a })) : []

    return (
      <div className="space-y-3">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          <div className="bg-white rounded-lg border border-zinc-100 p-2">
            <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">O que foi consumido ({prods.length} produtos)</p>
            <TabelaOrdenavel
              colunas={[
                { id: 'produto', label: 'Produto', align: 'left', valor: (x) => x.produto, render: (x) => <span>{x.produto}{!x.temCusto && <span className="ml-1 text-[9.5px] font-bold text-red-800">SEM FICHA</span>}</span> },
                { id: 'usos', label: 'Qtd', valor: (x) => x.usos, render: (x) => num(x.usos) },
                { id: 'custoUnit', label: 'Custo un.', valor: (x) => x.custoUnit, render: (x) => brl(x.custoUnit) },
                { id: 'custo', label: 'Custo', valor: (x) => x.custo, render: (x) => brl(x.custo) },
                { id: 'cardapio', label: 'Cardápio', valor: (x) => x.cardapio, render: (x) => brl(x.cardapio) },
                { id: 'cmv', label: 'CMV', valor: (x) => x.cmv, render: (x) => <CmvTxt v={x.cmv} /> },
              ]}
              linhas={prods} chave={(x) => x.produto} ordemInicial={{ id: 'custo', dir: 'desc' }}
            />
          </div>
          <div className="space-y-3">
            <div className="bg-white rounded-lg border border-zinc-100 p-3">
              <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide mb-2">Custo por dia</p>
              {fonteCustoMes[mes] !== 'diario' && <p className="text-[11px] text-amber-700 mb-1">Dia a dia ainda sendo processado neste mês.</p>}
              <div style={{ width: '100%', height: 180 }}>
                <ResponsiveContainer>
                  <BarChart data={dias.map((d) => ({ dia: `${d.data.slice(8)} ${diaSemana(d.data)}`, custo: d.custo, usos: d.usos }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={brlK} width={56} />
                    <Tooltip formatter={(v, n) => (n === 'Custo' ? brl(v) : num(v))} />
                    <Bar dataKey="custo" name="Custo" fill="#8C1414" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            {casas.length > 0 && (
              <div className="bg-white rounded-lg border border-zinc-100 p-2">
                <TabelaOrdenavel
                  colunas={[
                    { id: 'nome', label: 'Casa', align: 'left', valor: (x) => x.nome },
                    { id: 'usos', label: 'Itens', valor: (x) => x.usos, render: (x) => num(x.usos) },
                    { id: 'custo', label: 'Custo', valor: (x) => x.custo, render: (x) => brl(x.custo) },
                    { id: 'cmvCardapio', label: 'CMV s/ cardápio', valor: (x) => x.cmvCardapio, render: (x) => <CmvTxt v={x.cmvCardapio} /> },
                  ]}
                  linhas={casas} chave={(x) => x.unit} ordemInicial={{ id: 'custo', dir: 'desc' }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Promoções — {mesLabel(mes)}{parcial ? ' (parcial)' : ''}</h1>
          <p className="text-xs text-zinc-400">{filtros.unidade ? labelForUnit(filtros.unidade) : 'Rede'} · relatório Promoções Utilizadas da ZIG, pelo nome da promoção · clique pra ver os produtos</p>
        </div>
        <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar promoção…" className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white w-56" />
      </div>

      {tot.semCusto > 0 && (
        <Aviso>{num(tot.semCusto)} itens consumidos não têm custo na ficha técnica (custo entra como zero). A lista está na Conferência.</Aviso>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Itens consumidos" valor={num(tot.usos)} />
        <Kpi label="Valor de cardápio" valor={brlK(tot.cardapio)} sub={`desconto ${brlK(tot.desconto)}`} />
        <Kpi label="Custo (ficha técnica)" valor={brlK(tot.custo)} />
        <Kpi label="CMV s/ cardápio" valor={pct(tot.cardapio ? tot.custo / tot.cardapio : null)} sub="custo ÷ valor de cardápio" />
        <Kpi label="Pago pelo cliente" valor={brlK(tot.pago)} sub="só promoções de desconto" />
      </div>

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas} linhas={filtradas} chave={(l) => l.k} ordemInicial={{ id: 'custo', dir: 'desc' }}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))} aberta={aberta} renderDetalhe={detalhe}
        />
      </Card>

      <p className="text-[11px] text-zinc-400">
        Valor de cardápio = quantidade × preço da ficha técnica. CMV s/ cardápio = quanto custa cada R$ 1 de cardápio entregue na promoção.
        Tipo Desconto = o cliente paga parte do item (receita = cardápio − desconto, CMV s/ pago). A rentabilidade do total (custo das promoções ÷ receita dos pacotes) está na Visão geral, Por casa e Análise diária.
      </p>
    </div>
  )
}
