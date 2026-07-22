import React from 'react'
import { useRelatorios, somar } from '../../hooks/useRelatorios.jsx'
import { formatarReais } from '../ui/Tabela.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import { Card } from '../ui/GraficoBarraUnidade.jsx'
import { Percent, RotateCcw, Wallet, Gift, Award, Trash2 } from 'lucide-react'

export default function Home() {
  const { descontos, estornos, desperdicio, contasAberto, bonusConcedido, bonusUtilizado } = useRelatorios()

  const totalDescontos = somar(descontos, d => d.valor)
  const totalEstornos = somar(estornos, e => e.valorUnitario * (e.quantidade || 1))
  const totalDesperdicio = somar(desperdicio, d => d.valor)
  const totalAindaEmAberto = somar(contasAberto, c => c.aindaEmAberto)
  const totalBonusConcedido = somar(bonusConcedido, b => b.valorRecebido)
  const totalBonusUtilizado = somar(bonusUtilizado, b => b.valorUtilizado)

  return (
    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>Visão Geral</h1>
        <p style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
          Resumo de descontos, estornos, desperdício, contas em aberto e bônus — todas as unidades
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
        <KpiCard label="Descontos" valor={formatarReais(totalDescontos)} subtitulo={`${descontos.length} lançamentos`} icon={Percent} />
        <KpiCard label="Estornos" valor={formatarReais(totalEstornos)} subtitulo={`${estornos.length} lançamentos`} icon={RotateCcw} />
        <KpiCard label="Desperdício" valor={formatarReais(totalDesperdicio)} subtitulo={`${desperdicio.length} lançamentos`} icon={Trash2} />
        <KpiCard label="Ainda em Aberto" valor={formatarReais(totalAindaEmAberto)} subtitulo={`${contasAberto.filter(c => c.aindaEmAberto > 0).length} clientes`} icon={Wallet} />
        <KpiCard label="Bônus Concedido" valor={formatarReais(totalBonusConcedido)} subtitulo={`${bonusConcedido.length} concessões`} icon={Gift} />
        <KpiCard label="Bônus Utilizado" valor={formatarReais(totalBonusUtilizado)} subtitulo={`${bonusUtilizado.length} usos`} icon={Award} />
      </div>

      <Card titulo="Navegação">
        <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, margin: 0 }}>
          Use o menu lateral (ou a barra inferior no celular) pra ver o detalhe de cada
          relatório — por unidade, por funcionário e o motivo por trás de cada lançamento.
        </p>
      </Card>
    </div>
  )
}
