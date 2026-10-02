'use client'

import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  type Config, type Filtros, type Grao, type Grupo, type Linha, type Periodo,
  GRUPOS, addDias, addMeses, agruparPor, aplicarFiltros, ativa, chaveGrao, chavesGrao, diaSemana,
  diffDias, exportarExcel, n0, n1, nomeMes, pct, primeiroDia, resumir, rotuloGrao, ultimoDia, useLinhas, variacao,
} from '../utils'
import { Aviso, BarraH, C, Kpi, MONO, Secao, Spinner, Var, botao, card, pill, td, tdNum, th, thNum } from '../ui'

// ─── Meta do time (sempre o mês corrente, todas as casas liberadas) ─────────
function BlocoMeta({ base, config, hoje }: { base: Linha[]; config: Config; hoje: string }) {
  const mes = hoje.slice(0, 7)
  const meta = config.metas.find(m => m.mes === mes) || null

  const calc = useMemo(() => {
    const mes = hoje.slice(0, 7)
    const fimMes = ultimoDia(mes)
    const doTime = base.filter(r => r.m)
    const realizado = doTime.filter(r => r.dc.startsWith(mes)).length
    const hojeQtd = doTime.filter(r => r.dc === hoje).length
    const porData: Record<string, number> = {}
    doTime.forEach(r => { porData[r.dc] = (porData[r.dc] || 0) + 1 })
    const soma = [0, 0, 0, 0, 0, 0, 0], qtd = [0, 0, 0, 0, 0, 0, 0]
    for (let i = 1; i <= 28; i++) { const d = addDias(hoje, -i); soma[diaSemana(d)] += porData[d] || 0; qtd[diaSemana(d)]++ }
    const media = soma.map((s, i) => (qtd[i] ? s / qtd[i] : 0))
    let projecao = realizado + Math.max(0, media[diaSemana(hoje)] - hojeQtd)
    for (let d = addDias(hoje, 1); d <= fimMes; d = addDias(d, 1)) projecao += media[diaSemana(d)]
    return { realizado, projecao: Math.round(projecao), diasRestantes: diffDias(hoje, fimMes) + 1, ritmo: media.reduce((a, b) => a + b, 0) / 7 }
  }, [base, hoje])

  const titulo = `Meta do time de reservas — ${nomeMes(mes)}`
  if (!meta) {
    return (
      <Secao titulo={titulo}>
        <div style={{ ...MONO, fontSize: 34 }}>{n0(calc.realizado)}</div>
        <div style={{ fontSize: 12, color: C.suave, marginBottom: 12 }}>reservas criadas pelo time no mês</div>
        <Aviso tipo="info">Sem meta cadastrada para {nomeMes(mes)}. Preencha a aba METAS da planilha de reservas.</Aviso>
      </Secao>
    )
  }

  const faixas = [...meta.faixas].sort((a, b) => a - b)
  const marcos = [
    ...faixas.map((v, i) => ({ v, label: `Faixa ${i + 1}`, desafio: false })),
    ...(meta.desafio ? [{ v: meta.desafio, label: 'Desafio', desafio: true }] : []),
  ].sort((a, b) => a.v - b.v)
  const topo = Math.max(...marcos.map(m => m.v), calc.projecao, calc.realizado) * 1.06
  const proximo = marcos.find(m => m.v > calc.realizado)
  const necessario = proximo ? (proximo.v - calc.realizado) / calc.diasRestantes : null
  const projAting = [...marcos].reverse().find(m => m.v <= calc.projecao)
  const ref = faixas[0] || meta.desafio || 0

  return (
    <Secao titulo={titulo} sub={`Reservas criadas pelos operadores do time${config.restrito ? ' · só as casas liberadas para você' : ''} · não muda com os filtros`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: C.suave }}>Realizado</div>
          <div style={{ ...MONO, fontSize: 40, letterSpacing: -1 }}>{n0(calc.realizado)}</div>
          <div style={{ fontSize: 12, color: C.suave }}>{pct(ref ? calc.realizado / ref : null)} da {faixas.length ? 'faixa 1' : 'meta'}</div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: C.suave }}>Projeção de fechamento</div>
          <div style={{ ...MONO, fontSize: 28, color: projAting ? C.verde : C.vermelho }}>{n0(calc.projecao)}</div>
          <div style={{ fontSize: 12, color: C.suave }}>{projAting ? `bate ${projAting.label.toLowerCase()}` : 'abaixo da faixa 1'}</div>
        </div>
        {proximo && (
          <div>
            <div style={{ fontSize: 12, color: C.suave }}>Ritmo necessário p/ {proximo.label.toLowerCase()}</div>
            <div style={{ ...MONO, fontSize: 28 }}>{n1(necessario || 0)}<span style={{ fontSize: 13, color: C.suave }}>/dia</span></div>
            <div style={{ fontSize: 12, color: C.suave }}>
              ritmo atual <span style={MONO}>{n1(calc.ritmo)}</span>/dia · faltam {n0(proximo.v - calc.realizado)} em {calc.diasRestantes} dias
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {marcos.filter(m => m.v <= calc.realizado).map(m => (
            <span key={m.label} style={{ fontSize: 12, padding: '4px 10px', borderRadius: 99, background: m.desafio ? '#FFF6D6' : C.verdeFundo, color: m.desafio ? '#8A6D00' : '#5d6a10', fontWeight: 600 }}>
              ✓ {m.label}
            </span>
          ))}
        </div>
      </div>
      <div style={{ position: 'relative', height: 64 }}>
        <div style={{ position: 'absolute', top: 22, left: 0, right: 0, height: 16, background: '#F1F1EC', borderRadius: 99, overflow: 'hidden' }}>
          {calc.projecao > calc.realizado && (
            <div style={{ position: 'absolute', inset: 0, width: `${(calc.projecao / topo) * 100}%`, background: 'repeating-linear-gradient(45deg,#E2E8C6,#E2E8C6 6px,#EEF2DA 6px,#EEF2DA 12px)' }} />
          )}
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${(calc.realizado / topo) * 100}%`, background: C.verde, borderRadius: 99 }} />
        </div>
        {marcos.map(m => (
          <div key={m.label} style={{ position: 'absolute', left: `${(m.v / topo) * 100}%`, top: 0, transform: 'translateX(-50%)', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: m.desafio ? '#8A6D00' : C.suave, fontWeight: 600, whiteSpace: 'nowrap' }}>{m.label}</div>
            <div style={{ width: 2, height: 26, background: m.desafio ? C.amarelo : C.texto, margin: '2px auto 0' }} />
            <div style={{ ...MONO, fontSize: 11, color: C.suave }}>{n0(m.v)}</div>
          </div>
        ))}
      </div>
    </Secao>
  )
}

// ─── Hoje ───────────────────────────────────────────────────────────────
function BlocoHoje({ base, paraHoje, filtros, hoje }: { base: Linha[]; paraHoje: Linha[] | null; filtros: Filtros; hoje: string }) {
  const agora = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
  const semanaPassada = addDias(hoje, -7)
  const feitas = aplicarFiltros(base, filtros).filter(r => r.dc === hoje)
  const feitasSemPas = aplicarFiltros(base, filtros).filter(r => r.dc === semanaPassada && r.h <= agora)
  const porCasaFeitas = Array.from(agruparPor(feitas, r => r.u)).sort((a, b) => b[1].length - a[1].length)
  const maxF = Math.max(1, ...porCasaFeitas.map(([, l]) => l.length))

  const mov = paraHoje ? aplicarFiltros(paraHoje, filtros).filter(ativa) : null
  const porCasaMov = mov ? Array.from(agruparPor(mov, r => r.u)).map(([u, l]) => ({ u, ...resumir(l) })).sort((a, b) => b.pessoas - a.pessoas) : []
  const totMov = mov ? resumir(mov) : null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
      <Secao titulo="Reservas feitas hoje" sub={`Criadas hoje até ${agora} · vs mesmo horário de ${DIA(semanaPassada)} passada`}>
        <div style={{ display: 'flex', gap: 28, alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <div style={{ ...MONO, fontSize: 38, letterSpacing: -1 }}>{n0(feitas.length)}</div>
            <div style={{ fontSize: 12, color: C.suave }}>
              sem. passada <span style={MONO}>{n0(feitasSemPas.length)}</span> <Var v={variacao(feitas.length, feitasSemPas.length)} />
            </div>
          </div>
          {GRUPOS.filter(g => filtros.grupos.includes(g.id)).map(g => (
            <div key={g.id}>
              <div style={{ fontSize: 12, color: C.suave }}>{g.label}</div>
              <div style={{ ...MONO, fontSize: 22, color: g.cor }}>{n0(feitas.filter(r => r.g === g.id).length)}</div>
            </div>
          ))}
        </div>
        {porCasaFeitas.map(([u, l]) => <BarraH key={u} label={u} valor={l.length} max={maxF} texto={`${n0(l.length)} · ${n0(l.reduce((s, r) => s + r.p, 0))} pess.`} />)}
        {!feitas.length && <div style={{ fontSize: 13, color: C.suave }}>Nenhuma reserva criada hoje ainda.</div>}
      </Secao>

      <Secao titulo="Reservas para hoje" sub="Movimento das casas hoje (data da reserva), sem canceladas">
        {!mov ? <Spinner texto="Carregando agenda de hoje..." /> : (
          <>
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 12 }}>
              <div><div style={{ fontSize: 12, color: C.suave }}>Reservas</div><div style={{ ...MONO, fontSize: 26 }}>{n0(totMov?.reservas || 0)}</div></div>
              <div><div style={{ fontSize: 12, color: C.suave }}>Pessoas</div><div style={{ ...MONO, fontSize: 26 }}>{n0(totMov?.pessoas || 0)}</div></div>
              <div><div style={{ fontSize: 12, color: C.suave }}>B2B</div><div style={{ ...MONO, fontSize: 26, color: C.b2b }}>{n0(totMov?.b2bPessoas || 0)}<span style={{ fontSize: 12 }}> pess.</span></div></div>
              <div><div style={{ fontSize: 12, color: C.suave }}>Pendentes</div><div style={{ ...MONO, fontSize: 26, color: C.amarelo }}>{n0(totMov?.pendentes || 0)}</div></div>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={th}>Casa</th><th style={thNum}>Reservas</th><th style={thNum}>Pessoas</th><th style={thNum}>B2B pess.</th><th style={thNum}>Pendentes</th></tr></thead>
              <tbody>
                {porCasaMov.map(c => (
                  <tr key={c.u}>
                    <td style={td}>{c.u}</td><td style={tdNum}>{n0(c.reservas)}</td><td style={tdNum}>{n0(c.pessoas)}</td>
                    <td style={{ ...tdNum, color: c.b2bPessoas ? C.b2b : C.muito }}>{n0(c.b2bPessoas)}</td>
                    <td style={{ ...tdNum, color: c.pendentes ? '#8A6D00' : C.muito }}>{n0(c.pendentes)}</td>
                  </tr>
                ))}
                {!porCasaMov.length && <tr><td style={{ ...td, color: C.suave }} colSpan={5}>Nenhuma reserva para hoje.</td></tr>}
              </tbody>
            </table>
          </>
        )}
      </Secao>
    </div>
  )
}
const DIA = (iso: string) => ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][diaSemana(iso)]

// ─── Aba ────────────────────────────────────────────────────────────────
export default function Resumo({ config, filtros, periodo, grao, setGrao, hoje }: {
  config: Config; filtros: Filtros; periodo: Periodo; grao: Grao; setGrao: (g: Grao) => void; hoje: string
}) {
  const mes = hoje.slice(0, 7)
  const base = useLinhas('criacao', primeiroDia(addMeses(mes, -1)), hoje)
  const dados = useLinhas('criacao', periodo.antInicio, periodo.fim)
  const paraHoje = useLinhas('reserva', hoje, hoje)

  const calc = useMemo(() => {
    if (!dados.linhas) return null
    const porUnidade = (r: Linha) => !filtros.unidades.length || filtros.unidades.includes(r.u)
    const doPeriodo = dados.linhas.filter(r => porUnidade(r) && r.dc >= periodo.inicio && r.dc <= periodo.fim)
    const doAnt = dados.linhas.filter(r => porUnidade(r) && r.dc >= periodo.antInicio && r.dc <= periodo.antFim)
    const porGrupo = (l: Linha[], g?: Grupo) => resumir(g ? l.filter(r => r.g === g) : l)

    const filtradas = doPeriodo.filter(r => filtros.grupos.includes(r.g))
    const chaves = chavesGrao(periodo.inicio, periodo.fim, grao)
    const cont = new Map<string, Record<Grupo, number>>()
    chaves.forEach(k => cont.set(k, { time: 0, online: 0, corp: 0 }))
    filtradas.forEach(r => { const c = cont.get(chaveGrao(r.dc, grao)); if (c) c[r.g]++ })
    const serie = chaves.map(k => ({ rotulo: rotuloGrao(k, grao), ...(cont.get(k) as Record<Grupo, number>) }))

    const casas = Array.from(agruparPor(doPeriodo, r => r.u)).map(([u, l]) => {
      const ant = doAnt.filter(r => r.u === u).length
      return {
        u, total: l.length, ant, pessoas: l.reduce((s, r) => s + r.p, 0), b2b: l.filter(r => r.b).length,
        time: l.filter(r => r.g === 'time').length, online: l.filter(r => r.g === 'online').length, corp: l.filter(r => r.g === 'corp').length,
      }
    }).sort((a, b) => b.total - a.total)

    return {
      doPeriodo, filtradas, serie, casas,
      cards: [
        { id: 'total', label: 'Reservas no período — todas', cor: C.texto, at: porGrupo(doPeriodo), an: porGrupo(doAnt) },
        ...GRUPOS.map(g => ({ id: g.id, label: g.label, cor: g.cor, at: porGrupo(doPeriodo, g.id), an: porGrupo(doAnt, g.id) })),
      ],
    }
  }, [dados.linhas, filtros, periodo, grao])

  const erro = base.erro || dados.erro || paraHoje.erro
  const grupoAtivo = (g: Grupo) => filtros.grupos.includes(g)
  const totalDia = periodo.inicio === periodo.fim

  return (
    <>
      {erro && <Aviso>{erro}</Aviso>}
      {base.linhas ? <BlocoMeta base={base.linhas} config={config} hoje={hoje} /> : <div style={card}><Spinner texto="Calculando a meta..." /></div>}
      {base.linhas && <BlocoHoje base={base.linhas} paraHoje={paraHoje.linhas} filtros={filtros} hoje={hoje} />}

      {!calc ? <div style={card}><Spinner /></div> : (
        <>
          <div>
            <div style={{ fontSize: 12, color: C.suave, marginBottom: 8 }}>
              Reservas criadas · {periodo.label} vs {periodo.labelAnt} · cards mostram cada origem separada (só o filtro de casa vale aqui)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {calc.cards.map(c => (
                <Kpi key={c.id} label={c.label} cor={c.cor} valor={n0(c.at.reservas)}
                  detalhe={`${n0(c.at.pessoas)} pessoas · mesa ${n1(c.at.tam)}${c.at.b2b ? ` · ${n0(c.at.b2b)} B2B` : ''}`}
                  anterior={n0(c.an.reservas)} v={variacao(c.at.reservas, c.an.reservas)} />
              ))}
            </div>
          </div>

          {!totalDia && (
            <Secao titulo="Reservas criadas ao longo do período" sub={`${periodo.label} · empilhado por origem`}
              direita={
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['dia', 'semana', 'mes'] as Grao[]).map(g => (
                    <button key={g} style={pill(grao === g)} onClick={() => setGrao(g)}>{g === 'dia' ? 'Diário' : g === 'semana' ? 'Semanal' : 'Mensal'}</button>
                  ))}
                </div>
              }>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={calc.serie} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid stroke="#F1F1F1" vertical={false} />
                    <XAxis dataKey="rotulo" tick={{ fontSize: 10, fill: '#999' }} tickLine={false} axisLine={{ stroke: '#E8E8E8' }} interval="preserveStartEnd" />
                    <YAxis tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.borda}` }} formatter={(v, n) => [n0(Number(v)), GRUPOS.find(g => g.id === n)?.label || String(n)]} />
                    <Legend formatter={v => GRUPOS.find(g => g.id === v)?.label || v} wrapperStyle={{ fontSize: 12 }} />
                    {GRUPOS.filter(g => grupoAtivo(g.id)).map((g, i, arr) => (
                      <Bar key={g.id} dataKey={g.id} stackId="a" fill={g.cor} maxBarSize={36} radius={i === arr.length - 1 ? [3, 3, 0, 0] : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Secao>
          )}

          <Secao titulo="Reservas criadas por casa" sub={`${periodo.label} · todas as origens, separadas · variação do total vs ${periodo.labelAnt}`}
            direita={<button style={botao} onClick={() => exportarExcel(`reservas_criadas_${periodo.inicio}_a_${periodo.fim}`, calc.filtradas)}>Exportar Excel</button>}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Casa</th><th style={thNum}>Total</th><th style={thNum}>vs ant.</th>
                  {GRUPOS.map(g => <th key={g.id} style={{ ...thNum, color: g.cor }}>{g.label}</th>)}
                  <th style={thNum}>% time</th><th style={thNum}>Pessoas</th><th style={thNum}>B2B</th>
                </tr></thead>
                <tbody>
                  {calc.casas.map(c => (
                    <tr key={c.u}>
                      <td style={td}>{c.u}</td>
                      <td style={{ ...tdNum, fontWeight: 600 }}>{n0(c.total)}</td>
                      <td style={tdNum}><Var v={variacao(c.total, c.ant)} /></td>
                      <td style={tdNum}>{n0(c.time)}</td><td style={tdNum}>{n0(c.online)}</td><td style={tdNum}>{n0(c.corp)}</td>
                      <td style={tdNum}>{pct(c.total ? c.time / c.total : null)}</td>
                      <td style={tdNum}>{n0(c.pessoas)}</td>
                      <td style={{ ...tdNum, color: c.b2b ? C.b2b : C.muito }}>{n0(c.b2b)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ fontSize: 11.5, color: C.suave, marginTop: 10 }}>
              O Exportar baixa as reservas criadas no período com os filtros de origem e casa aplicados, com todas as colunas.
            </div>
          </Secao>
        </>
      )}
    </>
  )
}
