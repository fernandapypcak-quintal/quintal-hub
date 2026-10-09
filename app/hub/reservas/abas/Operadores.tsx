'use client'

import { useMemo, useState } from 'react'
import {
  type Config, type Filtros, type Linha, type Periodo, GRUPOS, agruparPor, aplicarFiltros, exportarExcel, grupoLabel,
  n0, n1, pct, resumir, taxa, temHistoricoDesde, useLinhas, variacao,
} from '../utils'
import { Aviso, C, Drawer, Secao, Spinner, Var, botao, card, td, tdNum, th, thNum } from '../ui'
import TabelaReservas from './TabelaReservas'
import MetaSemanal from './MetaSemanal'

export default function Operadores({ config, filtros, periodo, hoje }: { config: Config; filtros: Filtros; periodo: Periodo; hoje: string }) {
  const dados = useLinhas('criacao', periodo.antInicio, periodo.fim)
  const temAno = temHistoricoDesde(config, periodo.anoInicio)
  const ano = useLinhas('criacao', temAno ? periodo.anoInicio : '', temAno ? periodo.anoFim : '')
  const anoPorOp = useMemo(() => {
    if (!ano.linhas) return null
    // compara cada operador com ele mesmo no ano passado (só o filtro de casa)
    return agruparPor(ano.linhas.filter(r => !filtros.unidades.length || filtros.unidades.includes(r.u)), r => r.o)
  }, [ano.linhas, filtros])
  const [aberto, setAberto] = useState<string | null>(null)

  const calc = useMemo(() => {
    if (!dados.linhas) return null
    const filtradas = aplicarFiltros(dados.linhas, filtros)
    const atual = filtradas.filter(r => r.dc >= periodo.inicio && r.dc <= periodo.fim)
    const ant = filtradas.filter(r => r.dc >= periodo.antInicio && r.dc <= periodo.antFim)
    const antPorOp = agruparPor(ant, r => r.o)
    const linhas = Array.from(agruparPor(atual, r => r.o)).map(([o, l]) => {
      const r = resumir(l)
      const gs = Array.from(new Set(l.map(x => x.g)))
      return { o, grupo: gs.length === 1 ? grupoLabel(gs[0]) : 'Vários', ...r, ant: (antPorOp.get(o) || []).length, lista: l }
    }).sort((a, b) => b.reservas - a.reservas)
    const porGrupo = GRUPOS.filter(g => filtros.grupos.includes(g.id)).map(g => ({ ...g, ...resumir(atual.filter(r => r.g === g.id)) }))
    return { atual, linhas, total: atual.length, porGrupo }
  }, [dados.linhas, filtros, periodo])

  const semanal = <MetaSemanal config={config} hoje={hoje} modo="operadores" />
  if (dados.erro) return <>{semanal}<Aviso>{dados.erro}</Aviso></>
  if (!calc) return <>{semanal}<div style={card}><Spinner /></div></>

  const sel = aberto ? calc.linhas.find(l => l.o === aberto) : null

  return (
    <>
      {semanal}
      <div style={{ fontSize: 13, fontWeight: 600, marginTop: 8 }}>Todos os operadores · {periodo.label}</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        {calc.porGrupo.map(g => (
          <div key={g.id} style={{ ...card, padding: '12px 16px', borderTop: `3px solid ${g.cor}` }}>
            <div style={{ fontSize: 12, color: C.suave }}>{g.label}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 24 }}>{n0(g.reservas)}</div>
            <div style={{ fontSize: 12, color: C.suave }}>{pct(taxa(g.reservas, calc.total))} das reservas · {n0(g.pessoas)} pessoas</div>
          </div>
        ))}
      </div>

      <Secao titulo="Reservas por operador" sub={`Reservas criadas · ${periodo.label} vs ${periodo.labelAnt} e vs ${periodo.labelAno} · filtre Time de reservas, Online ou Corporativo / outros no topo · vs ano ant. compara o operador com ele mesmo · clique para ver as reservas`}
        direita={<button style={botao} onClick={() => exportarExcel(`reservas_operadores_${periodo.inicio}_a_${periodo.fim}`, calc.atual)}>Exportar Excel</button>}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Operador</th><th style={th}>Origem</th><th style={thNum}>Reservas</th><th style={thNum}>% do total</th>
              <th style={thNum}>vs ant.</th><th style={thNum}>vs ano ant.</th><th style={thNum}>Pessoas</th><th style={thNum}>Mesa média</th><th style={thNum}>B2B</th>
              <th style={thNum}>Sentadas</th><th style={thNum}>Confirm.</th><th style={thNum}>Pendentes</th><th style={thNum}>Cancel.</th><th style={thNum}>No-show</th>
            </tr></thead>
            <tbody>
              {calc.linhas.map(l => (
                <tr key={l.o} onClick={() => setAberto(l.o)} style={{ cursor: 'pointer' }}>
                  <td style={{ ...td, fontWeight: 500 }}>{l.o}</td>
                  <td style={{ ...td, color: C.suave }}>{l.grupo}</td>
                  <td style={{ ...tdNum, fontWeight: 600 }}>{n0(l.reservas)}</td>
                  <td style={tdNum}>{pct(taxa(l.reservas, calc.total))}</td>
                  <td style={tdNum}><Var v={variacao(l.reservas, l.ant)} /></td>
                  <td style={tdNum}>{anoPorOp ? <Var v={variacao(l.reservas, (anoPorOp.get(l.o) || []).length)} /> : <span style={{ color: C.muito }}>—</span>}</td>
                  <td style={tdNum}>{n0(l.pessoas)}</td>
                  <td style={tdNum}>{n1(l.tam)}</td>
                  <td style={{ ...tdNum, color: l.b2b ? C.b2b : C.muito }}>{n0(l.b2b)}</td>
                  <td style={tdNum}>{pct(taxa(l.sentadas, l.reservas))}</td>
                  <td style={tdNum}>{pct(taxa(l.confirmadas, l.reservas))}</td>
                  <td style={tdNum}>{pct(taxa(l.pendentes, l.reservas))}</td>
                  <td style={tdNum}>{pct(taxa(l.canceladas, l.reservas))}</td>
                  <td style={tdNum}>{pct(taxa(l.noshow, l.reservas))}</td>
                </tr>
              ))}
              {!calc.linhas.length && <tr><td style={{ ...td, color: C.suave }} colSpan={14}>Nenhuma reserva no período com esses filtros.</td></tr>}
            </tbody>
          </table>
        </div>
        <div style={{ fontSize: 11.5, color: C.suave, marginTop: 10 }}>
          Status em % das reservas criadas no período. Reservas para datas futuras ainda aparecem como pendentes ou confirmadas.
        </div>
      </Secao>

      {sel && (
        <Drawer titulo={sel.o} sub={`${n0(sel.reservas)} reservas criadas · ${periodo.label}`} onFechar={() => setAberto(null)}
          acoes={<button style={botao} onClick={() => exportarExcel(`reservas_${sel.o.replace(/\W+/g, '_')}_${periodo.inicio}_a_${periodo.fim}`, sel.lista)}>Exportar</button>}>
          <PorCasaOperador lista={sel.lista} />
          <div style={{ height: 16 }} />
          <TabelaReservas linhas={sel.lista} colunas={['dc', 'u', 'dr', 'p', 'oc', 's']} />
        </Drawer>
      )}
    </>
  )
}

function PorCasaOperador({ lista }: { lista: Linha[] }) {
  const casas = Array.from(agruparPor(lista, r => r.u)).map(([u, l]) => ({ u, ...resumir(l) })).sort((a, b) => b.reservas - a.reservas)
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {casas.map(c => (
        <div key={c.u} style={{ ...card, padding: '8px 12px', fontSize: 12.5 }}>
          {c.u} · <b style={{ fontFamily: "'DM Mono', monospace" }}>{n0(c.reservas)}</b> <span style={{ color: C.suave }}>({n0(c.pessoas)} pess.)</span>
        </div>
      ))}
    </div>
  )
}
