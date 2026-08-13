import React, { useMemo } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import { formatarReais, formatarData } from '../ui/formatar.js'
import { useKids, agruparPorUnidade, agruparPorMes, somar } from '../../hooks/useKids.jsx'
import { Baby, ShoppingBag, PartyPopper, Wallet2, PiggyBank, TrendingUp, Ticket } from 'lucide-react'

export default function Home() {
  const {
    criancas, combo, faturamentoDomShow, inflaveis, shows, entradasKids,
    showsHistorico, criancasHistorico, inflaveisHistorico,
    comboHistorico, faturamentoHistorico, entradasHistorico,
  } = useKids()

  const totalCriancas = useMemo(() => somar(criancas, c => c.qtdCriancas), [criancas])
  const totalComboQtd = useMemo(() => somar(combo, c => c.qtdVendida), [combo])
  const totalComboValor = useMemo(() => somar(combo, c => c.valor), [combo])
  const totalFaturamentoDom = useMemo(() => somar(faturamentoDomShow, f => f.valor), [faturamentoDomShow])
  const totalEntradasKids = useMemo(() => somar(entradasKids, e => e.valor), [entradasKids])
  const totalGastoInflaveis = useMemo(() => somar(inflaveis, i => i.valor), [inflaveis])
  const totalGastoShows = useMemo(() => somar(shows, s => s.valor), [shows])
  const totalGasto = totalGastoInflaveis + totalGastoShows
  // totalEntradasKids já vem sem sobreposição com o Faturamento Dom Show
  // (o Apps Script exclui domingo 12h-14h dessa métrica pra não duplicar)
  const totalReceita = totalComboValor + totalFaturamentoDom + totalEntradasKids
  const resultado = totalReceita - totalGasto

  // ── Vs mês anterior ──────────────────────────────────────────────
  // Agrupa por DIA (não por mês) — precisamos disso pra poder cortar os
  // dois meses no mesmo dia quando o mês mais recente ainda está em
  // andamento (senão "13 dias de agosto" perde feio pra "31 dias de julho"
  // mesmo que o ritmo esteja igual ou melhor).
  const agruparPorDia = (linhas, extrairValor) => {
    const mapa = {}
    linhas.forEach(l => {
      const dia = l.data
      if (!dia) return
      mapa[dia] = (mapa[dia] || 0) + (extrairValor(l) || 0)
    })
    return mapa
  }

  // Recebe um objeto { "yyyy-MM-dd": valor } e devolve o badge de delta,
  // comparando os 2 últimos meses -- cortados no mesmo dia-do-mês se o mês
  // mais recente for o mês corrente (ainda em andamento).
  const formatarDeltaJusto = (porDia) => {
    const dias = Object.keys(porDia).sort()
    if (dias.length === 0) return null

    const meses = Array.from(new Set(dias.map(d => d.slice(0, 7)))).sort()
    if (meses.length < 2) return null

    const mesAtual = meses[meses.length - 1]
    const mesAnterior = meses[meses.length - 2]

    const hojeStr = new Date().toISOString().slice(0, 10)
    const ehMesEmAndamento = mesAtual === hojeStr.slice(0, 7)
    const diaCorte = ehMesEmAndamento ? Number(hojeStr.slice(8, 10)) : 31

    const somaMes = (mes, limiteDia) => dias
      .filter(d => d.slice(0, 7) === mes && Number(d.slice(8, 10)) <= limiteDia)
      .reduce((acc, d) => acc + porDia[d], 0)

    const atual = somaMes(mesAtual, diaCorte)
    const anterior = somaMes(mesAnterior, diaCorte)

    if (anterior === 0) {
      if (atual === 0) return null
      return { texto: 'novo neste período', cor: '#97A624' }
    }
    const pct = ((atual - anterior) / Math.abs(anterior)) * 100
    const seta = pct >= 0 ? '▲' : '▼'
    const cor = pct >= 0 ? '#97A624' : '#8C1414'
    const sufixo = ehMesEmAndamento ? ` (até dia ${diaCorte})` : ''
    return { texto: `${seta} ${Math.abs(pct).toFixed(0)}% vs mês anterior${sufixo}`, cor }
  }

  const deltaCriancas = useMemo(() => formatarDeltaJusto(agruparPorDia(criancasHistorico, c => c.qtdCriancas)), [criancasHistorico])
  const deltaComboQtd = useMemo(() => formatarDeltaJusto(agruparPorDia(comboHistorico, c => c.qtdVendida)), [comboHistorico])
  const deltaFaturamentoDom = useMemo(() => formatarDeltaJusto(agruparPorDia(faturamentoHistorico, f => f.valor)), [faturamentoHistorico])
  const deltaEntradasKids = useMemo(() => formatarDeltaJusto(agruparPorDia(entradasHistorico, e => e.valor)), [entradasHistorico])
  const deltaGastoInflaveis = useMemo(() => formatarDeltaJusto(agruparPorDia(inflaveisHistorico, i => i.valor)), [inflaveisHistorico])
  const deltaGastoShows = useMemo(() => formatarDeltaJusto(agruparPorDia(showsHistorico, s => s.valor)), [showsHistorico])
  const deltaResultado = useMemo(() => {
    // Resultado = receita - gasto, dia a dia (combinação de 3 fontes de
    // receita e 2 de gasto), depois aplica a mesma comparação justa por cima
    const porDiaCombo = agruparPorDia(comboHistorico, c => c.valor)
    const porDiaFaturamento = agruparPorDia(faturamentoHistorico, f => f.valor)
    const porDiaEntradas = agruparPorDia(entradasHistorico, e => e.valor)
    const porDiaInflaveis = agruparPorDia(inflaveisHistorico, i => i.valor)
    const porDiaShows = agruparPorDia(showsHistorico, s => s.valor)
    const todosDias = new Set([
      ...Object.keys(porDiaCombo), ...Object.keys(porDiaFaturamento), ...Object.keys(porDiaEntradas),
      ...Object.keys(porDiaInflaveis), ...Object.keys(porDiaShows),
    ])
    const porDiaResultado = {}
    todosDias.forEach(dia => {
      const receita = (porDiaCombo[dia] || 0) + (porDiaFaturamento[dia] || 0) + (porDiaEntradas[dia] || 0)
      const gasto = (porDiaInflaveis[dia] || 0) + (porDiaShows[dia] || 0)
      porDiaResultado[dia] = receita - gasto
    })
    return formatarDeltaJusto(porDiaResultado)
  }, [comboHistorico, faturamentoHistorico, entradasHistorico, inflaveisHistorico, showsHistorico])

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

  // ── Evolução Mensal ──────────────────────────────────────────────
  const evolucaoMensal = useMemo(() => {
    const criancasPorMes = agruparPorMes(criancas, c => c.qtdCriancas)
    const comboPorMes = agruparPorMes(combo, c => c.valor)
    const faturamentoPorMes = agruparPorMes(faturamentoDomShow, f => f.valor)
    const entradasPorMes = agruparPorMes(entradasKids, e => e.valor)
    const gastoInflaveisPorMes = agruparPorMes(inflaveis, i => i.valor)
    const gastoShowsPorMes = agruparPorMes(shows, s => s.valor)

    const todosMeses = new Set([
      ...Object.keys(criancasPorMes), ...Object.keys(comboPorMes),
      ...Object.keys(faturamentoPorMes), ...Object.keys(entradasPorMes),
      ...Object.keys(gastoInflaveisPorMes), ...Object.keys(gastoShowsPorMes),
    ])

    return Array.from(todosMeses).sort().map(mes => {
      const receita = (comboPorMes[mes] || 0) + (faturamentoPorMes[mes] || 0) + (entradasPorMes[mes] || 0)
      const gasto = (gastoInflaveisPorMes[mes] || 0) + (gastoShowsPorMes[mes] || 0)
      return {
        mes,
        criancas: criancasPorMes[mes] || 0,
        receita,
        gasto,
        resultado: receita - gasto,
      }
    })
  }, [criancas, combo, faturamentoDomShow, entradasKids, inflaveis, shows])

  const nomeMes = (mesStr) => {
    const [ano, mes] = mesStr.split('-')
    const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
    return `${nomes[Number(mes) - 1] || mes}/${ano.slice(2)}`
  }

  // ── Evolução Mensal por Unidade ──────────────────────────────────
  const evolucaoPorUnidade = useMemo(() => {
    const porMesUnidade = (arr, extrair) => {
      const mapa = {}
      arr.forEach(l => {
        const mes = (l.data || '').slice(0, 7)
        const unidade = l.unidade || '(não informado)'
        if (!mes) return
        const chave = unidade + '|' + mes
        if (!mapa[chave]) mapa[chave] = 0
        mapa[chave] += extrair(l) || 0
      })
      return mapa
    }

    const criancasM = porMesUnidade(criancas, c => c.qtdCriancas)
    const comboM = porMesUnidade(combo, c => c.valor)
    const faturamentoM = porMesUnidade(faturamentoDomShow, f => f.valor)
    const entradasM = porMesUnidade(entradasKids, e => e.valor)
    const gastoInflaveisM = porMesUnidade(inflaveis, i => i.valor)
    const gastoShowsM = porMesUnidade(shows, s => s.valor)

    const todasChaves = new Set([
      ...Object.keys(criancasM), ...Object.keys(comboM), ...Object.keys(faturamentoM),
      ...Object.keys(entradasM), ...Object.keys(gastoInflaveisM), ...Object.keys(gastoShowsM),
    ])

    return Array.from(todasChaves).map(chave => {
      const [unidade, mes] = chave.split('|')
      const receita = (comboM[chave] || 0) + (faturamentoM[chave] || 0) + (entradasM[chave] || 0)
      const gasto = (gastoInflaveisM[chave] || 0) + (gastoShowsM[chave] || 0)
      return {
        unidade, mes,
        criancas: criancasM[chave] || 0,
        receita, gasto,
        resultado: receita - gasto,
      }
    }).sort((a, b) => a.unidade === b.unidade ? a.mes.localeCompare(b.mes) : a.unidade.localeCompare(b.unidade))
  }, [criancas, combo, faturamentoDomShow, entradasKids, inflaveis, shows])

  return (
    <>
      <Header
        title="Kids"
        subtitle="Crianças, Combo Quintal Feliz, shows e infláveis"
      />

      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14 }}>
          <KpiCard label="Crianças na Kids" valor={totalCriancas.toLocaleString('pt-BR')} icon={Baby} delta={deltaCriancas} />
          <KpiCard
            label="Combo Quintal Feliz"
            valor={totalComboQtd.toLocaleString('pt-BR')}
            subtitulo={formatarReais(totalComboValor)}
            icon={ShoppingBag}
            delta={deltaComboQtd}
          />
          <KpiCard label="Faturamento Dom. 12h-14h" valor={formatarReais(totalFaturamentoDom)} icon={PartyPopper} delta={deltaFaturamentoDom} />
          <KpiCard
            label="Entradas Kids"
            valor={formatarReais(totalEntradasKids)}
            subtitulo="Passaporte, infláveis, bichinho"
            icon={Ticket}
            delta={deltaEntradasKids}
          />
          <KpiCard label="Gasto Infláveis" valor={formatarReais(totalGastoInflaveis)} icon={Wallet2} delta={deltaGastoInflaveis} />
          <KpiCard label="Gasto Shows" valor={formatarReais(totalGastoShows)} icon={PiggyBank} delta={deltaGastoShows} />
          <KpiCard
            label="Resultado Kids"
            valor={formatarReais(resultado)}
            subtitulo={resultado >= 0 ? 'Receita cobre o gasto' : 'Gasto acima da receita'}
            subtituloColor={resultado >= 0 ? '#97A624' : '#8C1414'}
            icon={TrendingUp}
            delta={deltaResultado}
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

        <Card titulo="Evolução Mensal">
          {evolucaoMensal.length === 0 ? (
            <div style={{ color: '#BBB', fontSize: 13, padding: '12px 0' }}>Sem dados suficientes pra montar a evolução mensal.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #EBEBEB', textAlign: 'left', color: '#999' }}>
                    <th style={{ padding: '6px 8px' }}>Mês</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Crianças</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Receita</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gasto</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucaoMensal.map((m, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F5F5F5' }}>
                      <td style={{ padding: '6px 8px', fontWeight: 600 }}>{nomeMes(m.mes)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{m.criancas.toLocaleString('pt-BR')}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatarReais(m.receita)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatarReais(m.gasto)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: m.resultado >= 0 ? '#97A624' : '#8C1414' }}>
                        {formatarReais(m.resultado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card titulo="Evolução Mensal por Unidade">
          {evolucaoPorUnidade.length === 0 ? (
            <div style={{ color: '#BBB', fontSize: 13, padding: '12px 0' }}>Sem dados suficientes pra montar a evolução por unidade.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #EBEBEB', textAlign: 'left', color: '#999' }}>
                    <th style={{ padding: '6px 8px' }}>Unidade</th>
                    <th style={{ padding: '6px 8px' }}>Mês</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Crianças</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Receita</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Gasto</th>
                    <th style={{ padding: '6px 8px', textAlign: 'right' }}>Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {evolucaoPorUnidade.map((m, idx) => {
                    const primeiraDaUnidade = idx === 0 || evolucaoPorUnidade[idx - 1].unidade !== m.unidade
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #F5F5F5', borderTop: primeiraDaUnidade && idx > 0 ? '2px solid #EBEBEB' : undefined }}>
                        <td style={{ padding: '6px 8px', fontWeight: primeiraDaUnidade ? 700 : 400, color: primeiraDaUnidade ? '#111' : '#BBB' }}>
                          {primeiraDaUnidade ? m.unidade : ''}
                        </td>
                        <td style={{ padding: '6px 8px' }}>{nomeMes(m.mes)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{m.criancas.toLocaleString('pt-BR')}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatarReais(m.receita)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right' }}>{formatarReais(m.gasto)}</td>
                        <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: m.resultado >= 0 ? '#97A624' : '#8C1414' }}>
                          {formatarReais(m.resultado)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

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
