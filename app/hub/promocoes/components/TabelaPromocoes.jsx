// app/hub/promocoes/components/TabelaPromocoes.jsx
// Tabela unificada: uma linha por promoção/pacote, com drill-down do consumo.
'use client'

import { useState } from 'react'
import { labelForUnit } from '@/lib/units'
import { TabelaOrdenavel, CmvTxt, StatusTag, brl, pct, num, dataBR, diaSemana } from './ui'

export function colunasPromocoes({ peso = true } = {}) {
  return [
    { id: 'nome', label: 'Promoção / pacote', align: 'left', valor: (l) => l.nome, className: 'font-semibold text-brand-black max-w-[260px] truncate',
      render: (l) => (
        <span className={l.semDetalhe ? 'italic text-zinc-400 font-medium' : ''} title={l.provisorias ? `${l.provisorias} reserva(s) ainda sem detalhe ligadas pelo nome` : l.nome}>
          {l.nome}{l.provisorias ? <span className="ml-1.5 text-[9.5px] font-semibold text-zinc-400">{l.provisorias} pelo nome</span> : null}
        </span>
      ) },
    { id: 'tipo', label: 'Tipo', align: 'left', valor: (l) => (l.semDetalhe ? '' : l.tipo), className: 'text-zinc-500 text-[11.5px]' },
    { id: 'n', label: 'Reservas', valor: (l) => l.n, render: (l) => (l.n ? num(l.n) : '—') },
    { id: 'pessoas', label: 'Pessoas', valor: (l) => l.pessoas, render: (l) => (l.pessoas ? num(l.pessoas) : '—') },
    { id: 'receita', label: 'Faturamento', valor: (l) => l.receita, render: (l) => (l.receita ? brl(l.receita) : '—') },
    { id: 'ticket', label: 'Ticket', valor: (l) => l.ticket, render: (l) => brl(l.ticket) },
    { id: 'custo', label: 'Custo', valor: (l) => l.custo, render: (l) => (l.custo != null && l.temCusto ? brl(l.custo) : '—') },
    { id: 'cmv', label: 'CMV', valor: (l) => l.cmv,
      render: (l) => (l.cmv != null ? <CmvTxt v={l.cmv} />
        : l.semDetalhe ? <span className="text-zinc-300">—</span>
        : l.temCusto && !l.receita ? <span className="text-[10.5px] text-amber-700" title="Consumo da promoção sem receita ligada (uso fora de reserva)">sem receita</span>
        : <span className="text-zinc-300">—</span>) },
    { id: 'margem', label: 'Margem', valor: (l) => l.margem, render: (l) => (l.margem != null ? <span style={{ color: l.margem < 0 ? '#8C1414' : undefined }}>{brl(l.margem)}</span> : '—') },
    ...(peso ? [{ id: 'peso', label: 'Peso', valor: (l) => l.peso, render: (l) => pct(l.peso) }] : []),
    { id: 'status', label: 'Status', valor: (l) => l.cmv ?? -1, render: (l) => (l.cmv != null ? <StatusTag d={l} /> : <span className="text-zinc-300">—</span>) },
  ]
}

function DetalheLinha({ l, mostrarDias = true }) {
  // O que foi consumido: nas reservas que usaram o pacote (exato) + fora de reserva (relatório de promoções)
  const prod = new Map()
  const add = (produto, qtd, custo, cardapio, origem, temCusto) => {
    const x = prod.get(produto) || { produto, qtdRes: 0, qtdRel: 0, custo: 0, cardapio: 0, temCusto: true }
    if (origem === 'res') x.qtdRes += qtd; else x.qtdRel += qtd
    x.custo += custo; x.cardapio += cardapio
    if (!temCusto) x.temCusto = false
    prod.set(produto, x)
  }
  for (const r of l.reservas) for (const it of r.itens || []) if (it.qtd) add(it.produto, it.qtd, it.custo, it.precoUnit * it.qtd, 'res', it.temCusto)
  const temReservaDet = l.reservas.some((r) => r.detalhe)
  if (!temReservaDet) for (const c of l.itensRel) add(c.produto, c.usos, c.custo, c.cardapio || 0, 'rel', c.temCusto)
  const produtos = [...prod.values()]

  const porDia = new Map()
  const addDia = (d, campo, v) => { if (!d) return; const x = porDia.get(d) || { data: d, receita: 0, pessoas: 0, n: 0 }; x[campo] += v; porDia.set(d, x) }
  for (const r of l.reservas) { addDia(r.data, 'receita', r.fat); addDia(r.data, 'pessoas', r.pessoas); addDia(r.data, 'n', 1) }
  for (const c of l.itensRel) if (c.data && c.categoria === 'Desconto') addDia(c.data, 'receita', c.fatItens || 0)
  const dias = [...porDia.values()]

  const porCasa = new Map()
  for (const r of l.reservas) { const x = porCasa.get(r.unit) || { unit: r.unit, n: 0, pessoas: 0, receita: 0, custo: 0 }; x.n++; x.pessoas += r.pessoas; x.receita += r.fat; x.custo += r.custoExato || 0; porCasa.set(r.unit, x) }
  const casas = [...porCasa.values()]

  return (
    <div className="space-y-3">
      {(l.custoFora > 0 && l.n > 0) && (
        <p className="text-[11.5px] text-zinc-500 px-1">
          Inclui {brl(l.custoFora)} de custo de {num(l.usosFora)} itens dessa promoção consumidos <b>fora de reserva</b> (relatório de promoções).
        </p>
      )}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        <div className="bg-white rounded-lg border border-zinc-100 p-2">
          <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">O que foi consumido ({produtos.length})</p>
          <TabelaOrdenavel
            colunas={[
              { id: 'produto', label: 'Produto', align: 'left', valor: (x) => x.produto, render: (x) => <span>{x.produto}{!x.temCusto && <span className="ml-1 text-[9.5px] font-bold text-red-800">SEM FICHA</span>}</span> },
              { id: 'qtd', label: 'Qtd', valor: (x) => x.qtdRes + x.qtdRel, render: (x) => num(x.qtdRes + x.qtdRel) },
              ...(l.pessoas ? [{ id: 'pp', label: 'Por pessoa', valor: (x) => (x.qtdRes + x.qtdRel) / l.pessoas, render: (x) => ((x.qtdRes + x.qtdRel) / l.pessoas).toLocaleString('pt-BR', { maximumFractionDigits: 2 }) }] : []),
              { id: 'custo', label: 'Custo', valor: (x) => x.custo, render: (x) => brl(x.custo) },
              { id: 'cardapio', label: 'Cardápio', valor: (x) => x.cardapio, render: (x) => brl(x.cardapio) },
            ]}
            linhas={produtos} chave={(x) => x.produto} ordemInicial={{ id: 'custo', dir: 'desc' }} vazia="Sem consumo registrado."
          />
        </div>
        <div className="space-y-3">
          {mostrarDias && dias.length > 0 && (
            <div className="bg-white rounded-lg border border-zinc-100 p-2">
              <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">Por dia</p>
              <TabelaOrdenavel
                colunas={[
                  { id: 'data', label: 'Dia', align: 'left', valor: (d) => d.data, render: (d) => `${dataBR(d.data)} ${diaSemana(d.data)}` },
                  { id: 'n', label: 'Reservas', valor: (d) => d.n, render: (d) => (d.n ? num(d.n) : '—') },
                  { id: 'pessoas', label: 'Pessoas', valor: (d) => d.pessoas, render: (d) => (d.pessoas ? num(d.pessoas) : '—') },
                  { id: 'receita', label: 'Faturamento', valor: (d) => d.receita, render: (d) => brl(d.receita) },
                ]}
                linhas={dias} chave={(d) => d.data} ordemInicial={{ id: 'data', dir: 'asc' }}
              />
            </div>
          )}
          {casas.length > 1 && (
            <div className="bg-white rounded-lg border border-zinc-100 p-2">
              <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">Por casa (reservas)</p>
              <TabelaOrdenavel
                colunas={[
                  { id: 'casa', label: 'Casa', align: 'left', valor: (x) => labelForUnit(x.unit) },
                  { id: 'n', label: 'Reservas', valor: (x) => x.n },
                  { id: 'pessoas', label: 'Pessoas', valor: (x) => x.pessoas, render: (x) => num(x.pessoas) },
                  { id: 'receita', label: 'Faturamento', valor: (x) => x.receita, render: (x) => brl(x.receita) },
                  { id: 'cmv', label: 'CMV', valor: (x) => (x.receita ? x.custo / x.receita : null), render: (x) => <CmvTxt v={x.receita && x.custo ? x.custo / x.receita : null} /> },
                ]}
                linhas={casas} chave={(x) => x.unit} ordemInicial={{ id: 'receita', dir: 'desc' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TabelaPromocoes({ linhas, linhaTotal, peso = true, mostrarDias = true, vazia }) {
  const [aberta, setAberta] = useState(null)
  return (
    <TabelaOrdenavel
      colunas={colunasPromocoes({ peso })}
      linhas={linhas}
      chave={(l) => l.k}
      ordemInicial={{ id: 'receita', dir: 'desc' }}
      linhaTotal={linhaTotal}
      onLinhaClick={(k) => setAberta((a) => (a === k ? null : k))}
      aberta={aberta}
      renderDetalhe={(l) => <DetalheLinha l={l} mostrarDias={mostrarDias} />}
      vazia={vazia}
    />
  )
}
