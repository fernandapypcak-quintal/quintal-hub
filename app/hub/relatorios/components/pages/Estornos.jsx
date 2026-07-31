import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import TabelaExpansivel from '../ui/TabelaExpansivel.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import PainelPareto from '../ui/PainelPareto.jsx'
import ParetoChart from '../ui/ParetoChart.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, paretoPorChave, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
import { RotateCcw, Users, XCircle, TrendingDown } from 'lucide-react'

export default function Estornos() {
  const { estornos } = useRelatorios()

  const valorLinha = e => e.valorUnitario * (e.quantidade || 1)

  const totalValor = useMemo(() => somar(estornos, valorLinha), [estornos])
  const totalQtd = estornos.length
  const qtdFuncionarios = useMemo(() => contarDistintos(estornos, e => e.estornadoPor), [estornos])
  const qtdCancelados = estornos.filter(e => e.tipo === 'Cancelado').length
  const qtdEstornados = estornos.filter(e => e.tipo === 'Estornado').length

  const porUnidade = useMemo(() => agruparPorUnidade(estornos, valorLinha), [estornos])
  const porFuncionario = useMemo(() => agruparPorChave(estornos, e => e.estornadoPor, valorLinha), [estornos])
  const paretoFuncionarios = useMemo(() => paretoPorChave(estornos, e => e.estornadoPor, valorLinha), [estornos])
  const paretoMotivos = useMemo(
    () => paretoPorChave(estornos, e => e.motivoCompleto || '(sem motivo)', valorLinha),
    [estornos]
  )

  // enriquece cada linha com o valor total (unitario x quantidade), pra
  // a tabela expansivel e a exportacao mostrarem o valor certo direto
  const estornosComValor = useMemo(
    () => estornos.map(e => ({ ...e, valorTotal: valorLinha(e) })),
    [estornos]
  )

  return (
    <>
      <Header
        title="Produtos Estornados"
        subtitle="Estornos e cancelamentos por unidade e funcionário"
        dadosExport={estornosComValor}
        nomeArquivoExport="estornos"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Total de Estornos" valor={totalQtd.toLocaleString('pt-BR')} icon={RotateCcw} />
          <KpiCard label="Valor Total Estornado" valor={formatarReais(totalValor)} icon={TrendingDown} />
          <KpiCard label="Cancelados × Estornados" valor={`${qtdCancelados} / ${qtdEstornados}`} icon={XCircle} />
          <KpiCard label="Funcionários Envolvidos" valor={qtdFuncionarios} icon={Users} />
        </div>

        <PainelPareto
          titulo="Onde Atuar"
          subtitulo="Quem mais estornou e quais motivos concentram o valor — os destacados somam 80% do total"
          paretoResponsavel={paretoFuncionarios}
          labelResponsavel="Funcionário"
          corResponsavel="#8C1414"
          paretoMotivo={paretoMotivos}
          labelMotivo="Motivo"
          corMotivo="#B45309"
          limite={10}
        />

        <Card titulo="Gráfico de Pareto — Motivos do Estorno">
          <ParetoChart dados={paretoMotivos} cor="#4472C4" corLinha="#C00000" limite={10} />
        </Card>

        <Card titulo="Estornos por Unidade">
          <GraficoBarraUnidade dados={porUnidade} cor="#8C1414" />
        </Card>

        <Card titulo="Detalhe por Funcionário (quem estornou)">
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px' }}>Clica num funcionário pra ver os estornos individuais</p>
          <TabelaExpansivel
            linhasResumo={porFuncionario}
            colunasResumo={[
              { chave: 'chave', titulo: 'Funcionário' },
              { chave: 'qtd', titulo: 'Qtd Estornos', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor Total', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            dadosDetalhe={estornosComValor}
            campoAgrupador="estornadoPor"
            ordenarDetalhePor="data"
            colunasDetalhe={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'produto', titulo: 'Produto' },
              { chave: 'tipo', titulo: 'Tipo' },
              { chave: 'motivoCompleto', titulo: 'Motivo' },
              { chave: 'valorTotal', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valorTotal) },
            ]}
          />
        </Card>

        <Card titulo="Últimos Estornos Lançados">
          <Tabela
            colunas={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'produto', titulo: 'Produto' },
              { chave: 'tipo', titulo: 'Tipo' },
              { chave: 'estornadoPor', titulo: 'Estornado Por' },
              { chave: 'motivoCompleto', titulo: 'Motivo' },
              { chave: 'valorTotal', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valorTotal) },
            ]}
            linhas={[...estornosComValor].sort((a, b) => b.data.localeCompare(a.data))}
            chaveLinha={(l, idx) => `${l.data}-${l.produto}-${idx}`}
            limite={30}
          />
        </Card>
      </div>
    </>
  )
}
