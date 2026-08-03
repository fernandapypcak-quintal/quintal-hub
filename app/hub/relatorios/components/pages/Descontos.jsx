import React, { useMemo, useState } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import TabelaExpansivel from '../ui/TabelaExpansivel.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import PainelPareto from '../ui/PainelPareto.jsx'
import ParetoChart from '../ui/ParetoChart.jsx'
import ImpressaoDetalhe from '../ui/ImpressaoDetalhe.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, paretoPorChave, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
import { Percent, Users, Receipt, TrendingDown, Printer } from 'lucide-react'

export default function Descontos() {
  const { descontos } = useRelatorios()
  const [mostrarImpressao, setMostrarImpressao] = useState(false)

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

        <PainelPareto
          titulo="Onde Atuar"
          subtitulo="Quem mais deu desconto e quais motivos concentram o valor — os destacados somam 80% do total"
          paretoResponsavel={paretoFuncionarios}
          labelResponsavel="Funcionário"
          corResponsavel="#EA580C"
          paretoMotivo={paretoMotivos}
          labelMotivo="Motivo (Justificativa + Categoria)"
          corMotivo="#B45309"
          limite={10}
        />

        <Card titulo="Gráfico de Pareto — Motivos do Desconto">
          <ParetoChart dados={paretoMotivos} cor="#4472C4" corLinha="#C00000" limite={10} />
        </Card>

        <Card titulo="Descontos por Unidade">
          <GraficoBarraUnidade dados={porUnidade} cor="#EA580C" />
        </Card>

        <Card titulo={null}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: 0 }}>Detalhe por Funcionário</h2>
            <button
              onClick={() => setMostrarImpressao(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, height: 30, padding: '0 14px',
                borderRadius: 99, border: mostrarImpressao ? '1px solid #1a1a1a' : '1px solid #E8E8E8',
                background: mostrarImpressao ? '#1a1a1a' : '#fff', color: mostrarImpressao ? '#fff' : '#666',
                fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <Printer size={13} /> {mostrarImpressao ? 'Fechar impressão' : 'Imprimir Detalhe'}
            </button>
          </div>

          {mostrarImpressao ? (
            <div style={{ marginTop: 12 }}>
              <ImpressaoDetalhe
                titulo="Resumo de Descontos — Detalhe por Funcionário"
                dadosDetalhe={descontos}
                campoAgrupador="funcionario"
                campoValor={d => d.valor}
                colunasDetalhe={[
                  { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
                  { chave: 'unidade', titulo: 'Unidade' },
                  { chave: 'cliente', titulo: 'Cliente' },
                  { chave: 'motivoCompleto', titulo: 'Motivo' },
                  { chave: 'produtos', titulo: 'Produtos' },
                  { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
                ]}
              />
            </div>
          ) : (
            <>
              <p style={{ fontSize: 12, color: '#999', margin: '12px 0 12px' }}>Clica num funcionário pra ver os lançamentos individuais</p>
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
            </>
          )}
        </Card>

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
