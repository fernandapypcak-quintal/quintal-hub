// app/hub/promocoes/components/pages/Conferencia.jsx
// Tudo que explica "por que o número não bate": cobertura de custo,
// casamento pacote ↔ promoção, colunas da ZIG e status do pipeline.
'use client'

import { useMemo } from 'react'
import { labelForUnit } from '@/lib/units'
import { COLUNA_FATURAMENTO_PACOTE } from '@/lib/promocoesConfig'
import { agrupar, total, fatTotalPeriodo } from '../../data/modelo'
import { Card, Kpi, TabelaOrdenavel, brl, pct, num, mesLabel, dataBR } from '../ui'

export default function Conferencia({ dados, filtros }) {
  const { pacotes, consumoMes, fatTotal, unidades, nomes, fonteCustoMes, status, geradoEm, fichaAoVivo, ultimoFechado } = dados
  const units = filtros.unidade ? [filtros.unidade] : unidades.map((u) => u.id)
  const mes = filtros.mes

  const r = useMemo(() => {
    const f = { units, mes }
    const tot = total(pacotes, consumoMes, f)

    // Casamento por nome
    const porChave = agrupar(pacotes, consumoMes, f, (x) => x.chave)
    let fatCasado = 0, custoCasado = 0
    const pacotesSemConsumo = [], consumoSemPacote = []
    for (const [k, a] of porChave) {
      if (a.fat > 0 && a.usos > 0) { fatCasado += a.fat; custoCasado += a.custo }
      else if (a.fat > 0) pacotesSemConsumo.push({ k, nome: nomes.get(k) || k, fat: a.fat, pessoas: a.pessoas, n: a.nPacotes })
      else if (a.usos > 0) consumoSemPacote.push({ k, nome: nomes.get(k) || k, custo: a.custo, usos: a.usos, desconto: a.desconto })
    }

    // Produtos sem custo no mês
    const semCusto = new Map()
    for (const c of consumoMes) {
      if (c.mes !== mes || !units.includes(c.unit) || c.temCusto) continue
      const x = semCusto.get(c.produto) || { produto: c.produto, usos: 0, desconto: 0 }
      x.usos += c.usos; x.desconto += c.desconto
      semCusto.set(c.produto, x)
    }

    const casasSemFat = units.filter((u) => fatTotalPeriodo(fatTotal, [u], { mes }) == null && tot.nPacotes > 0)

    return { tot, fatCasado, custoCasado, pacotesSemConsumo, consumoSemPacote, semCusto: [...semCusto.values()], casasSemFat }
  }, [pacotes, consumoMes, fatTotal, units.join(','), mes])

  const { tot } = r
  const cobertura = tot.usos ? 1 - tot.usosSemCusto / tot.usos : null

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div>
        <h1 className="text-lg font-bold text-brand-black">Conferência dos dados — {mesLabel(mes)}</h1>
        <p className="text-xs text-zinc-400">O que pode fazer o número não bater, e onde corrigir.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi label="Cobertura de custo" valor={pct(cobertura)} corValor={cobertura != null && cobertura < 0.95 ? '#B45309' : undefined}
          sub={`${num(tot.usosSemCusto)} de ${num(tot.usos)} itens sem custo`} />
        <Kpi label="Faturamento casado" valor={pct(tot.fat ? r.fatCasado / tot.fat : null)}
          sub="pacotes com promoção de mesmo nome" />
        <Kpi label="Custo casado" valor={pct(tot.custo ? r.custoCasado / tot.custo : null)}
          sub="consumo com pacote de mesmo nome" />
        <Kpi label="Fonte do custo no mês" valor={fonteCustoMes[mes] === 'diario' ? 'Diário' : 'Mensal'}
          sub={fonteCustoMes[mes] === 'diario' ? 'soma exata dos dias' : 'diário ainda processando'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card titulo="Pipeline / fontes">
          <table className="w-full text-[12.5px]">
            <tbody className="divide-y divide-zinc-100">
              <tr><td className="py-1.5 text-zinc-500">Diário processado até</td><td className="py-1.5 text-right font-mono">{dataBR(status?.diarioAte)}</td></tr>
              <tr><td className="py-1.5 text-zinc-500">Último dia fechado</td><td className="py-1.5 text-right font-mono">{dataBR(ultimoFechado)}</td></tr>
              <tr><td className="py-1.5 text-zinc-500">Dia operacional (06h→06h)</td><td className="py-1.5 text-right">{status?.janelaOperacional ? 'sim' : 'não'}</td></tr>
              <tr><td className="py-1.5 text-zinc-500">Cache gerado em</td><td className="py-1.5 text-right font-mono">{geradoEm ? new Date(geradoEm).toLocaleString('pt-BR') : '—'}</td></tr>
              <tr><td className="py-1.5 text-zinc-500">Ficha técnica</td><td className="py-1.5 text-right">{fichaAoVivo ? 'ao vivo (aba Ficha_Tecnica)' : 'cópia do cache'}</td></tr>
              <tr><td className="py-1.5 text-zinc-500">Faturamento total das casas</td><td className="py-1.5 text-right">{dados.temFaturamentoTotal ? 'ok' : 'indisponível'}</td></tr>
              {r.casasSemFat.length > 0 && (
                <tr><td className="py-1.5 text-zinc-500">Casas sem faturamento total no mês</td><td className="py-1.5 text-right">{r.casasSemFat.map(labelForUnit).join(', ')}</td></tr>
              )}
            </tbody>
          </table>
        </Card>

        <Card titulo="Colunas do relatório de Pacotes (ZIG)">
          <table className="w-full text-[12.5px]">
            <tbody className="divide-y divide-zinc-100">
              <tr><td className="py-1.5 text-zinc-500">Valor do pacote</td><td className="py-1.5 text-right font-mono">{brl(tot.valor)}</td></tr>
              <tr className={COLUNA_FATURAMENTO_PACOTE === 'faturamento' ? 'font-bold' : ''}><td className="py-1.5 text-zinc-500">Faturamento</td><td className="py-1.5 text-right font-mono">{brl(tot.faturamentoZig)}</td></tr>
              <tr><td className="py-1.5 text-zinc-500">Emitido NF</td><td className="py-1.5 text-right font-mono">{brl(tot.emitido)}</td></tr>
              <tr><td className="py-1.5 text-zinc-500">Pacotes / confirmados / convidados</td><td className="py-1.5 text-right font-mono">{num(tot.nPacotes)} / {num(tot.pessoas)} / {num(tot.convidados)}</td></tr>
            </tbody>
          </table>
          <p className="text-[10.5px] text-zinc-400 mt-2">
            O dashboard usa a coluna em negrito como faturamento (configurável em lib/promocoesConfig.js). Confira esses totais contra o relatório de Pacotes no painel da ZIG.
          </p>
        </Card>
      </div>

      <Card titulo={`Produtos consumidos em promoção sem custo na ficha técnica (${r.semCusto.length})`}>
        <TabelaOrdenavel
          colunas={[
            { id: 'produto', label: 'Produto (nome na ZIG)', align: 'left', valor: (x) => x.produto, className: 'font-medium' },
            { id: 'usos', label: 'Usos', valor: (x) => x.usos, render: (x) => num(x.usos) },
            { id: 'desconto', label: 'Desconto concedido', valor: (x) => x.desconto, render: (x) => brl(x.desconto) },
          ]}
          linhas={r.semCusto} chave={(x) => x.produto} ordemInicial={{ id: 'usos', dir: 'desc' }}
          vazia="Todos os itens têm custo 👌"
        />
        <p className="text-[10.5px] text-zinc-400 mt-2">
          O nome precisa bater com a coluna Produto da aba Ficha_Tecnica (maiúscula/acento/espaço duplo são ignorados). Inclua ou renomeie lá — o dashboard lê a ficha ao vivo.
        </p>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card titulo={`Pacotes sem consumo de mesmo nome (${r.pacotesSemConsumo.length})`}>
          <TabelaOrdenavel
            colunas={[
              { id: 'nome', label: 'Pacote', align: 'left', valor: (x) => x.nome, className: 'max-w-[240px] truncate' },
              { id: 'n', label: 'Qtd', valor: (x) => x.n },
              { id: 'pessoas', label: 'Pessoas', valor: (x) => x.pessoas, render: (x) => num(x.pessoas) },
              { id: 'fat', label: 'Faturamento', valor: (x) => x.fat, render: (x) => brl(x.fat) },
            ]}
            linhas={r.pacotesSemConsumo} chave={(x) => x.k} ordemInicial={{ id: 'fat', dir: 'desc' }} vazia="Nenhum."
          />
          <p className="text-[10.5px] text-zinc-400 mt-2">Receita sem custo associado → CMV dessa promoção não sai, e o CMV da categoria fica subestimado.</p>
        </Card>
        <Card titulo={`Consumo sem pacote de mesmo nome (${r.consumoSemPacote.length})`}>
          <TabelaOrdenavel
            colunas={[
              { id: 'nome', label: 'Promoção', align: 'left', valor: (x) => x.nome, className: 'max-w-[240px] truncate' },
              { id: 'usos', label: 'Usos', valor: (x) => x.usos, render: (x) => num(x.usos) },
              { id: 'custo', label: 'Custo', valor: (x) => x.custo, render: (x) => brl(x.custo) },
              { id: 'desconto', label: 'Desconto', valor: (x) => x.desconto, render: (x) => brl(x.desconto) },
            ]}
            linhas={r.consumoSemPacote} chave={(x) => x.k} ordemInicial={{ id: 'custo', dir: 'desc' }} vazia="Nenhum."
          />
          <p className="text-[10.5px] text-zinc-400 mt-2">Custo sem receita associada → infla o CMV da categoria. Normalmente é reserva cadastrada com nome do cliente.</p>
        </Card>
      </div>
    </div>
  )
}
