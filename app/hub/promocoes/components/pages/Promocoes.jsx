// app/hub/promocoes/components/pages/Promocoes.jsx
// PROMOÇÕES E PACOTES — uma linha por nome (PACOTE 03, CERVEJA & CHURRASCO, RODÍZIO…),
// juntando reservas ("Mais detalhes") + relatório de Promoções Utilizadas.
'use client'

import { useMemo, useState } from 'react'
import { labelForUnit } from '@/lib/units'
import { unificar, totalUnificado, fatTotalPeriodo, corCmv } from '../../data/modelo'
import { Card, Kpi, Aviso, brl, brlK, pct, num, mesLabel } from '../ui'
import TabelaPromocoes from '../TabelaPromocoes'

export function linhaDeTotal(t, nome = 'Total') {
  return { ...t, k: '__total__', nome, tipo: '', semDetalhe: false, temCusto: t.custo > 0, custo: t.custo, receita: t.receita }
}

export default function Promocoes({ dados, filtros }) {
  const { consumoMes, fatTotal, unidades, ultimoFechado } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes
  const parcial = mes === ultimoFechado.slice(0, 7)
  const [busca, setBusca] = useState('')
  const [tipo, setTipo] = useState('')
  const ft = fatTotalPeriodo(fatTotal, units, { mes })

  const { linhas, tot } = useMemo(() => {
    const mapa = unificar({ ...dados, consumo: consumoMes }, { units, mes })
    const linhas = [...mapa.values()].map((l) => ({ ...l, peso: ft ? l.receita / ft : null }))
    return { linhas, tot: totalUnificado(linhas, ft) }
  }, [dados, consumoMes, units.join(','), mes, ft])

  const semDet = linhas.find((l) => l.semDetalhe)
  const filtradas = linhas
    .filter((l) => !tipo || (tipo === 'reserva' ? l.n > 0 : l.tipo === tipo && !l.semDetalhe))
    .filter((l) => !busca || l.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg font-bold text-brand-black">Promoções e pacotes — {mesLabel(mes)}{parcial ? ' (parcial)' : ''}</h1>
          <p className="text-xs text-zinc-400">{filtros.unidade ? labelForUnit(filtros.unidade) : 'Rede'} · uma linha por promoção/pacote · clique pra ver o consumo, os dias e as casas</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white">
            <option value="">Todas</option>
            <option value="reserva">Só com reserva</option>
            <option value="Pacote">Tipo pacote</option>
            <option value="Desconto">Tipo desconto</option>
          </select>
          <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar…" className="px-3 py-1.5 rounded-lg border border-surface-border text-sm bg-white w-48" />
        </div>
      </div>

      {semDet && semDet.n > 0 && (
        <Aviso>
          {num(semDet.n)} reserva(s) do mês ainda sem o "Mais detalhes" da ZIG ({brlK(semDet.receita)}) — ficam na linha "Reservas ainda sem detalhe" até o histórico completar.
          O consumo delas já está no custo das promoções, então o CMV total está certo; só não dá pra saber ainda qual pacote cada uma usou.
        </Aviso>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi label="Faturamento" valor={brlK(tot.receita)} sub={`${num(tot.n)} reservas`} />
        <Kpi label="Custo (ficha técnica)" valor={brlK(tot.custo)} />
        <Kpi label="CMV" valor={pct(tot.cmv)} corValor={corCmv(tot.cmv)} sub={tot.cobertura != null && tot.cobertura < 0.95 ? `${pct(1 - tot.cobertura)} dos itens sem ficha` : null} corSub="#B45309" />
        <Kpi label="Margem" valor={brlK(tot.margem)} corValor={tot.margem < 0 ? '#8C1414' : undefined} />
        <Kpi label="Pessoas · ticket" valor={num(tot.pessoas)} sub={tot.ticket ? `ticket ${brl(tot.ticket)}` : null} />
        <Kpi label="Peso no faturamento" valor={pct(tot.peso)} sub={ft ? `de ${brlK(ft)}` : null} />
      </div>

      <Card className="p-0">
        <TabelaPromocoes linhas={filtradas} linhaTotal={linhaDeTotal(tot)} />
        <p className="text-[10.5px] text-zinc-400 px-4 pb-3">
          Faturamento = reservas que usaram o pacote (valor do pacote + produtos pagos + NF por fora, sem gorjeta) + o que o cliente pagou nas promoções de desconto.
          Custo = tudo que essas reservas consumiram + o consumo da promoção fora de reserva (Promoções Utilizadas), sempre × ficha técnica. Nada entra duas vezes.
        </p>
      </Card>
    </div>
  )
}
