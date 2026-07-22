import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import TabelaExpansivel from '../ui/TabelaExpansivel.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, crossTab, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
import { Trash2, Users, Receipt, TrendingDown } from 'lucide-react'

export default function Desperdicio() {
  const { desperdicio } = useRelatorios()

  const totalValor = useMemo(() => somar(desperdicio, d => d.valor), [desperdicio])
  const totalQtd = desperdicio.length
  const qtdFuncionarios = useMemo(() => contarDistintos(desperdicio, d => d.responsavel), [desperdicio])
  const ticketMedio = totalQtd > 0 ? totalValor / totalQtd : 0

  const qtdViaDesconto = desperdicio.filter(d => d.origem === 'Desconto').length
  const qtdViaEstorno = desperdicio.filter(d => d.origem === 'Estorno').length

  const porUnidade = useMemo(() => agruparPorUnidade(desperdicio, d => d.valor), [desperdicio])
  const porFuncionario = useMemo(
    () => agruparPorChave(desperdicio, d => d.responsavel, d => d.valor),
    [desperdicio]
  )
  const motivoXCategoria = useMemo(
    () => crossTab(desperdicio, d => d.motivo || '(sem motivo)', d => d.categoria || '(sem categoria)', d => d.valor),
    [desperdicio]
  )

  return (
    <>
      <Header
        title="Desperdício"
        subtitle="Lançamentos de desperdício (via desconto ou estorno), consolidados"
        dadosExport={desperdicio}
        nomeArquivoExport="desperdicio"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Total de Desperdício" valor={formatarReais(totalValor)} icon={Trash2} />
          <KpiCard label="Qtd de Lançamentos" valor={totalQtd.toLocaleString('pt-BR')} icon={Receipt} />
          <KpiCard label="Via Desconto × Via Estorno" valor={`${qtdViaDesconto} / ${qtdViaEstorno}`} icon={TrendingDown} />
          <KpiCard label="Funcionários Envolvidos" valor={qtdFuncionarios} icon={Users} />
        </div>

        <Card titulo="Desperdício por Unidade">
          <GraficoBarraUnidade dados={porUnidade} cor="#B45309" />
        </Card>

        <Card titulo="Detalhe por Funcionário (quem lançou)">
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px' }}>Clica num funcionário pra ver os lançamentos individuais</p>
          <TabelaExpansivel
            linhasResumo={porFuncionario}
            colunasResumo={[
              { chave: 'chave', titulo: 'Funcionário' },
              { chave: 'qtd', titulo: 'Qtd', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor Total', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            dadosDetalhe={desperdicio}
            campoAgrupador="responsavel"
            ordenarDetalhePor="data"
            colunasDetalhe={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'origem', titulo: 'Origem' },
              { chave: 'cliente', titulo: 'Comanda/Cliente' },
              { chave: 'motivo', titulo: 'Motivo' },
              { chave: 'categoria', titulo: 'Categoria' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
          />
        </Card>

        <Card titulo="Motivo do Desperdício (Motivo × Categoria)">
          <Tabela
            colunas={[
              { chave: 'dimensao1', titulo: 'Motivo' },
              { chave: 'dimensao2', titulo: 'Categoria' },
              { chave: 'qtd', titulo: 'Qtd', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            linhas={motivoXCategoria}
            chaveLinha={l => `${l.dimensao1}||${l.dimensao2}`}
            limite={20}
          />
        </Card>

        <Card titulo="Últimos Lançamentos de Desperdício">
          <Tabela
            colunas={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'origem', titulo: 'Origem' },
              { chave: 'responsavel', titulo: 'Funcionário' },
              { chave: 'cliente', titulo: 'Comanda/Cliente' },
              { chave: 'motivo', titulo: 'Motivo' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            linhas={[...desperdicio].sort((a, b) => b.data.localeCompare(a.data))}
            chaveLinha={(l, idx) => `${l.data}-${l.responsavel}-${idx}`}
            limite={30}
          />
        </Card>
      </div>
    </>
  )
}
