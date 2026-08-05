import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import { formatarReais, formatarData } from '../ui/formatar.js'
import { useKids, agruparPorUnidade, somar } from '../../hooks/useKids.jsx'
import { Baby, ShoppingBag, PartyPopper, Wallet2, PiggyBank, TrendingUp } from 'lucide-react'

export default function Home() {
  const { criancas, combo, faturamentoDomShow, inflaveis, shows } = useKids()

  const totalCriancas = useMemo(() => somar(criancas, c => c.qtdCriancas), [criancas])
  const totalComboQtd = useMemo(() => somar(combo, c => c.qtdVendida), [combo])
  const totalComboValor = useMemo(() => somar(combo, c => c.valor), [combo])
  const totalFaturamentoDom = useMemo(() => somar(faturamentoDomShow, f => f.valor), [faturamentoDomShow])
  const totalGastoInflaveis = useMemo(() => somar(inflaveis, i => i.valor), [inflaveis])
  const totalGastoShows = useMemo(() => somar(shows, s => s.valor), [shows])
  const totalGasto = totalGastoInflaveis + totalGastoShows
  const totalReceita = totalComboValor + totalFaturamentoDom
  const resultado = totalReceita - totalGasto

  const criancasPorUnidade = useMemo(
    () => agruparPorUnidade(criancas, c => c.qtdCriancas),
    [criancas]
  )
  const gastoPorUnidade = useMemo(() => {
    const mapa = {}
    inflaveis.forEach(i => {
      const chave = i.unidade || '(não informado)'
      if (!mapa[chave]) mapa[chave] = { chave, valor: 0 }
      mapa[chave].valor += i.valor
    })
    shows.forEach(s => {
      const chave = s.unidade || '(não informado)'
      if (!mapa[chave]) mapa[chave] = { chave, valor: 0 }
      mapa[chave].valor += s.valor
    })
    return Object.values(mapa).sort((a, b) => b.valor - a.valor)
  }, [inflaveis, shows])

  const proximosShows = useMemo(
    () => [...shows]
      .filter(s => s.data >= new Date().toISOString().slice(0, 10))
      .sort((a, b) => a.data.localeCompare(b.data))
      .slice(0, 10),
    [shows]
  )

  return (
    <>
      <Header
        title="Kids"
        subtitle="Crianças, Combo Quintal Feliz, shows e infláveis"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Crianças na Kids" valor={totalCriancas.toLocaleString('pt-BR')} icon={Baby} />
          <KpiCard
            label="Combo Quintal Feliz"
            valor={totalComboQtd.toLocaleString('pt-BR')}
            subtitulo={formatarReais(totalComboValor)}
            icon={ShoppingBag}
          />
          <KpiCard label="Faturamento Dom. 12h-14h" valor={formatarReais(totalFaturamentoDom)} icon={PartyPopper} />
          <KpiCard label="Gasto Infláveis" valor={formatarReais(totalGastoInflaveis)} icon={Wallet2} />
          <KpiCard label="Gasto Shows" valor={formatarReais(totalGastoShows)} icon={PiggyBank} />
          <KpiCard
            label="Resultado Kids"
            valor={formatarReais(resultado)}
            subtitulo={resultado >= 0 ? 'Receita cobre o gasto' : 'Gasto acima da receita'}
            subtituloColor={resultado >= 0 ? '#97A624' : '#8C1414'}
            icon={TrendingUp}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <Card titulo="Crianças por Unidade">
            <GraficoBarraUnidade
              dados={criancasPorUnidade}
              cor="#DB2777"
              formatarValor={v => v.toLocaleString('pt-BR')}
            />
          </Card>

          <Card titulo="Gasto (Infláveis + Shows) por Unidade">
            <GraficoBarraUnidade dados={gastoPorUnidade} cor="#8C1414" />
          </Card>
        </div>

        <Card titulo="Próximos Shows">
          {proximosShows.length === 0 ? (
            <div style={{ color: '#BBB', fontSize: 13, padding: '12px 0' }}>Sem shows futuros no período/unidade selecionados.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #EBEBEB', textAlign: 'left', color: '#999' }}>
                    <th style={{ padding: '6px 8px' }}>Data</th>
                    <th style={{ padding: '6px 8px' }}>Unidade</th>
                    <th style={{ padding: '6px 8px' }}>Tema</th>
                    <th style={{ padding: '6px 8px' }}>Artista</th>
                    <th style={{ padding: '6px 8px' }}>Horário</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {proximosShows.map((s, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F5F5F5' }}>
                      <td style={{ padding: '6px 8px' }}>{formatarData(s.data)}</td>
                      <td style={{ padding: '6px 8px' }}>{s.unidade}</td>
                      <td style={{ padding: '6px 8px' }}>{s.tema}</td>
                      <td style={{ padding: '6px 8px' }}>{s.artista}</td>
                      <td style={{ padding: '6px 8px' }}>{s.horaInicio}-{s.horaTermino}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatarReais(s.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}
