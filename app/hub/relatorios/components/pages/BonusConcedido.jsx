import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import TabelaExpansivel from '../ui/TabelaExpansivel.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import ComparativoMensal from '../ui/ComparativoMensal.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, crossTab, somar } from '../../hooks/useRelatorios.jsx'
import { Gift, Receipt, Wallet2, PiggyBank } from 'lucide-react'

export default function BonusConcedido() {
  const { bonusConcedido, bonusConcedidoBruto } = useRelatorios()

  const totalConcedido = useMemo(() => somar(bonusConcedido, b => b.valorRecebido), [bonusConcedido])
  const totalJaGasto = useMemo(
    () => somar(bonusConcedido, b => b.valorGastoNoPeriodo + b.valorGastoEmOutroPeriodo),
    [bonusConcedido]
  )
  const totalQtd = bonusConcedido.length
  const saldoNaoUsado = totalConcedido - totalJaGasto

  const porUnidade = useMemo(() => agruparPorUnidade(bonusConcedido, b => b.valorRecebido), [bonusConcedido])
  const porConcedente = useMemo(
    () => agruparPorChave(bonusConcedido, b => b.concedidoPor, b => b.valorRecebido),
    [bonusConcedido]
  )
  const motivoXCategoria = useMemo(
    () => crossTab(bonusConcedido, b => b.motivo || '(sem motivo)', b => b.categoria || '(sem categoria)', b => b.valorRecebido),
    [bonusConcedido]
  )

  return (
    <>
      <Header
        title="Bônus Concedido"
        subtitle="Bônus dados a clientes, por unidade e responsável"
        dadosExport={bonusConcedido}
        nomeArquivoExport="bonus_concedido"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Total Concedido" valor={formatarReais(totalConcedido)} icon={Gift} />
          <KpiCard label="Qtd de Concessões" valor={totalQtd.toLocaleString('pt-BR')} icon={Receipt} />
          <KpiCard label="Já Utilizado (Total)" valor={formatarReais(totalJaGasto)} icon={Wallet2} />
          <KpiCard label="Saldo Ainda Não Usado" valor={formatarReais(saldoNaoUsado)} icon={PiggyBank} />
        </div>

        <ComparativoMensal
          titulo="Bônus Concedido — Comparativo de Períodos"
          dadosBruto={bonusConcedidoBruto}
          campoData="dataConcessao"
          extrairValor={b => b.valorRecebido}
        />

        <Card titulo="Bônus Concedido por Unidade">
          <GraficoBarraUnidade dados={porUnidade} cor="#97A624" />
        </Card>

        <Card titulo="Quem Mais Concedeu Bônus">
          <p style={{ fontSize: 12, color: '#999', margin: '0 0 12px' }}>Clica num responsável pra ver as concessões individuais</p>
          <TabelaExpansivel
            linhasResumo={porConcedente}
            colunasResumo={[
              { chave: 'chave', titulo: 'Concedido Por' },
              { chave: 'qtd', titulo: 'Qtd', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            dadosDetalhe={bonusConcedido}
            campoAgrupador="concedidoPor"
            ordenarDetalhePor="dataConcessao"
            colunasDetalhe={[
              { chave: 'dataConcessao', titulo: 'Data', render: l => formatarData(l.dataConcessao) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'cliente', titulo: 'Cliente' },
              { chave: 'motivo', titulo: 'Motivo' },
              { chave: 'valorRecebido', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valorRecebido) },
            ]}
          />
        </Card>

        <Card titulo="Motivo da Concessão (Motivo × Categoria)">
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

        <Card titulo="Últimas Concessões">
          <Tabela
            colunas={[
              { chave: 'dataConcessao', titulo: 'Data', render: l => formatarData(l.dataConcessao) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'cliente', titulo: 'Cliente' },
              { chave: 'concedidoPor', titulo: 'Concedido Por' },
              { chave: 'motivo', titulo: 'Motivo' },
              { chave: 'valorRecebido', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valorRecebido) },
            ]}
            linhas={[...bonusConcedido].sort((a, b) => b.dataConcessao.localeCompare(a.dataConcessao))}
            chaveLinha={(l, idx) => `${l.dataConcessao}-${l.cliente}-${idx}`}
            limite={30}
          />
        </Card>
      </div>
    </>
  )
}
