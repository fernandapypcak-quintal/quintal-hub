// app/hub/promocoes/components/pages/Pacotes.jsx
// PACOTES × PROMOÇÕES — uma linha por pacote/promoção da ZIG (PACOTE 03, QUINTAL 2…).
//  • Lado RESERVAS ("Mais detalhes" do relatório de Pacotes): quantas reservas usaram o
//    pacote, pessoas, receita e o custo EXATO do que elas consumiram (ficha técnica).
//  • Lado PROMOÇÕES UTILIZADAS: quanto daquela promoção saiu no relatório de promoções.
//  • Encaixe = itens da promoção dentro das reservas ÷ itens no relatório de promoções.
//    ~100% → todo o consumo do pacote veio das reservas. Bem abaixo → o pacote também
//    foi usado fora de reserva (ou ainda falta detalhe de alguma reserva).
'use client'

import { useMemo, useState } from 'react'
import { labelForUnit } from '@/lib/units'
import { agruparConsumo, fatTotalPeriodo, chavePromo, corCmv } from '../../data/modelo'
import { Card, Kpi, Aviso, TabelaOrdenavel, CmvTxt, StatusTag, brl, brlK, pct, num, mesLabel, dataBR, diaSemana } from '../ui'

const SEM = '__sem_detalhe__'

function novo() {
  return { n: 0, pessoas: 0, fat: 0, custo: 0, fatComCusto: 0, nComCusto: 0, itensReservas: 0, usosRel: 0, custoRel: 0, casas: new Set(), reservas: [] }
}

export default function Pacotes({ dados, filtros }) {
  const { pacotes, consumoMes, fatTotal, unidades, nomes, ultimoFechado, reservasComDetalhe } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const parcial = mes === ultimoFechado.slice(0, 7)
  const [busca, setBusca] = useState('')
  const [soComReserva, setSoComReserva] = useState(true)
  const [aberta, setAberta] = useState(null)
  const ftMes = fatTotalPeriodo(fatTotal, units, { mes })

  const { linhas, tot } = useMemo(() => {
    const mapa = new Map()
    const get = (k) => { if (!mapa.has(k)) mapa.set(k, novo()); return mapa.get(k) }
    const nomesK = new Map()
    const itensPorPromo = new Map()

    // Reservas
    for (const p of pacotes) {
      if (p.mes !== mes || !units.includes(p.unit)) continue
      const k = p.detalhe && p.promocaoPacote ? chavePromo(p.promocaoPacote) : SEM
      if (k !== SEM) nomesK.set(k, p.promocaoPacote)
      const a = get(k)
      a.n += 1; a.pessoas += p.pessoas; a.fat += p.fat; a.casas.add(p.unit); a.reservas.push(p)
      if (p.custoEst != null) { a.custo += p.custoEst; a.fatComCusto += p.fat; a.nComCusto += 1 }
      for (const it of p.itens || []) {
        if (!it.promocao) continue
        const kp = chavePromo(it.promocao)
        itensPorPromo.set(kp, (itensPorPromo.get(kp) || 0) + it.qtd)
      }
    }
    // Relatório de promoções
    for (const [k, c] of agruparConsumo(consumoMes, { units, mes }, (c) => c.chave)) {
      if (dados.categoriaDaChave.get(k) === 'Desconto') continue // promoção de desconto não é pacote
      const a = get(k)
      a.usosRel += c.usos; a.custoRel += c.custo
      if (!nomesK.has(k)) nomesK.set(k, nomes.get(k) || k)
    }
    const linhas = [...mapa.entries()].map(([k, a]) => {
      const itensReservas = itensPorPromo.get(k) || 0
      return {
        k, ...a,
        nome: k === SEM ? 'Reservas ainda sem detalhe' : nomesK.get(k) || k,
        semDetalhe: k === SEM,
        itensReservas,
        encaixe: a.usosRel > 0 ? itensReservas / a.usosRel : null,
        ticket: a.pessoas ? a.fat / a.pessoas : null,
        cmv: a.fatComCusto > 0 ? a.custo / a.fatComCusto : null,
        margem: a.nComCusto ? a.fatComCusto - a.custo : null,
        peso: ftMes ? a.fat / ftMes : null,
        nCasas: a.casas.size,
      }
    })
    const tot = linhas.reduce((t, l) => ({ n: t.n + l.n, pessoas: t.pessoas + l.pessoas, fat: t.fat + l.fat, custo: t.custo + l.custo, fatComCusto: t.fatComCusto + l.fatComCusto }),
      { n: 0, pessoas: 0, fat: 0, custo: 0, fatComCusto: 0 })
    return { linhas, tot }
  }, [pacotes, consumoMes, units.join(','), mes, ftMes])

  const cmvTot = tot.fatComCusto ? tot.custo / tot.fatComCusto : null
  const semDet = linhas.find((l) => l.semDetalhe)
  const filtradas = linhas
    .filter((l) => !soComReserva || l.n > 0)
    .filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()))

  const colunas = [
    { id: 'nome', label: 'Pacote / promoção', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black max-w-[240px] truncate',
      render: (l) => <span className={l.semDetalhe ? 'text-zinc-400 italic font-medium' : ''}>{l.nome}</span> },
    { id: 'n', label: 'Reservas', valor: (l) => l.n, render: (l) => (l.n ? num(l.n) : '—') },
    { id: 'pessoas', label: 'Pessoas', valor: (l) => l.pessoas, render: (l) => (l.n ? num(l.pessoas) : '—') },
    { id: 'fat', label: 'Receita', valor: (l) => l.fat, render: (l) => (l.n ? brl(l.fat) : '—') },
    { id: 'ticket', label: 'Ticket/pessoa', valor: (l) => l.ticket, render: (l) => brl(l.ticket) },
    { id: 'custo', label: 'Custo', valor: (l) => (l.nComCusto ? l.custo : null), render: (l) => (l.nComCusto ? brl(l.custo) : '—') },
    { id: 'cmv', label: 'CMV', valor: (l) => l.cmv, render: (l) => <CmvTxt v={l.cmv} /> },
    { id: 'margem', label: 'Margem', valor: (l) => l.margem, render: (l) => (l.margem != null ? <span style={{ color: l.margem < 0 ? '#8C1414' : undefined }}>{brl(l.margem)}</span> : '—') },
    { id: 'usosRel', label: 'Itens no rel. promoções', valor: (l) => l.usosRel, render: (l) => (l.usosRel ? num(l.usosRel) : '—') },
    { id: 'encaixe', label: 'Encaixe', valor: (l) => l.encaixe,
      render: (l) => (l.encaixe == null ? <span className="text-zinc-300">—</span>
        : <span title={`${num(l.itensReservas)} itens nas reservas ÷ ${num(l.usosRel)} no relatório de promoções`} style={{ color: l.encaixe >= 0.9 ? '#5f6b12' : l.encaixe >= 0.6 ? '#B45309' : '#8C1414', fontWeight: 600 }}>{pct(Math.min(l.encaixe, 9.99))}</span>) },
    { id: 'status', label: 'Status', valor: (l) => l.cmv, render: (l) => (l.cmv != null ? <StatusTag d={{ ...l, usos: 1 }} /> : <span className="text-zinc-300">—</span>) },
  ]

  function detalhe(l) {
    const reservas = [...l.reservas].sort((a, b) => a.data.localeCompare(b.data))
    const prod = new Map()
    for (const r of reservas) for (const it of r.itens || []) {
      const x = prod.get(it.produto) || { produto: it.produto, qtd: 0, custo: 0, cardapio: 0, temCusto: it.temCusto, foraPromo: 0 }
      x.qtd += it.qtd; x.custo += it.custo; x.cardapio += it.precoUnit * it.qtd
      if (!it.promocao) x.foraPromo += it.qtd
      prod.set(it.produto, x)
    }
    const produtos = [...prod.values()].filter((x) => x.qtd > 0)
    return (
      <div className="space-y-3">
        {produtos.length > 0 && (
          <div className="bg-white rounded-lg border border-zinc-100 p-2">
            <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">O que as reservas consumiram ({produtos.length} produtos)</p>
            <TabelaOrdenavel
              colunas={[
                { id: 'produto', label: 'Produto', align: 'left', valor: (x) => x.produto, render: (x) => <span>{x.produto}{!x.temCusto && <span className="ml-1 text-[9.5px] font-bold text-red-800">SEM FICHA</span>}</span> },
                { id: 'qtd', label: 'Qtd', valor: (x) => x.qtd, render: (x) => num(x.qtd) },
                { id: 'porPessoa', label: 'Por pessoa', valor: (x) => (l.pessoas ? x.qtd / l.pessoas : null), render: (x) => (l.pessoas ? (x.qtd / l.pessoas).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) : '—') },
                { id: 'foraPromo', label: 'Pago à parte', valor: (x) => x.foraPromo, render: (x) => (x.foraPromo ? num(x.foraPromo) : '—') },
                { id: 'custo', label: 'Custo', valor: (x) => x.custo, render: (x) => brl(x.custo) },
                { id: 'cardapio', label: 'Cardápio', valor: (x) => x.cardapio, render: (x) => brl(x.cardapio) },
              ]}
              linhas={produtos} chave={(x) => x.produto} ordemInicial={{ id: 'custo', dir: 'desc' }}
            />
          </div>
        )}
        {reservas.length > 0 && (
          <div className="bg-white rounded-lg border border-zinc-100 p-2">
            <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">Por dia e casa</p>
            <TabelaOrdenavel
              colunas={[
                { id: 'data', label: 'Dia', align: 'left', valor: (r) => r.data, render: (r) => `${dataBR(r.data)} ${diaSemana(r.data)}` },
                { id: 'casa', label: 'Casa', align: 'left', valor: (r) => labelForUnit(r.unit) },
                { id: 'pessoas', label: 'Pessoas', valor: (r) => r.pessoas, render: (r) => num(r.pessoas) },
                { id: 'fat', label: 'Receita', valor: (r) => r.fat, render: (r) => brl(r.fat) },
                { id: 'ticket', label: 'Ticket', valor: (r) => (r.pessoas ? r.fat / r.pessoas : null), render: (r) => brl(r.pessoas ? r.fat / r.pessoas : null) },
                { id: 'custo', label: 'Custo', valor: (r) => r.custoEst, render: (r) => (r.custoEst != null ? brl(r.custoEst) : '—') },
                { id: 'cmv', label: 'CMV', valor: (r) => (r.custoEst != null && r.fat ? r.custoEst / r.fat : null), render: (r) => <CmvTxt v={r.custoEst != null && r.fat ? r.custoEst / r.fat : null} /> },
                { id: 'metodo', label: 'Custo por', align: 'left', valor: (r) => r.metodoCusto || '', render: (r) => <span className="text-zinc-400 text-[11px]">{r.detalhe ? 'exato' : r.metodoCusto ? 'estimado' : '—'}</span> },
              ]}
              linhas={reservas} chave={(r) => r.id || `${r.unit}|${r.data}|${r.fat}|${r.pessoas}`} ordemInicial={{ id: 'data', dir: 'asc' }}
            />
          </div>
        )}
        {!reservas.length && <p className="text-[12px] text-zinc-400 px-2">Nenhuma reserva usou essa promoção no mês — o consumo dela veio de fora de reserva.</p>}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Pacotes — {mesLabel(mes)}{parcial ? ' (parcial)' : ''}</h1>
          <p className="text-xs text-zinc-400">{filtros.unidade ? labelForUnit(filtros.unidade) : 'Rede'} · pacote usado nas reservas × relatório de promoções · clique pra ver o consumo</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-zinc-500 cursor-pointer">
            <input type="checkbox" checked={soComReserva} onChange={(e) => setSoComReserva(e.target.checked)} /> só com reserva
          </label>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar pacote…" className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white w-48" />
        </div>
      </div>

      {semDet && semDet.n > 0 && (
        <Aviso>
          {num(semDet.n)} reserva(s) do mês ainda sem o detalhe da ZIG — por isso ainda não dá pra saber qual pacote usaram (ficam na linha "Reservas ainda sem detalhe", com custo estimado).
          {reservasComDetalhe === 0 ? ' O detalhe começa a ser puxado pela rotina das 8h assim que a ZIG liberar o acesso.' : ' A rotina das 8h vai completando.'}
        </Aviso>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Kpi label="Receita das reservas" valor={brlK(tot.fat)} sub={`${num(tot.n)} reservas`} />
        <Kpi label="Pessoas" valor={num(tot.pessoas)} />
        <Kpi label="Ticket por pessoa" valor={brl(tot.pessoas ? tot.fat / tot.pessoas : null)} />
        <Kpi label="CMV dos pacotes" valor={pct(cmvTot)} corValor={corCmv(cmvTot)} sub={`custo ${brlK(tot.custo)} · margem ${brlK(tot.fatComCusto - tot.custo)}`} />
        <Kpi label="Peso no faturamento" valor={pct(ftMes ? tot.fat / ftMes : null)} sub={ftMes ? `de ${brlK(ftMes)}` : null} />
      </div>

      <Card className="p-0">
        <TabelaOrdenavel
          colunas={colunas} linhas={filtradas} chave={(l) => l.k} ordemInicial={{ id: 'fat', dir: 'desc' }}
          onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))} aberta={aberta} renderDetalhe={detalhe}
        />
        <p className="text-[10.5px] text-zinc-400 px-4 pb-3">
          Receita = valor do pacote + produtos pagos + NF por fora (sem gorjeta). Custo = tudo que as reservas consumiram × ficha técnica (exato com o detalhe da ZIG; estimado nas que ainda não têm).
          Encaixe = itens da promoção dentro das reservas ÷ itens no relatório de Promoções Utilizadas — perto de 100% quer dizer que o pacote só foi usado por reservas.
        </p>
      </Card>
    </div>
  )
}
