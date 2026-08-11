import React, { useMemo, useState } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import TabelaExpansivel from '../ui/TabelaExpansivel.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import PainelPareto from '../ui/PainelPareto.jsx'
import ParetoChart from '../ui/ParetoChart.jsx'
import ImpressaoDetalhe from '../ui/ImpressaoDetalhe.jsx'
import ComparativoMensal from '../ui/ComparativoMensal.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, paretoPorChave, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
import { Trash2, Users, Receipt, TrendingDown, Printer } from 'lucide-react'

export default function Desperdicio() {
  const { desperdicio, desperdicioBruto } = useRelatorios()
  const [mostrarImpressao, setMostrarImpressao] = useState(false)

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
  const paretoFuncionarios = useMemo(
    () => paretoPorChave(desperdicio, d => d.responsavel, d => d.valor),
    [desperdicio]
  )
  const paretoMotivos = useMemo(
    () => paretoPorChave(desperdicio, d => d.motivoCompleto || d.motivo || '(sem motivo)', d => d.valor),
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

        <ComparativoMensal
          titulo="Desperdício — Comparativo de Períodos"
          dadosBruto={desperdicioBruto}
          campoData="data"
          extrairValor={d => d.valor}
        />

        <PainelPareto
          titulo="Onde Atuar"
          subtitulo="Quem mais lançou desperdício e quais motivos concentram o valor — os destacados somam 80% do total"
          paretoResponsavel={paretoFuncionarios}
          labelResponsavel="Funcionário"
          corResponsavel="#B45309"
          paretoMotivo={paretoMotivos}
          labelMotivo="Motivo"
          corMotivo="#8C1414"
          limite={10}
        />

        <Card titulo="Gráfico de Pareto — Motivos do Desperdício">
          <ParetoChart dados={paretoMotivos} cor="#4472C4" corLinha="#C00000" limite={10} />
        </Card>

        <Card titulo="Desperdício por Unidade">
          <GraficoBarraUnidade dados={porUnidade} cor="#B45309" />
        </Card>

        <Card titulo={null}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h2 style={{ fontSize: 13, fontWeight: 600, color: '#333', margin: 0 }}>Detalhe por Funcionário (quem lançou)</h2>
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
                titulo="Resumo de Desperdício — Detalhe por Funcionário"
                dadosDetalhe={desperdicio}
                campoAgrupador="responsavel"
                campoValor={d => d.valor}
                colunasDetalhe={[
                  { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
                  { chave: 'unidade', titulo: 'Unidade' },
                  { chave: 'origem', titulo: 'Origem' },
                  { chave: 'cliente', titulo: 'Comanda/Cliente' },
                  { chave: 'produto', titulo: 'Produto' },
                  { chave: 'motivoCompleto', titulo: 'Motivo', render: l => l.motivoCompleto || l.motivo },
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
                  { chave: 'produto', titulo: 'Produto' },
                  { chave: 'motivoCompleto', titulo: 'Motivo', render: l => l.motivoCompleto || l.motivo },
                  { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
                ]}
              />
            </>
          )}
        </Card>

        <Card titulo="Últimos Lançamentos de Desperdício">
          <Tabela
            colunas={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'origem', titulo: 'Origem' },
              { chave: 'responsavel', titulo: 'Funcionário' },
              { chave: 'cliente', titulo: 'Comanda/Cliente' },
              { chave: 'produto', titulo: 'Produto' },
              { chave: 'motivoCompleto', titulo: 'Motivo', render: l => l.motivoCompleto || l.motivo },
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
