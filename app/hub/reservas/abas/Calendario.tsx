'use client'

import { useMemo, useState } from 'react'
import {
  type Config, type Filtros, type Linha, CANCELADAS, addMeses, agruparPor, aplicarFiltros, ativa, dataLonga,
  diaSemana, exportarExcel, listaDias, n0, nomeMes, primeiroDia, resumir, ultimoDia, useLinhas,
} from '../utils'
import { Aviso, C, Drawer, MONO, Secao, Spinner, Tag, botao, card, pill, td, tdNum, th, thNum } from '../ui'
import TabelaReservas from './TabelaReservas'

const SEMANA = ['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom']
const DIA_LONGO = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']

export default function Calendario({ config, filtros, hoje }: { config: Config; filtros: Filtros; hoje: string }) {
  const mesHoje = hoje.slice(0, 7)
  const [mes, setMes] = useState(mesHoje)
  const [dia, setDia] = useState<string | null>(null)
  const dados = useLinhas('reserva', primeiroDia(mes), ultimoDia(mes))

  const opcoes = useMemo(() => {
    const s = new Set([...config.mesesDr, mesHoje, addMeses(mesHoje, 1), addMeses(mesHoje, 2)])
    return Array.from(s).sort().reverse()
  }, [config.mesesDr, mesHoje])

  const calc = useMemo(() => {
    if (!dados.linhas) return null
    const filtradas = aplicarFiltros(dados.linhas, filtros)
    const porDia = agruparPor(filtradas, r => r.dr)
    const ativas = filtradas.filter(ativa)
    const maxDia = Math.max(1, ...Array.from(porDia.values()).map(l => l.filter(ativa).length))
    return { filtradas, porDia, total: resumir(ativas), canceladas: filtradas.length - ativas.length, maxDia }
  }, [dados.linhas, filtros])

  const dias = listaDias(primeiroDia(mes), ultimoDia(mes))
  const vazios = (diaSemana(dias[0]) + 6) % 7
  const umaCasa = filtros.unidades.length === 1

  return (
    <>
      <Secao
        titulo={`Calendário de reservas — ${nomeMes(mes)}`}
        sub={`Por data da reserva · ${umaCasa ? filtros.unidades[0] : filtros.unidades.length ? `${filtros.unidades.length} casas` : 'todas as casas'} · sem canceladas · clique no dia para ver o detalhe`}
        direita={
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button style={pill(false)} onClick={() => setMes(m => addMeses(m, -1))}>←</button>
            <select value={mes} onChange={e => setMes(e.target.value)} style={{ ...pill(true), appearance: 'auto' }}>
              {opcoes.map(m => <option key={m} value={m}>{nomeMes(m)}</option>)}
            </select>
            <button style={pill(false)} onClick={() => setMes(m => addMeses(m, 1))}>→</button>
            {calc && <button style={botao} onClick={() => exportarExcel(`reservas_calendario_${mes}`, calc.filtradas)}>Exportar Excel</button>}
          </div>
        }>
        {dados.erro && <Aviso>{dados.erro}</Aviso>}
        {!calc ? <Spinner /> : (
          <>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 14, fontSize: 12, color: C.suave }}>
              <div>Reservas <div style={{ ...MONO, fontSize: 22, color: C.texto }}>{n0(calc.total.reservas)}</div></div>
              <div>Pessoas <div style={{ ...MONO, fontSize: 22, color: C.texto }}>{n0(calc.total.pessoas)}</div></div>
              <div>B2B <div style={{ ...MONO, fontSize: 22, color: C.b2b }}>{n0(calc.total.b2b)} <span style={{ fontSize: 12 }}>({n0(calc.total.b2bPessoas)} pess.)</span></div></div>
              <div>Canceladas <div style={{ ...MONO, fontSize: 22, color: C.muito }}>{n0(calc.canceladas)}</div></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 6 }}>
              {SEMANA.map(s => <div key={s} style={{ fontSize: 11.5, color: C.suave, fontWeight: 600, padding: '0 4px' }}>{s}</div>)}
              {Array.from({ length: vazios }, (_, i) => <div key={'v' + i} />)}
              {dias.map(d => {
                const l = (calc.porDia.get(d) || []).filter(ativa)
                const r = resumir(l)
                const alfa = l.length ? 0.06 + 0.45 * (l.length / calc.maxDia) : 0
                const ehHoje = d === hoje
                const passado = d < hoje
                return (
                  <button key={d} onClick={() => setDia(d)}
                    style={{
                      textAlign: 'left', minHeight: 92, padding: '8px 10px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
                      border: `1px solid ${ehHoje ? C.texto : C.borda}`, background: l.length ? `rgba(15,118,110,${alfa})` : '#fff',
                      opacity: passado ? 0.85 : 1,
                    }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.suave }}>
                      <span style={{ fontWeight: ehHoje ? 700 : 500, color: ehHoje ? C.texto : C.suave }}>{Number(d.slice(8))}</span>
                      {ehHoje && <span style={{ fontSize: 10.5, fontWeight: 600, color: C.texto }}>hoje</span>}
                    </div>
                    {l.length > 0 && (
                      <>
                        <div style={{ ...MONO, fontSize: 18, color: C.texto, marginTop: 4 }}>{n0(r.reservas)} <span style={{ fontSize: 11, color: '#555' }}>res.</span></div>
                        <div style={{ fontSize: 11.5, color: '#555' }}>{n0(r.pessoas)} pessoas</div>
                        {r.b2b > 0 && <div style={{ fontSize: 11, color: C.b2b, fontWeight: 600 }}>{n0(r.b2b)} B2B · {n0(r.b2bPessoas)} pess.</div>}
                      </>
                    )}
                  </button>
                )
              })}
            </div>
          </>
        )}
      </Secao>

      {dia && calc && (
        <DetalheDia dia={dia} linhas={calc.porDia.get(dia) || []} onFechar={() => setDia(null)} />
      )}
    </>
  )
}

function DetalheDia({ dia, linhas, onFechar }: { dia: string; linhas: Linha[]; onFechar: () => void }) {
  const ativas = linhas.filter(ativa)
  const tot = resumir(ativas)
  const casas = Array.from(agruparPor(linhas, r => r.u)).map(([u, l]) => {
    const a = l.filter(ativa)
    return { u, ...resumir(a), canc: l.length - a.length }
  }).sort((a, b) => b.pessoas - a.pessoas)

  return (
    <Drawer titulo={`${DIA_LONGO[diaSemana(dia)]}, ${dataLonga(dia)}`}
      sub={`${n0(tot.reservas)} reservas · ${n0(tot.pessoas)} pessoas · ${n0(tot.b2b)} B2B (${n0(tot.b2bPessoas)} pess.) · ${n0(linhas.length - ativas.length)} canceladas`}
      onFechar={onFechar}
      acoes={<button style={botao} onClick={() => exportarExcel(`reservas_${dia}`, linhas)}>Exportar</button>}>
      <div style={{ ...card, marginBottom: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Casa</th><th style={thNum}>Reservas</th><th style={thNum}>Pessoas</th><th style={thNum}>B2B</th>
            <th style={thNum}>B2B pess.</th><th style={thNum}>Não B2B pess.</th><th style={thNum}>Pendentes</th><th style={thNum}>Canceladas</th>
          </tr></thead>
          <tbody>
            {casas.map(c => (
              <tr key={c.u}>
                <td style={td}>{c.u}</td>
                <td style={{ ...tdNum, fontWeight: 600 }}>{n0(c.reservas)}</td>
                <td style={tdNum}>{n0(c.pessoas)}</td>
                <td style={{ ...tdNum, color: c.b2b ? C.b2b : C.muito }}>{n0(c.b2b)}</td>
                <td style={{ ...tdNum, color: c.b2bPessoas ? C.b2b : C.muito }}>{n0(c.b2bPessoas)}</td>
                <td style={tdNum}>{n0(c.pessoas - c.b2bPessoas)}</td>
                <td style={{ ...tdNum, color: c.pendentes ? '#8A6D00' : C.muito }}>{n0(c.pendentes)}</td>
                <td style={{ ...tdNum, color: C.muito }}>{n0(c.canc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 12, color: C.suave, marginBottom: 8 }}>
        Reservas do dia <Tag>B2B</Tag> = origem Pipe ou ocasião corporativa · canceladas aparecem esmaecidas
      </div>
      <TabelaReservas linhas={[...linhas].sort((a, b) => Number(CANCELADAS.has(a.s)) - Number(CANCELADAS.has(b.s)))} colunas={['u', 'p', 'g', 'o', 'oc', 's', 'dc']} />
    </Drawer>
  )
}
