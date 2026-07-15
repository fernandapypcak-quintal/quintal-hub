import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, somar } from '../../hooks/useRelatorios.jsx'
import { Award, Receipt, Clock, Ticket } from 'lucide-react'

function diasEntre(dataIni, dataFim) {
  if (!dataIni || !dataFim) return null
  const ini = new Date(dataIni + 'T00:00:00')
  const fim = new Date(dataFim + 'T00:00:00')
  return Math.round((fim.getTime() - ini.getTime()) / (1000 * 60 * 60 * 24))
}

export default function BonusUtilizado() {
  const { bonusUtilizado } = useRelatorios()

  const totalUtilizado = useMemo(() => somar(bonusUtilizado, b => b.valorUtilizado), [bonusUtilizado])
  const totalQtd = bonusUtilizado.length

  const diasMedios = useMemo(() => {
    const diffs = bonusUtilizado
      .map(b => diasEntre(b.concedidoEm, b.utilizadoEm))
      .filter(d => d !== null && d >= 0)
    if (diffs.length === 0) return 0
    return diffs.reduce((a, b) => a + b, 0) / diffs.length
  }, [bonusUtilizado])

  const porUnidade = useMemo(() => agruparPorUnidade(bonusUtilizado, b => b.valorUtilizado), [bonusUtilizado])
  const porConcedente = useMemo(
    () => agruparPorChave(bonusUtilizado, b => b.concedidoPor, b => b.valorUtilizado),
    [bonusUtilizado]
  )

  return (
    <>
      <Header title="Bônus Utilizado" subtitle="Consumo dos bônus concedidos, uso por uso" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Total Utilizado" valor={formatarReais(totalUtilizado)} icon={Award} />
          <KpiCard label="Qtd de Usos" valor={totalQtd.toLocaleString('pt-BR')} icon={Receipt} />
          <KpiCard label="Tempo Médio Até o Uso" valor={`${diasMedios.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias`} icon={Clock} />
          <KpiCard label="Ticket Médio por Uso" valor={formatarReais(totalQtd > 0 ? totalUtilizado / totalQtd : 0)} icon={Ticket} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <Card titulo="Bônus Utilizado por Unidade">
            <GraficoBarraUnidade dados={porUnidade} cor="#6366f1" />
          </Card>

          <Card titulo="Por Quem Concedeu o Bônus Original">
            <Tabela
              colunas={[
                { chave: 'chave', titulo: 'Concedido Por' },
                { chave: 'qtd', titulo: 'Qtd Usos', alinhamento: 'right' },
                { chave: 'valor', titulo: 'Valor Utilizado', alinhamento: 'right', render: l => formatarReais(l.valor) },
              ]}
              linhas={porConcedente}
              chaveLinha={l => l.chave}
              limite={8}
            />
          </Card>
        </div>

        <Card titulo="Últimos Usos de Bônus">
          <Tabela
            colunas={[
              { chave: 'cliente', titulo: 'Cliente' },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'concedidoEm', titulo: 'Concedido Em', render: l => formatarData(l.concedidoEm) },
              { chave: 'utilizadoEm', titulo: 'Utilizado Em', render: l => formatarData(l.utilizadoEm) },
              { chave: 'motivo', titulo: 'Motivo' },
              { chave: 'valorUtilizado', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valorUtilizado) },
            ]}
            linhas={[...bonusUtilizado].sort((a, b) => b.utilizadoEm.localeCompare(a.utilizadoEm))}
            chaveLinha={(l, idx) => `${l.cliente}-${l.utilizadoEm}-${idx}`}
            limite={40}
          />
        </Card>
      </div>
    </>
  )
}
