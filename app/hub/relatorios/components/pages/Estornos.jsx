import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, crossTab, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
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
  const motivoXCategoria = useMemo(
    () => crossTab(estornos, e => e.motivo || '(sem motivo)', e => e.categoria || '(sem categoria)', valorLinha),
    [estornos]
  )

  return (
    <>
      <Header title="Produtos Estornados" subtitle="Estornos e cancelamentos por unidade e funcionário" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Total de Estornos" valor={totalQtd.toLocaleString('pt-BR')} icon={RotateCcw} />
          <KpiCard label="Valor Total Estornado" valor={formatarReais(totalValor)} icon={TrendingDown} />
          <KpiCard label="Cancelados × Estornados" valor={`${qtdCancelados} / ${qtdEstornados}`} icon={XCircle} />
          <KpiCard label="Funcionários Envolvidos" valor={qtdFuncionarios} icon={Users} />
        </div>

        <Card titulo="Estornos por Unidade">
          <GraficoBarraUnidade dados={porUnidade} cor="#8C1414" />
        </Card>

        <Card titulo="Detalhe por Funcionário (quem estornou)">
          <Tabela
            colunas={[
              { chave: 'chave', titulo: 'Funcionário' },
              { chave: 'qtd', titulo: 'Qtd Estornos', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor Total', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            linhas={porFuncionario}
            chaveLinha={l => l.chave}
            limite={15}
          />
        </Card>

        <Card titulo="Motivo dos Estornos (Motivo × Categoria do Produto)">
          <Tabela
            colunas={[
              { chave: 'dimensao1', titulo: 'Motivo' },
              { chave: 'dimensao2', titulo: 'Categoria do Produto' },
              { chave: 'qtd', titulo: 'Qtd', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            linhas={motivoXCategoria}
            chaveLinha={l => `${l.dimensao1}||${l.dimensao2}`}
            limite={20}
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
              { chave: 'motivo', titulo: 'Motivo' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(valorLinha(l)) },
            ]}
            linhas={[...estornos].sort((a, b) => b.data.localeCompare(a.data))}
            chaveLinha={(l, idx) => `${l.data}-${l.produto}-${idx}`}
            limite={30}
          />
        </Card>
      </div>
    </>
  )
}
