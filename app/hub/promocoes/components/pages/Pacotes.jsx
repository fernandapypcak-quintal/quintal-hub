// app/hub/promocoes/components/pages/Pacotes.jsx
// Relatório de Pacotes da ZIG, por nome do pacote: pessoas, receita, ticket, consumo.
'use client'

import { useMemo, useState } from 'react'
import { labelForUnit } from '@/lib/units'
import { agruparPacotes, fatTotalPeriodo, mesAnterior } from '../../data/modelo'
import { Card, Kpi, TabelaOrdenavel, Delta, CmvTxt, StatusTag, brl, brlK, pct, num, mesLabel, dataBR, diaSemana, varPct } from '../ui'
import { corCmv, chavePromo } from '../../data/modelo'

export default function Pacotes({ dados, filtros }) {
  const { pacotes, fatTotal, unidades, nomes, ultimoFechado, reservasComDetalhe } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const parcial = mes === ultimoFechado.slice(0, 7)
  const [busca, setBusca] = useState('')
  const [aberta, setAberta] = useState(null)
  // Agrupar pelo pacote que a reserva usou (PACOTE 03, QUINTAL 2…) ou pela reserva
  const [modo, setModo] = useState(reservasComDetalhe > 0 ? 'pacote' : 'reserva')
  const chaveDe = (p) => (modo === 'pacote' && p.promocaoPacote ? 'p:' + chavePromo(p.promocaoPacote) : (modo === 'pacote' ? 's:' : 'r:') + p.chave)
  const nomeDe = (k, p) => (k.startsWith('p:') ? p.promocaoPacote : nomes.get(p.chave) || p.nome)

  const ftMes = fatTotalPeriodo(fatTotal, units, { mes })
  const linhas = useMemo(() => {
    const atual = agruparPacotes(pacotes, { units, mes }, chaveDe)
    const ant = parcial ? new Map() : agruparPacotes(pacotes, { units, mes: mesAnterior(mes) }, chaveDe)
    const exemplo = new Map()
    for (const p of pacotes) { const k = chaveDe(p); if (!exemplo.has(k)) exemplo.set(k, p) }
    return [...atual.entries()].map(([k, a]) => ({
      k, nome: nomeDe(k, exemplo.get(k)), semDetalhe: k.startsWith('s:'), ...a,
      peso: ftMes ? a.fat / ftMes : null,
      fatAnt: ant.get(k)?.fat ?? null,
    }))
  }, [pacotes, units.join(','), mes, ftMes, parcial, modo])

  const tot = linhas.reduce((t, l) => ({ n: t.n + l.n, pessoas: t.pessoas + l.pessoas, fat: t.fat + l.fat, produtos: t.produtos + l.produtos, faturamento: t.faturamento + l.faturamento, emitido: t.emitido + l.emitido, custo: t.custo + l.custo, fatComCusto: t.fatComCusto + l.fatComCusto }),
    { n: 0, pessoas: 0, fat: 0, produtos: 0, faturamento: 0, emitido: 0, custo: 0, fatComCusto: 0 })
  const cmvTot = tot.fatComCusto ? tot.custo / tot.fatComCusto : null
  const filtradas = linhas.filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()))

  const colunas = [
    { id: 'nome', label: modo === 'pacote' ? 'Pacote usado' : 'Reserva', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black max-w-[260px] truncate',
      render: (l) => <span>{l.nome}{l.semDetalhe && <span className="ml-1.5 text-[9.5px] font-semibold text-zinc-400">sem detalhe</span>}</span> },
    { id: 'n', label: 'Reservas', valor: (l) => l.n, render: (l) => num(l.n) },
    { id: 'pessoas', label: 'Pessoas', valor: (l) => l.pessoas, render: (l) => num(l.pessoas) },
    { id: 'fat', label: 'Receita', valor: (l) => l.fat, render: (l) => brl(l.fat) },
    { id: 'var', label: 'Δ receita', valor: (l) => varPct(l.fat, l.fatAnt), render: (l) => <Delta v={varPct(l.fat, l.fatAnt)} /> },
    { id: 'ticket', label: 'Ticket/pessoa', valor: (l) => l.ticket, render: (l) => brl(l.ticket) },
    { id: 'custo', label: 'Custo (est.)', valor: (l) => (l.nComCusto ? l.custo : null), render: (l) => (l.nComCusto ? brl(l.custo) : '—') },
    { id: 'cmv', label: 'CMV', valor: (l) => l.cmv, render: (l) => <CmvTxt v={l.cmv} /> },
    { id: 'margem', label: 'Margem', valor: (l) => l.margem, render: (l) => (l.margem != null ? <span style={{ color: l.margem < 0 ? '#8C1414' : undefined }}>{brl(l.margem)}</span> : '—') },
    { id: 'produtosPessoa', label: 'Produtos/pessoa', valor: (l) => l.produtosPessoa, render: (l) => (l.produtosPessoa != null ? l.produtosPessoa.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) : '—') },
    { id: 'peso', label: 'Peso', valor: (l) => l.peso, render: (l) => pct(l.peso) },
    { id: 'nCasas', label: 'Casas', valor: (l) => l.nCasas },
    { id: 'status', label: 'Status', valor: (l) => l.cmv, render: (l) => (l.cmv != null ? <StatusTag d={{ ...l, usos: 1 }} /> : <span className="text-zinc-300">—</span>) },
  ]

  const r0NF = reservasComDetalhe > 0 ? 'NF por fora' : 'Por NF'
  function detalhe(l) {
    const reservas = pacotes.filter((p) => chaveDe(p) === l.k && p.mes === mes && units.includes(p.unit)).sort((a, b) => a.data.localeCompare(b.data))
    // O que foi consumido (só reservas com detalhe da ZIG)
    const prod = new Map()
    for (const r of reservas) for (const it of r.itens || []) {
      const x = prod.get(it.produto) || { produto: it.produto, qtd: 0, custo: 0, cardapio: 0, pago: 0, temCusto: it.temCusto, foraPromo: 0 }
      x.qtd += it.qtd; x.custo += it.custo; x.cardapio += it.precoUnit * it.qtd; x.pago += it.pago
      if (!it.promocao) x.foraPromo += it.qtd
      prod.set(it.produto, x)
    }
    const produtos = [...prod.values()].filter((x) => x.qtd > 0)
    return (
      <div className="space-y-3">
      {produtos.length > 0 && (
        <div className="bg-white rounded-lg border border-zinc-100 p-2">
          <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">O que foi consumido ({produtos.length} produtos)</p>
          <TabelaOrdenavel
            colunas={[
              { id: 'produto', label: 'Produto', align: 'left', valor: (x) => x.produto, render: (x) => <span>{x.produto}{!x.temCusto && <span className="ml-1 text-[9.5px] font-bold text-red-800">SEM FICHA</span>}</span> },
              { id: 'qtd', label: 'Qtd', valor: (x) => x.qtd, render: (x) => num(x.qtd) },
              { id: 'foraPromo', label: 'Pago à parte', valor: (x) => x.foraPromo, render: (x) => (x.foraPromo ? num(x.foraPromo) : '—') },
              { id: 'custo', label: 'Custo', valor: (x) => x.custo, render: (x) => brl(x.custo) },
              { id: 'cardapio', label: 'Cardápio', valor: (x) => x.cardapio, render: (x) => brl(x.cardapio) },
            ]}
            linhas={produtos} chave={(x) => x.produto} ordemInicial={{ id: 'custo', dir: 'desc' }}
          />
        </div>
      )}
      <div className="bg-white rounded-lg border border-zinc-100 p-2">
        <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">Reservas ({reservas.length})</p>
        <TabelaOrdenavel
          colunas={[
            { id: 'data', label: 'Dia', align: 'left', valor: (r) => r.data, render: (r) => `${dataBR(r.data)} ${diaSemana(r.data)}` },
            { id: 'casa', label: 'Casa', align: 'left', valor: (r) => labelForUnit(r.unit) },
            modo === 'pacote'
              ? { id: 'reserva', label: 'Reserva', align: 'left', valor: (r) => r.nome, className: 'max-w-[200px] truncate' }
              : { id: 'pacoteUsado', label: 'Pacote usado', align: 'left', valor: (r) => r.promocaoPacote || '', render: (r) => r.promocaoPacote || <span className="text-zinc-300">—</span> },
            { id: 'pessoas', label: 'Pessoas', valor: (r) => r.pessoas, render: (r) => num(r.pessoas) },
            { id: 'produtos', label: 'Produtos', valor: (r) => r.produtos, render: (r) => num(r.produtos) },
            { id: 'faturamento', label: 'Pago na casa', valor: (r) => r.faturamento, render: (r) => brl(r.faturamento) },
            { id: 'emitido', label: r0NF, valor: (r) => r.emitido, render: (r) => brl(r.emitido) },
            { id: 'fat', label: 'Receita', valor: (r) => r.fat, render: (r) => brl(r.fat) },
            { id: 'ticket', label: 'Ticket', valor: (r) => (r.pessoas ? r.fat / r.pessoas : null), render: (r) => brl(r.pessoas ? r.fat / r.pessoas : null) },
            { id: 'custo', label: 'Custo (est.)', valor: (r) => r.custoEst, render: (r) => (r.custoEst != null ? <span title={`${num(r.produtos)} produtos × ${brl(r.custoProduto)} (${r.metodoCusto})`}>{brl(r.custoEst)}</span> : '—') },
            { id: 'cmv', label: 'CMV', valor: (r) => (r.custoEst != null && r.fat ? r.custoEst / r.fat : null), render: (r) => <CmvTxt v={r.custoEst != null && r.fat ? r.custoEst / r.fat : null} /> },
            { id: 'metodo', label: 'Custo por', align: 'left', valor: (r) => r.metodoCusto || '', render: (r) => <span className="text-zinc-400 text-[11px]">{r.metodoCusto || 'sem consumo no período'}</span> },
          ]}
          linhas={reservas} chave={(r) => r.id || `${r.unit}|${r.data}|${r.nome}|${r.fat}`} ordemInicial={{ id: 'data', dir: 'asc' }}
        />
      </div>
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
        <div className="flex items-center gap-2">
          <div className="flex border border-surface-border rounded-lg overflow-hidden text-xs font-semibold">
            {[['pacote', 'Por pacote usado'], ['reserva', 'Por reserva']].map(([id, lbl]) => (
              <button key={id} onClick={() => { setModo(id); setAberta(null) }}
                className={`px-3 py-1.5 ${modo === id ? 'bg-brand-black text-white' : 'bg-white text-zinc-500'}`}>{lbl}</button>
            ))}
          </div>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white w-48" />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Receita de pacotes" valor={brlK(tot.fat)} sub={`${brlK(tot.faturamento)} na casa · ${brlK(tot.emitido)} por NF`} />
        <Kpi label="Pessoas" valor={num(tot.pessoas)} sub={`${num(tot.n)} reservas`} />
        <Kpi label="Ticket por pessoa" valor={brl(tot.pessoas ? tot.fat / tot.pessoas : null)} />
        <Kpi label="CMV dos pacotes (est.)" valor={pct(cmvTot)} corValor={corCmv(cmvTot)} sub={`custo ${brlK(tot.custo)} · margem ${brlK(tot.fatComCusto - tot.custo)}`} />
        <Kpi label="Peso no faturamento" valor={pct(ftMes ? tot.fat / ftMes : null)} sub={ftMes ? `de ${brlK(ftMes)}` : null} />
      </div>

      <Card className="p-0">
        <p className="text-[10.5px] text-zinc-400 px-4 pt-3">
          Reservas com detalhe da ZIG ("Mais detalhes"): receita e CMV exatos — custo = cada produto consumido × ficha técnica; receita = valor do pacote + produtos pagos + NF por fora (sem gorjeta).
          Reservas ainda sem detalhe ("sem detalhe"): custo estimado pela média por produto das promoções da casa no dia. {reservasComDetalhe > 0 ? '' : 'O detalhe começa a ser puxado quando a ZIG liberar o acesso.'}
        </p>
        <TabelaOrdenavel
          colunas={colunas} linhas={filtradas} chave={(l) => l.k} ordemInicial={{ id: 'fat', dir: 'desc' }}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))} aberta={aberta} renderDetalhe={detalhe}
        />
      </Card>
    </div>
  )
}
