// app/hub/promocoes/components/DetalheSeparado.jsx
// Pacotes (pessoas/receita) e Promoções (consumo/custo) lado a lado, sem cruzar.
'use client'

import { agruparPacotes, agruparConsumo } from '../data/modelo'
import { TabelaOrdenavel, CmvTxt, brl, num, pct } from './ui'

export default function DetalheSeparado({ dados, filtro }) {
  const { pacotes, consumoMes, consumoDia, nomes, categoriaDaChave } = dados
  const consumo = filtro.data ? consumoDia : consumoMes
  const pac = [...agruparPacotes(pacotes, filtro, (p) => p.chave).entries()].map(([k, a]) => ({ k, nome: nomes.get(k) || k, ...a }))
  const pro = [...agruparConsumo(consumo, filtro, (c) => c.chave).entries()].map(([k, a]) => ({ k, nome: nomes.get(k) || k, tipo: categoriaDaChave.get(k) || '—', ...a }))

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="bg-white rounded-lg border border-zinc-100 p-2">
        <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">Pacotes ({pac.length})</p>
        <TabelaOrdenavel
          colunas={[
            { id: 'nome', label: 'Pacote', align: 'left', valor: (x) => x.nome, className: 'font-medium max-w-[220px] truncate' },
            { id: 'pessoas', label: 'Pessoas', valor: (x) => x.pessoas, render: (x) => num(x.pessoas) },
            { id: 'fat', label: 'Receita', valor: (x) => x.fat, render: (x) => brl(x.fat) },
            { id: 'ticket', label: 'Ticket', valor: (x) => x.ticket, render: (x) => brl(x.ticket) },
            { id: 'cmv', label: 'CMV (est.)', valor: (x) => x.cmv, render: (x) => <CmvTxt v={x.cmv} /> },
          ]}
          linhas={pac} chave={(x) => x.k} ordemInicial={{ id: 'fat', dir: 'desc' }} vazia="Nenhum pacote."
        />
      </div>
      <div className="bg-white rounded-lg border border-zinc-100 p-2">
        <p className="text-[10.5px] font-bold text-zinc-400 uppercase tracking-wide px-2 pt-1">Promoções ({pro.length})</p>
        <TabelaOrdenavel
          colunas={[
            { id: 'nome', label: 'Promoção', align: 'left', valor: (x) => x.nome, className: 'font-medium max-w-[200px] truncate' },
            { id: 'usos', label: 'Usos', valor: (x) => x.usos, render: (x) => num(x.usos) },
            { id: 'cardapio', label: 'Cardápio', valor: (x) => x.cardapio, render: (x) => brl(x.cardapio) },
            { id: 'custo', label: 'Custo', valor: (x) => x.custo, render: (x) => brl(x.custo) },
            { id: 'cmvCardapio', label: 'CMV s/ cardápio', valor: (x) => x.cmvCardapio, render: (x) => <CmvTxt v={x.cmvCardapio} /> },
          ]}
          linhas={pro} chave={(x) => x.k} ordemInicial={{ id: 'custo', dir: 'desc' }} vazia="Nenhuma promoção."
        />
      </div>
    </div>
  )
}
