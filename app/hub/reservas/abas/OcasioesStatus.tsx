'use client'

import { useMemo, useState } from 'react'
import {
  type Config, type Crianca, type Filtros, type Periodo, CRIANCA_LABEL, GRUPOS, STATUS, agruparPor, aplicarFiltros, aplicarFiltrosHist,
  criancaDe, exportarExcel,
  n0, n1, pct, resumir, statusLabel, taxa, temHistoricoDesde, useLinhas, variacao,
} from '../utils'
import { Aviso, BarraH, C, Drawer, Secao, Spinner, Var, botao, card, td, tdNum, th, thNum } from '../ui'
import TabelaReservas from './TabelaReservas'

const SEM = 'Não Informado'

export default function OcasioesStatus({ config, filtros, periodo }: { config: Config; filtros: Filtros; periodo: Periodo }) {
  const dados = useLinhas('criacao', periodo.antInicio, periodo.fim)
  const temAno = temHistoricoDesde(config, periodo.anoInicio)
  const ano = useLinhas('criacao', temAno ? periodo.anoInicio : '', temAno ? periodo.anoFim : '')
  const anoPorOc = useMemo(() => {
    if (!ano.linhas) return null
    return agruparPor(aplicarFiltrosHist(ano.linhas, filtros), r => r.oc)
  }, [ano.linhas, filtros])
  const [aberto, setAberto] = useState<{ tipo: 'oc' | 's' | 'cr'; valor: string } | null>(null)

  const calc = useMemo(() => {
    if (!dados.linhas) return null
    const filtradas = aplicarFiltros(dados.linhas, filtros)
    const atual = filtradas.filter(r => r.dc >= periodo.inicio && r.dc <= periodo.fim)
    const ant = filtradas.filter(r => r.dc >= periodo.antInicio && r.dc <= periodo.antFim)
    const antOc = agruparPor(ant, r => r.oc)

    const ocasioes = Array.from(agruparPor(atual, r => r.oc)).map(([oc, l]) => ({ oc, ...resumir(l), ant: (antOc.get(oc) || []).length, lista: l }))
      .sort((a, b) => (a.oc === SEM ? 1 : b.oc === SEM ? -1 : b.reservas - a.reservas))
    const comOcasiao = atual.filter(r => r.oc !== SEM).length

    const porStatus = agruparPor(atual, r => r.s)
    const status = [...STATUS.map(s => s.id), ...Array.from(porStatus.keys()).filter(k => !STATUS.some(s => s.id === k))]
      .map(id => ({ id, label: statusLabel(id), cor: STATUS.find(s => s.id === id)?.cor || C.muito, lista: porStatus.get(id) || [] }))
      .filter(s => s.lista.length)

    // Crianças: % sobre as reservas que têm a informação
    const tabCrianca = (chave: (r: typeof atual[number]) => string) => Array.from(agruparPor(atual, chave)).map(([k, l]) => {
      const r = resumir(l)
      return { k, reservas: r.reservas, informadas: r.criancaInformada, com: r.comCrianca, pessoasCom: l.filter(x => criancaDe(x) === 'sim').reduce((s, x) => s + x.p, 0) }
    }).filter(x => x.informadas > 0).sort((a, b) => b.com - a.com)
    const crianca = {
      total: resumir(atual),
      pessoasCom: atual.filter(x => criancaDe(x) === 'sim').reduce((s, x) => s + x.p, 0),
      porOcasiao: tabCrianca(r => (r.oc === SEM ? 'Sem ocasião informada' : r.oc)),
      porCasa: tabCrianca(r => r.u),
    }

    return { atual, ocasioes, comOcasiao, status, crianca }
  }, [dados.linhas, filtros, periodo])

  if (dados.erro) return <Aviso>{dados.erro}</Aviso>
  if (!calc) return <div style={card}><Spinner /></div>

  const total = calc.atual.length
  const maxSt = Math.max(1, ...calc.status.map(s => s.lista.length))
  const lista = aberto
    ? calc.atual.filter(r => (aberto.tipo === 'oc' ? r.oc === aberto.valor : aberto.tipo === 'cr' ? criancaDe(r) === aberto.valor : r.s === aberto.valor))
    : []
  const cr = calc.crianca
  const tabelaCr = (titulo: string, linhas: typeof cr.porCasa) => (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={th}>{titulo}</th><th style={thNum}>Reservas c/ info</th><th style={thNum}>Com criança</th><th style={thNum}>% com criança</th><th style={thNum}>Pessoas (c/ criança)</th>
        </tr></thead>
        <tbody>
          {linhas.map(x => (
            <tr key={x.k}>
              <td style={td}>{x.k}</td>
              <td style={tdNum}>{n0(x.informadas)}</td>
              <td style={{ ...tdNum, fontWeight: 600 }}>{n0(x.com)}</td>
              <td style={tdNum}>{pct(taxa(x.com, x.informadas))}</td>
              <td style={tdNum}>{n0(x.pessoasCom)}</td>
            </tr>
          ))}
          {!linhas.length && <tr><td style={{ ...td, color: C.suave }} colSpan={5}>Nenhuma reserva com a informação no período.</td></tr>}
        </tbody>
      </table>
    </div>
  )

  return (
    <>
      <Secao titulo="Ocasiões" sub={`Reservas criadas · ${periodo.label} vs ${periodo.labelAnt} e vs ${periodo.labelAno} · ${pct(taxa(calc.comOcasiao, total))} das reservas têm ocasião (só a central preenche) · clique para ver as reservas`}
        direita={<button style={botao} onClick={() => exportarExcel(`reservas_ocasioes_${periodo.inicio}_a_${periodo.fim}`, calc.atual)}>Exportar Excel</button>}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={th}>Ocasião</th><th style={thNum}>Reservas</th><th style={thNum}>% c/ ocasião</th><th style={thNum}>vs ant.</th><th style={thNum}>vs ano ant.</th>
              <th style={thNum}>Pessoas</th><th style={thNum}>Mesa média</th><th style={thNum}>B2B</th><th style={thNum}>Sentadas</th><th style={thNum}>No-show</th>
            </tr></thead>
            <tbody>
              {calc.ocasioes.map(o => {
                const sem = o.oc === SEM
                return (
                  <tr key={o.oc} onClick={() => setAberto({ tipo: 'oc', valor: o.oc })} style={{ cursor: 'pointer', color: sem ? C.suave : C.texto }}>
                    <td style={{ ...td, fontWeight: sem ? 400 : 500, color: 'inherit' }}>{sem ? 'Sem ocasião informada' : o.oc}</td>
                    <td style={{ ...tdNum, fontWeight: 600 }}>{n0(o.reservas)}</td>
                    <td style={tdNum}>{sem ? '—' : pct(taxa(o.reservas, calc.comOcasiao))}</td>
                    <td style={tdNum}><Var v={variacao(o.reservas, o.ant)} /></td>
                    <td style={tdNum}>{anoPorOc ? <Var v={variacao(o.reservas, (anoPorOc.get(o.oc) || []).length)} /> : <span style={{ color: C.muito }}>—</span>}</td>
                    <td style={tdNum}>{n0(o.pessoas)}</td>
                    <td style={tdNum}>{n1(o.tam)}</td>
                    <td style={{ ...tdNum, color: o.b2b ? C.b2b : C.muito }}>{n0(o.b2b)}</td>
                    <td style={tdNum}>{pct(taxa(o.sentadas, o.reservas))}</td>
                    <td style={tdNum}>{pct(taxa(o.noshow, o.reservas))}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Secao>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: 16 }}>
        <Secao titulo="Por status" sub={`Status atual das reservas criadas no período · clique para ver as reservas`}>
          {calc.status.map(s => (
            <div key={s.id} onClick={() => setAberto({ tipo: 's', valor: s.id })} style={{ cursor: 'pointer' }}>
              <BarraH label={s.label} valor={s.lista.length} max={maxSt} cor={s.cor}
                texto={`${n0(s.lista.length)} · ${pct(taxa(s.lista.length, total))}`} />
            </div>
          ))}
        </Secao>

        <Secao titulo="Status por origem" sub="% das reservas de cada origem">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                <th style={th}>Status</th>
                {GRUPOS.filter(g => filtros.grupos.includes(g.id)).map(g => <th key={g.id} style={{ ...thNum, color: g.cor }}>{g.label}</th>)}
              </tr></thead>
              <tbody>
                {calc.status.map(s => (
                  <tr key={s.id}>
                    <td style={td}>{s.label}</td>
                    {GRUPOS.filter(g => filtros.grupos.includes(g.id)).map(g => {
                      const doGrupo = calc.atual.filter(r => r.g === g.id).length
                      return <td key={g.id} style={tdNum}>{pct(taxa(s.lista.filter(r => r.g === g.id).length, doGrupo))}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Secao>
      </div>

      <Secao titulo="Crianças nas reservas"
        sub={`Campo “possui crianças” da Get In · só a central preenche, por isso o % é sobre as reservas que têm a informação · ${periodo.label} · clique para ver as reservas`}>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 16 }}>
          {(['sim', 'nao', 'ni'] as Crianca[]).map(k => {
            const q = k === 'sim' ? cr.total.comCrianca : k === 'nao' ? cr.total.semCrianca : cr.total.reservas - cr.total.criancaInformada
            return (
              <div key={k} onClick={() => setAberto({ tipo: 'cr', valor: k })} style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 12, color: C.suave }}>{k === 'sim' ? '👶 ' : ''}{CRIANCA_LABEL[k]}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 26, color: k === 'ni' ? C.muito : C.texto }}>{n0(q)}</div>
                <div style={{ fontSize: 12, color: C.suave }}>
                  {k === 'ni' ? `${pct(taxa(q, cr.total.reservas))} do total` : `${pct(taxa(q, cr.total.criancaInformada))} das informadas`}
                </div>
              </div>
            )
          })}
          <div>
            <div style={{ fontSize: 12, color: C.suave }}>Pessoas em reservas com criança</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 26 }}>{n0(cr.pessoasCom)}</div>
            <div style={{ fontSize: 12, color: C.suave }}>a Get In não informa quantas são crianças</div>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
          {tabelaCr('Ocasião', cr.porOcasiao)}
          {tabelaCr('Casa', cr.porCasa)}
        </div>
      </Secao>

      {aberto && (
        <Drawer
          titulo={aberto.tipo === 'oc' ? (aberto.valor === SEM ? 'Sem ocasião informada' : aberto.valor) : aberto.tipo === 'cr' ? CRIANCA_LABEL[aberto.valor as Crianca] : statusLabel(aberto.valor)}
          sub={`${n0(lista.length)} reservas criadas · ${periodo.label}`}
          onFechar={() => setAberto(null)}
          acoes={<button style={botao} onClick={() => exportarExcel(`reservas_${aberto.tipo}_${periodo.inicio}_a_${periodo.fim}`, lista)}>Exportar</button>}>
          <TabelaReservas linhas={lista} />
        </Drawer>
      )}
    </>
  )
}
