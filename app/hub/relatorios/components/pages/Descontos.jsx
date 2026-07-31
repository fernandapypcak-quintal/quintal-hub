import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import TabelaExpansivel from '../ui/TabelaExpansivel.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import ParetoBloco from '../ui/ParetoBloco.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, paretoPorChave, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
import { Percent, Users, Receipt, TrendingDown } from 'lucide-react'

export default function Descontos() {
  const { descontos } = useRelatorios()

  const totalValor = useMemo(() => somar(descontos, d => d.valor), [descontos])
  const totalQtd = descontos.length
  const qtdFuncionarios = useMemo(() => contarDistintos(descontos, d => d.funcionario), [descontos])
  const ticketMedio = totalQtd > 0 ? totalValor / totalQtd : 0

  const porUnidade = useMemo(() => agruparPorUnidade(descontos, d => d.valor), [descontos])
  const porFuncionario = useMemo(() => agruparPorChave(descontos, d => d.funcionario, d => d.valor), [descontos])
  const paretoFuncionarios = useMemo(() => paretoPorChave(descontos, d => d.funcionario, d => d.valor), [descontos])
  const paretoMotivos = useMemo(
    () => paretoPorChave(descontos, d => d.motivoCompleto || '(sem motivo)', d => d.valor),
    [descontos]
  )

  return (
    <>
      <Header
        title="Descontos"
        subtitle="Descontos aplicados por unidade e funcionário"
        dadosExport={descontos}
        nomeArquivoExport="descontos"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Total de Descontos" valor={totalQtd.toLocaleString('pt-BR')} icon={Receipt} />
          <KpiCard label="Valor Total Descontado" valor={formatarReais(totalValor)} icon={TrendingDown} />
          <KpiCard label="Ticket Médio" valor={formatarReais(ticketMedio)} icon={Percent} />
          <KpiCard label="Funcionários Envolvidos" valor={qtdFuncionarios} icon={Users} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card titulo="Descontos por Unidade">
            <GraficoBarraUnidade dados={porUnidade} cor="#EA580C" />
          </Card>

          <Card titulo="Ranking de Funcionários">
            <Tabela
              colunas={[
                { chave: 'chave', titulo: 'Funcionário' },
                { chave: 'qtd', titulo: 'Qtd', alinhamento: 'right' },
                { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
              ]}
              linhas={porFuncionario}
              chaveLinha={l => l.chave}
              limite={8}
            />
          </Card>
        </div>

        <Card titulo="Detalhe por Funcionário">
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px' }}>Clica num funcionário pra ver os lançamentos individuais</p>
          <TabelaExpansivel
            linhasResumo={porFuncionario}
            colunasResumo={[
              { chave: 'chave', titulo: 'Funcionário' },
              { chave: 'qtd', titulo: 'Qtd Descontos', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor Total', alinhamento: 'right', render: l => formatarReais(l.valor) },
              { chave: 'ticket', titulo: 'Ticket Médio', alinhamento: 'right', render: l => formatarReais(l.qtd > 0 ? l.valor / l.qtd : 0) },
            ]}
            dadosDetalhe={descontos}
            campoAgrupador="funcionario"
            ordenarDetalhePor="data"
            colunasDetalhe={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'cliente', titulo: 'Cliente' },
              { chave: 'motivoCompleto', titulo: 'Motivo' },
              { chave: 'produtos', titulo: 'Produtos' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
          />
        </Card>

        <ParetoBloco
          titulo="Pareto de Funcionários (quem mais deu desconto)"
          dados={paretoFuncionarios}
          tituloItem="Funcionário"
          cor="#EA580C"
        />

        <ParetoBloco
          titulo="Pareto de Motivos (Justificativa + Categoria)"
          dados={paretoMotivos}
          tituloItem="Motivo"
          cor="#B45309"
        />

        <Card titulo="Últimos Descontos Lançados">
          <Tabela
            colunas={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'funcionario', titulo: 'Funcionário' },
              { chave: 'cliente', titulo: 'Cliente' },
              { chave: 'motivoCompleto', titulo: 'Motivo' },
              { chave: 'produtos', titulo: 'Produtos' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            linhas={[...descontos].sort((a, b) => b.data.localeCompare(a.data))}
            chaveLinha={(l, idx) => `${l.data}-${l.funcionario}-${idx}`}
            limite={30}
          />
        </Card>
      </div>
    </>
  )
}
