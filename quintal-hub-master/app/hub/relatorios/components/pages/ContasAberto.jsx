import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais } from '../ui/Tabela.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import { useRelatorios, agruparPorUnidade, somar } from '../../hooks/useRelatorios.jsx'
import { Wallet, TrendingUp, CheckCircle2, Users } from 'lucide-react'

export default function ContasAberto() {
  const { contasAberto } = useRelatorios()

  const totalAindaEmAberto = useMemo(() => somar(contasAberto, c => c.aindaEmAberto), [contasAberto])
  const totalJaPago = useMemo(() => somar(contasAberto, c => c.pagoAposEvento), [contasAberto])
  const totalGeral = useMemo(() => somar(contasAberto, c => c.totalEmAberto), [contasAberto])
  const qtdClientesComPendencia = contasAberto.filter(c => (c.aindaEmAberto || 0) > 0).length

  const porUnidade = useMemo(() => agruparPorUnidade(contasAberto, c => c.aindaEmAberto), [contasAberto])

  const clientesOrdenados = useMemo(
    () => [...contasAberto].sort((a, b) => (b.aindaEmAberto || 0) - (a.aindaEmAberto || 0)),
    [contasAberto]
  )

  return (
    <>
      <Header title="Contas em Aberto" subtitle="Pendências de pagamento por unidade e cliente" />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Ainda em Aberto" valor={formatarReais(totalAindaEmAberto)} icon={Wallet} />
          <KpiCard label="Total Gerado no Período" valor={formatarReais(totalGeral)} icon={TrendingUp} />
          <KpiCard label="Pago Após o Evento" valor={formatarReais(totalJaPago)} icon={CheckCircle2} />
          <KpiCard label="Clientes com Pendência" valor={qtdClientesComPendencia} icon={Users} />
        </div>

        <Card titulo="Ainda em Aberto por Unidade">
          <GraficoBarraUnidade dados={porUnidade} cor="#D9B504" />
        </Card>

        <Card titulo="Clientes com Contas em Aberto (maior pendência primeiro)">
          <Tabela
            colunas={[
              { chave: 'nome', titulo: 'Nome' },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'telefone', titulo: 'Telefone' },
              { chave: 'totalEmAberto', titulo: 'Total Gerado', alinhamento: 'right', render: l => formatarReais(l.totalEmAberto) },
              { chave: 'pagoAposEvento', titulo: 'Pago Após Evento', alinhamento: 'right', render: l => formatarReais(l.pagoAposEvento) },
              { chave: 'aindaEmAberto', titulo: 'Ainda em Aberto', alinhamento: 'right', render: l => formatarReais(l.aindaEmAberto) },
            ]}
            linhas={clientesOrdenados}
            chaveLinha={(l, idx) => `${l.nome}-${l.cpf}-${idx}`}
            limite={50}
          />
        </Card>
      </div>
    </>
  )
}
