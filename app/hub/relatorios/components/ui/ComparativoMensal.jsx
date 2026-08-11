import React, { useMemo, useState } from 'react'
import {
  Line, ComposedChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card } from './GraficoBarraUnidade.jsx'
import { formatarReais, formatarData } from './Tabela.jsx'
import { compararPeriodos, periodoMesAtual, periodoMesAnterior } from '../../hooks/useRelatorios.jsx'

// Mostra a variação com seta e cor. Por padrão, subir é "ruim" (vermelho) --
// faz sentido pra desconto/estorno/desperdício, que são custo.
function Variacao({ valor, aumentoBom = false }) {
  const positivo = valor > 0.001
  const negativo = valor < -0.001
  const corPositivo = aumentoBom ? '#1B7F3A' : '#C00000'
  const corNegativo = aumentoBom ? '#C00000' : '#1B7F3A'
  const cor = positivo ? corPositivo : negativo ? corNegativo : '#999'
  const Icone = positivo ? TrendingUp : negativo ? TrendingDown : Minus

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: cor, fontWeight: 700 }}>
      <Icone size={13} />
      {Math.abs(valor * 100).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
    </span>
  )
}

const campoData_ = {
  padding: '0 10px', height: 30, border: '1px solid #E8E8E8',
  borderRadius: 99, fontSize: 12, color: '#333',
  background: '#fff', outline: 'none', fontFamily: 'inherit',
}

// dadosBruto: array completo (sem filtro de data do cabeçalho) já vindo da página.
// campoData: nome do campo de data (string), extrairValor: função (item) => number.
export default function ComparativoMensal({ titulo = 'Comparativo de Períodos', dadosBruto, campoData, extrairValor, aumentoBom = false }) {
  const [periodoAtual, setPeriodoAtual] = useState(periodoMesAtual())
  const [periodoAnterior, setPeriodoAnterior] = useState(periodoMesAnterior())

  const resultado = useMemo(
    () => compararPeriodos(dadosBruto, campoData, extrairValor, periodoAtual, periodoAnterior),
    [dadosBruto, campoData, extrairValor, periodoAtual, periodoAnterior]
  )

  const { linhas, totalAtual, totalAnterior, variacaoTotal, porDia } = resultado
  const semDadosNosDoisPeriodos = totalAtual === 0 && totalAnterior === 0

  const resetarPadrao = () => {
    setPeriodoAtual(periodoMesAtual())
    setPeriodoAnterior(periodoMesAnterior())
  }

  const campo = (valor, onChange) => (
    <input type="date" value={valor} onChange={e => onChange(e.target.value)} style={campoData_} />
  )

  return (
    <Card titulo={titulo}>
      {/* Seletores de período -- dois blocos lado a lado */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#1a1a1a', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Período Atual
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {campo(periodoAtual.inicio, v => setPeriodoAtual(p => ({ ...p, inicio: v })))}
            <span style={{ fontSize: 12, color: '#BBB' }}>até</span>
            {campo(periodoAtual.fim, v => setPeriodoAtual(p => ({ ...p, fim: v })))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            Período Anterior (comparação)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {campo(periodoAnterior.inicio, v => setPeriodoAnterior(p => ({ ...p, inicio: v })))}
            <span style={{ fontSize: 12, color: '#BBB' }}>até</span>
            {campo(periodoAnterior.fim, v => setPeriodoAnterior(p => ({ ...p, fim: v })))}
          </div>
        </div>
        <button
          onClick={resetarPadrao}
          style={{
            alignSelf: 'flex-end', border: 'none', background: 'none', color: '#999',
            fontSize: 12, cursor: 'pointer', textDecoration: 'underline', paddingBottom: 6,
          }}
        >
          usar mês atual x mês anterior
        </button>
      </div>

      {semDadosNosDoisPeriodos ? (
        <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 13, color: '#BBB' }}>
          Sem dados em nenhum dos dois períodos.
        </div>
      ) : (
        <>
          {/* Resumo total + variação, bem grande pra bater o olho */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap',
            padding: '14px 16px', background: '#FAFAFA', borderRadius: 10, marginBottom: 16,
          }}>
            <div>
              <div style={{ fontSize: 10.5, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Período Anterior</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#666' }}>{formatarReais(totalAnterior)}</div>
            </div>
            <div style={{ fontSize: 20, color: '#CCC' }}>→</div>
            <div>
              <div style={{ fontSize: 10.5, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Período Atual</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>{formatarReais(totalAtual)}</div>
            </div>
            <div>
              <div style={{ fontSize: 10.5, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Variação</div>
              <div style={{ fontSize: 20 }}><Variacao valor={variacaoTotal} aumentoBom={aumentoBom} /></div>
            </div>
          </div>

          {/* Gráfico dia a dia -- pra ver a tendência subindo ou caindo */}
          <div style={{ height: 260, marginBottom: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={porDia} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="dia" fontSize={11} stroke="#999" tickFormatter={v => `Dia ${v}`} />
                <YAxis fontSize={11} stroke="#999" tickFormatter={v => formatarReais(v)} />
                <Tooltip
                  formatter={(v, nome) => [formatarReais(v), nome]}
                  labelFormatter={v => `Dia ${v} do período`}
                />
                <Legend />
                <Line type="monotone" dataKey="valorAnterior" name="Período Anterior" stroke="#BBB" strokeWidth={2} dot={false} strokeDasharray="4 3" />
                <Line type="monotone" dataKey="valorAtual" name="Período Atual" stroke="#EA580C" strokeWidth={2.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela por unidade */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <th style={{ textAlign: 'left', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Unidade</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Período Anterior</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Período Atual</th>
                  <th style={{ textAlign: 'right', padding: '8px 12px 8px 0', fontSize: 10.5, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#999' }}>Variação</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: '2px solid #EEE', background: '#FAFAFA' }}>
                  <td style={{ padding: '9px 12px 9px 0', fontWeight: 700, color: '#1a1a1a' }}>Rede (todas as unidades)</td>
                  <td style={{ padding: '9px 12px 9px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#333' }}>{formatarReais(totalAnterior)}</td>
                  <td style={{ padding: '9px 12px 9px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: '#1a1a1a' }}>{formatarReais(totalAtual)}</td>
                  <td style={{ padding: '9px 12px 9px 0', textAlign: 'right' }}><Variacao valor={variacaoTotal} aumentoBom={aumentoBom} /></td>
                </tr>
                {linhas.map(l => (
                  <tr key={l.unidade} style={{ borderBottom: '1px solid #F7F7F7' }}>
                    <td style={{ padding: '8px 12px 8px 0', color: '#333' }}>{l.unidade}</td>
                    <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#666' }}>{formatarReais(l.anterior)}</td>
                    <td style={{ padding: '8px 12px 8px 0', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#333' }}>{formatarReais(l.atual)}</td>
                    <td style={{ padding: '8px 12px 8px 0', textAlign: 'right' }}><Variacao valor={l.variacao} aumentoBom={aumentoBom} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  )
}
