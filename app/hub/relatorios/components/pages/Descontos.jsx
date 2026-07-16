import React, { useMemo, useState } from 'react'
import Header from '../layout/Header.jsx'
import KpiCard from '../ui/KpiCard.jsx'
import Tabela, { formatarReais, formatarData } from '../ui/Tabela.jsx'
import GraficoBarraUnidade, { Card } from '../ui/GraficoBarraUnidade.jsx'
import { useRelatorios, agruparPorChave, agruparPorUnidade, crossTab, contarDistintos, somar } from '../../hooks/useRelatorios.jsx'
import { Percent, Users, Receipt, TrendingDown, ChevronDown, ChevronRight } from 'lucide-react'

export default function Descontos() {
  const { descontos } = useRelatorios()
  const [funcionarioExpandido, setFuncionarioExpandido] = useState(null)

  const totalValor = useMemo(() => somar(descontos, d => d.valor), [descontos])
  const totalQtd = descontos.length
  const qtdFuncionarios = useMemo(() => contarDistintos(descontos, d => d.funcionario), [descontos])
  const ticketMedio = totalQtd > 0 ? totalValor / totalQtd : 0

  const porUnidade = useMemo(() => agruparPorUnidade(descontos, d => d.valor), [descontos])
  const porFuncionario = useMemo(() => agruparPorChave(descontos, d => d.funcionario, d => d.valor), [descontos])
  const motivoXCategoria = useMemo(
    () => crossTab(descontos, d => d.justificativa || '(sem justificativa)', d => d.categoria || '(sem categoria)', d => d.valor),
    [descontos]
  )

  const descontosDoFuncionarioExpandido = useMemo(() => {
    if (!funcionarioExpandido) return []
    return descontos
      .filter(d => d.funcionario === funcionarioExpandido)
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [descontos, funcionarioExpandido])

  return (
    <>
      <Header title="Descontos" subtitle="Descontos aplicados por unidade e funcionário" />

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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}></th>
                  <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Funcionário</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Qtd Descontos</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Valor Total</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Ticket Médio</th>
                </tr>
              </thead>
              <tbody>
                {porFuncionario.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '32px 0', textAlign: 'center', color: '#BBB' }}>Sem registros no período.</td></tr>
                )}
                {porFuncionario.map(f => {
                  const expandido = funcionarioExpandido === f.chave
                  return (
                    <React.Fragment key={f.chave}>
                      <tr
                        onClick={() => setFuncionarioExpandido(expandido ? null : f.chave)}
                        style={{ borderBottom: '1px solid #F7F7F7', cursor: 'pointer', background: expandido ? '#FAFAFA' : 'transparent' }}
                      >
                        <td style={{ padding: '8px 4px', color: '#BBB', width: 20 }}>
                          {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </td>
                        <td style={{ padding: '8px 12px 8px 0', color: '#333', fontWeight: expandido ? 600 : 400 }}>{f.chave}</td>
                        <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', color: '#333' }}>{f.qtd}</td>
                        <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', color: '#333' }}>{formatarReais(f.valor)}</td>
                        <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', color: '#333' }}>{formatarReais(f.qtd > 0 ? f.valor / f.qtd : 0)}</td>
                      </tr>
                      {expandido && (
                        <tr>
                          <td colSpan={5} style={{ padding: '0 0 16px 28px', background: '#FAFAFA' }}>
                            <Tabela
                              colunas={[
                                { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
                                { chave: 'unidade', titulo: 'Unidade' },
                                { chave: 'cliente', titulo: 'Cliente' },
                                { chave: 'justificativa', titulo: 'Justificativa' },
                                { chave: 'categoria', titulo: 'Categoria' },
                                { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
                              ]}
                              linhas={descontosDoFuncionarioExpandido}
                              chaveLinha={(l, idx) => `${l.data}-${idx}`}
                              limite={50}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card titulo="Motivo dos Descontos (Justificativa × Categoria)">
          <Tabela
            colunas={[
              { chave: 'dimensao1', titulo: 'Justificativa' },
              { chave: 'dimensao2', titulo: 'Categoria' },
              { chave: 'qtd', titulo: 'Qtd', alinhamento: 'right' },
              { chave: 'valor', titulo: 'Valor', alinhamento: 'right', render: l => formatarReais(l.valor) },
            ]}
            linhas={motivoXCategoria}
            chaveLinha={l => `${l.dimensao1}||${l.dimensao2}`}
            limite={20}
          />
        </Card>

        <Card titulo="Últimos Descontos Lançados">
          <Tabela
            colunas={[
              { chave: 'data', titulo: 'Data', render: l => formatarData(l.data) },
              { chave: 'unidade', titulo: 'Unidade' },
              { chave: 'funcionario', titulo: 'Funcionário' },
              { chave: 'cliente', titulo: 'Cliente' },
              { chave: 'justificativa', titulo: 'Justificativa' },
              { chave: 'categoria', titulo: 'Categoria' },
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
