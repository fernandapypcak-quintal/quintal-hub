'use client'

import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import {
  type Config, type Filtros, type Grao, type Grupo, type Historico, type Linha, type Periodo,
  GRUPOS, HIST_DE, addDias, addMeses, agruparPor, aplicarFiltros, ativa, chaveGrao, chavesGrao, diaSemana,
  exportarExcel, exportarHistorico, histMensal, inicioHistorico, mediaHistorica, mesCurto, n0, n1, nomeMes, pct, primeiroDia, projetarMes, resumir,
  rotuloGrao, temHistoricoDesde, useHistorico, useLinhas, variacao,
} from '../utils'
import { Aviso, BarraH, C, Kpi, MONO, Secao, Spinner, Var, botao, card, pill, td, tdNum, th, thNum } from '../ui'

// ─── Meta do time (sempre o mês corrente, todas as casas liberadas) ─────────
function BlocoMeta({ base, config, hoje, hist }: { base: Linha[]; config: Config; hoje: string; hist: Historico | null }) {
  const mes = hoje.slice(0, 7)
  const meta = config.metas.find(m => m.mes === mes) || null

  const calc = useMemo(() => projetarMes(base.filter(r => r.m), hoje), [base, hoje])

  // Ano passado e média: não temos a equipe da época → compara com tudo que a central fez sem B2B
  const ref = useMemo(() => {
    if (!hist) return { ano: null as number | null, media: null as ReturnType<typeof mediaHistorica> }
    const mapa = histMensal(hist, 'criacao', { grupos: ['time'], unidades: [] })
    return { ano: mapa.get(addMeses(mes, -12))?.reservas ?? null, media: mediaHistorica(mapa, hist, 'criacao', mes) }
  }, [hist, mes])

  const referencias = (
    <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.borda}`, fontSize: 12, color: C.suave, display: 'flex', gap: 28, flexWrap: 'wrap' }}>
      <span>{nomeMes(addMeses(mes, -12))} <b style={{ ...MONO, color: C.texto }}>{ref.ano != null ? n0(ref.ano) : '—'}</b>
        {ref.ano ? <> · projeção do time <Var v={variacao(calc.projecao, ref.ano)} /></> : null}</span>
      <span>média histórica <b style={{ ...MONO, color: C.texto }}>{ref.media ? n0(ref.media.reservas) : '—'}</b>/mês
        {ref.media ? <> · projeção do time <Var v={variacao(calc.projecao, ref.media.reservas)} /></> : null}</span>
      <span style={{ flexBasis: '100%' }}>Ano passado e média = tudo que a central fez sem B2B (a equipe da época não está registrada).</span>
    </div>
  )

  const titulo = `Meta do time de reservas — ${nomeMes(mes)}`
  if (!meta) {
    return (
      <Secao titulo={titulo}>
        <div style={{ ...MONO, fontSize: 34 }}>{n0(calc.realizado)}</div>
        <div style={{ fontSize: 12, color: C.suave, marginBottom: 12 }}>reservas criadas pelo time no mês</div>
        <Aviso tipo="info">Sem meta cadastrada para {nomeMes(mes)}. Preencha a aba METAS da planilha de reservas.</Aviso>
        {referencias}
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
  const ref1 = faixas[0] || meta.desafio || 0

  return (
    <Secao titulo={titulo} sub={`Reservas criadas pelos operadores do time${config.restrito ? ' · só as casas liberadas para você' : ''} · não muda com os filtros`}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-end', marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 12, color: C.suave }}>Realizado</div>
          <div style={{ ...MONO, fontSize: 40, letterSpacing: -1 }}>{n0(calc.realizado)}</div>
          <div style={{ fontSize: 12, color: C.suave }}>{pct(ref1 ? calc.realizado / ref1 : null)} da {faixas.length ? 'faixa 1' : 'meta'}</div>
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
      {referencias}
    </Secao>
  )
}

// ─── Hoje ───────────────────────────────────────────────────────────────
const DIA = (iso: string) => ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][diaSemana(iso)]

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

// ─── Histórico mensal (data de criação) ────────────────────────────────────
// Meses passados usam o equivalente histórico de cada origem (HIST_DE), porque a equipe de antes não está registrada.
function BlocoHistorico({ hist, base, filtros, hoje }: { hist: Historico; base: Linha[]; filtros: Filtros; hoje: string }) {
  const mesAtual = hoje.slice(0, 7)
  const mesAno = addMeses(mesAtual, -12)
  const [metrica, setMetrica] = useState<'reservas' | 'pessoas'>('reservas')
  const [baseData, setBaseData] = useState<'criacao' | 'reserva'>('criacao')
  const porCriacao = baseData === 'criacao'
  const rotMetrica = metrica === 'reservas' ? 'reservas' : 'pessoas'

  const calc = useMemo(() => {
    const valor = (x: { reservas: number; pessoas: number } | undefined | null) => (x ? x[metrica] : 0)
    const peso = (r: Linha) => (metrica === 'pessoas' ? r.p : 1)
    const linhasCasa = base.filter(r => !filtros.unidades.length || filtros.unidades.includes(r.u))

    // Comparação com a média histórica, por origem
    const origens = [...GRUPOS.map(g => ({ id: g.id as string, label: g.label, cor: g.cor, hist: g.hist, grupos: [g.id] })),
      { id: 'total', label: 'Total', cor: C.texto, hist: '', grupos: GRUPOS.map(g => g.id) }]
    const comparacao = origens.map(o => {
      const mapa = histMensal(hist, baseData, { ...filtros, grupos: o.grupos })
      const media = mediaHistorica(mapa, hist, baseData, mesAtual)
      // por criação: mês atual ao vivo + projeção; por data da reserva: o que já está agendado para o mês
      const proj = porCriacao
        ? projetarMes(linhasCasa.filter(r => o.grupos.includes(r.g)), hoje, peso)
        : { realizado: valor(mapa.get(mesAtual)), projecao: null as number | null }
      return { ...o, media: media ? media[metrica] : null, ano: mapa.has(mesAno) ? valor(mapa.get(mesAno)) : null, realizado: proj.realizado, projecao: proj.projecao }
    })

    // Gráfico desde janeiro do ano passado
    const porGrupo = GRUPOS.map(g => ({ g: g.id, mapa: histMensal(hist, baseData, { ...filtros, grupos: [g.id] }) }))
    const media = mediaHistorica(histMensal(hist, baseData, filtros), hist, baseData, mesAtual)
    const meses: string[] = []
    for (let m = inicioHistorico(hist, mesAtual); m <= mesAtual; m = addMeses(m, 1)) meses.push(m)
    const serie = meses.map(m => {
      const linha: Record<string, string | number> = { mes: m, rotulo: `${mesCurto(m)}/${m.slice(2, 4)}` }
      for (const { g, mapa } of porGrupo) {
        linha[g] = porCriacao && m === mesAtual
          ? linhasCasa.filter(r => r.g === g && r.dc.startsWith(mesAtual)).reduce((s, r) => s + peso(r), 0)
          : valor(mapa.get(m))
      }
      return linha
    })
    return { comparacao, serie, media: media ? media[metrica] : null }
  }, [hist, base, filtros, hoje, mesAtual, mesAno, metrica, baseData, porCriacao])

  return (
    <Secao titulo="Histórico mensal e comparação com a média"
      sub={`${metrica === 'reservas' ? 'Reservas' : 'Pessoas'} por mês de ${porCriacao ? 'criação' : 'reserva (dia em que vão à casa)'} · desde ${nomeMes(inicioHistorico(hist, mesAtual))} · casa do filtro · média = meses fechados · como a equipe de antes não está registrada, os meses passados usam o equivalente de cada origem`}
      direita={
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={pill(metrica === 'reservas')} onClick={() => setMetrica('reservas')}>Reservas</button>
          <button style={pill(metrica === 'pessoas')} onClick={() => setMetrica('pessoas')}>Pessoas</button>
          <span style={{ width: 1, background: '#E8E8E8', margin: '4px 2px' }} />
          <button style={pill(porCriacao)} onClick={() => setBaseData('criacao')}>Data de criação</button>
          <button style={pill(!porCriacao)} onClick={() => setBaseData('reserva')}>Data da reserva</button>
          <button style={botao} onClick={() => exportarHistorico(hist, mesAtual)}>Exportar histórico</button>
        </div>
      }>
      <div style={{ overflowX: 'auto', marginBottom: 18 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Origem</th><th style={thNum}>Média hist./mês</th><th style={thNum}>{nomeMes(mesAno)}</th>
            <th style={thNum}>{nomeMes(mesAtual)} {porCriacao ? 'até hoje' : 'agendado'}</th>
            {porCriacao && <th style={thNum}>Projeção do mês</th>}
            <th style={thNum}>{porCriacao ? 'Projeção' : 'Agendado'} vs média</th><th style={thNum}>{porCriacao ? 'Projeção' : 'Agendado'} vs ano ant.</th>
          </tr></thead>
          <tbody>
            {calc.comparacao.map(c => {
              const total = c.id === 'total'
              const ref = porCriacao ? (c.projecao ?? 0) : c.realizado
              return (
                <tr key={c.id} style={{ background: total ? C.zebra : undefined }}>
                  <td style={{ ...td, fontWeight: total ? 700 : 500, color: total ? C.texto : c.cor }}>
                    {c.label}{c.hist && <div style={{ fontSize: 10.5, color: C.suave, fontWeight: 400 }}>{c.hist}</div>}
                  </td>
                  <td style={tdNum}>{c.media != null ? n0(c.media) : '—'}</td>
                  <td style={tdNum}>{c.ano != null ? n0(c.ano) : '—'}</td>
                  <td style={{ ...tdNum, fontWeight: porCriacao ? 400 : 600 }}>{n0(c.realizado)}</td>
                  {porCriacao && <td style={{ ...tdNum, fontWeight: 600 }}>{n0(c.projecao ?? 0)}</td>}
                  <td style={tdNum}>{c.media ? <Var v={variacao(ref, c.media)} /> : '—'}</td>
                  <td style={tdNum}>{c.ano ? <Var v={variacao(ref, c.ano)} /> : <span style={{ color: C.muito }}>—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={calc.serie} margin={{ top: 4, right: 8, left: -4, bottom: 0 }}>
            <CartesianGrid stroke="#F1F1F1" vertical={false} />
            <XAxis dataKey="rotulo" tick={{ fontSize: 10.5, fill: '#999' }} tickLine={false} axisLine={{ stroke: '#E8E8E8' }} />
            <YAxis tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={false} allowDecimals={false} tickFormatter={v => (v >= 1000 ? `${n1(v / 1000)}k` : String(v))} />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: `1px solid ${C.borda}` }} formatter={(v, n) => [`${n0(Number(v))} ${rotMetrica}`, GRUPOS.find(g => g.id === n)?.label || String(n)]} />
            <Legend formatter={v => GRUPOS.find(g => g.id === v)?.label || v} wrapperStyle={{ fontSize: 12 }} />
            {GRUPOS.filter(g => filtros.grupos.includes(g.id)).map((g, i, arr) => (
              <Bar key={g.id} dataKey={g.id} stackId="h" fill={g.cor} maxBarSize={34} radius={i === arr.length - 1 ? [3, 3, 0, 0] : undefined} />
            ))}
            {calc.media != null && <ReferenceLine y={calc.media} stroke="#1a1a1a" strokeDasharray="5 4" label={{ value: `média ${n0(calc.media)}`, position: 'insideTopLeft', fontSize: 11, fill: '#555' }} />}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: 11.5, color: C.suave, marginTop: 8 }}>
        Gráfico com as origens do filtro (meses passados pelo equivalente: time = central sem B2B, corporativo = B2B); a linha tracejada é a média histórica delas somadas. {nomeMes(mesAtual)} está parcial
        {porCriacao ? '' : ' (reservas já agendadas; ainda entram novas)'}. Por data da reserva, o histórico é atualizado 1x por dia.
        O Exportar baixa o histórico completo (as duas bases, por mês, origem e casa).
      </div>
    </Secao>
  )
}

// ─── Aba ────────────────────────────────────────────────────────────────
export default function Resumo({ config, filtros, periodo, grao, setGrao, hoje }: {
  config: Config; filtros: Filtros; periodo: Periodo; grao: Grao; setGrao: (g: Grao) => void; hoje: string
}) {
  const mes = hoje.slice(0, 7)
  const base = useLinhas('criacao', primeiroDia(addMeses(mes, -1)), hoje)
  const dados = useLinhas('criacao', periodo.antInicio, periodo.fim)
  const temAno = temHistoricoDesde(config, periodo.anoInicio)
  const ano = useLinhas('criacao', temAno ? periodo.anoInicio : '', temAno ? periodo.anoFim : '')
  const paraHoje = useLinhas('reserva', hoje, hoje)
  const { hist, erro: erroHist } = useHistorico()

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

    const casas = Array.from(agruparPor(doPeriodo, r => r.u)).map(([u, l]) => ({
      u, total: l.length, ant: doAnt.filter(r => r.u === u).length, pessoas: l.reduce((s, r) => s + r.p, 0),
      porGrupo: Object.fromEntries(GRUPOS.map(g => [g.id, l.filter(r => r.g === g.id).length])) as Record<Grupo, number>,
    })).sort((a, b) => b.total - a.total)

    return {
      filtradas, serie, casas,
      cards: [
        { id: 'total', label: 'Total', cor: C.texto, at: porGrupo(doPeriodo), an: porGrupo(doAnt) },
        ...GRUPOS.map(g => ({ id: g.id as string, label: g.label, cor: g.cor, at: porGrupo(doPeriodo, g.id), an: porGrupo(doAnt, g.id) })),
      ],
    }
  }, [dados.linhas, filtros, periodo, grao])

  // Ano anterior (carrega à parte, não segura a tela)
  const calcAno = useMemo(() => {
    if (!ano.linhas) return null
    const l = ano.linhas.filter(r => !filtros.unidades.length || filtros.unidades.includes(r.u))
    // ano passado: cada origem pelo equivalente (a equipe era outra)
    const porId: Record<string, number> = { total: l.length }
    GRUPOS.forEach(g => { porId[g.id] = l.filter(r => r.gh === HIST_DE[g.id]).length })
    const porCasa = new Map<string, number>()
    l.forEach(r => porCasa.set(r.u, (porCasa.get(r.u) || 0) + 1))
    return { porId, porCasa }
  }, [ano.linhas, filtros])

  const erro = base.erro || dados.erro || paraHoje.erro
  const totalDia = periodo.inicio === periodo.fim
  const semAno = !temAno ? 'sem histórico' : undefined

  return (
    <>
      {erro && <Aviso>{erro}</Aviso>}
      {base.linhas ? <BlocoMeta base={base.linhas} config={config} hoje={hoje} hist={hist} /> : <div style={card}><Spinner texto="Calculando a meta..." /></div>}
      {base.linhas && <BlocoHoje base={base.linhas} paraHoje={paraHoje.linhas} filtros={filtros} hoje={hoje} />}

      {!calc ? <div style={card}><Spinner /></div> : (
        <>
          {(() => {
            const pegar = (id: string) => calc.cards.find(c => c.id === id)!
            const total = pegar('total')
            const ano = (id: string) => calcAno?.porId[id]
            const anoTxt = (id: string) => semAno || (ano(id) === undefined ? '…' : n0(ano(id)!))
            const vAno = (id: string, at: number) => (ano(id) === undefined ? null : variacao(at, ano(id)!))
            return (
              <>
                <div style={{ fontSize: 12, color: C.suave }}>
                  <b style={{ color: C.texto }}>Reservas criadas</b> · {periodo.label} · “anterior” = {periodo.labelAnt} · “ano anterior” = {periodo.labelAno} · só o filtro de casa vale aqui
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1.4fr) repeat(3, minmax(190px, 1fr))', gap: 12, overflowX: 'auto' }}>
                  <Kpi label="Total de reservas criadas" cor={C.texto} valor={n0(total.at.reservas)}
                    detalhe={`${n0(total.at.pessoas)} pessoas · mesa ${n1(total.at.tam)}${total.at.b2b ? ` · ${n0(total.at.b2b)} B2B` : ''}`}
                    anterior={n0(total.an.reservas)} v={variacao(total.at.reservas, total.an.reservas)}
                    anoAnterior={anoTxt('total')} vAno={vAno('total', total.at.reservas)}>
                    <div style={{ display: 'flex', height: 8, borderRadius: 99, overflow: 'hidden', marginTop: 12, background: '#F1F1EC' }}>
                      {GRUPOS.map(g => <div key={g.id} style={{ width: `${total.at.reservas ? (pegar(g.id).at.reservas / total.at.reservas) * 100 : 0}%`, background: g.cor }} />)}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.suave, marginTop: 6 }}>
                      = {GRUPOS.map((g, i) => (
                        <span key={g.id}>{i > 0 && ' + '}<b style={{ color: g.cor }}>{n0(pegar(g.id).at.reservas)}</b> {g.label.toLowerCase()}</span>
                      ))}
                    </div>
                  </Kpi>
                  {GRUPOS.map(g => {
                    const c = pegar(g.id)
                    return (
                      <Kpi key={g.id} label={g.label} cor={g.cor} valor={n0(c.at.reservas)}
                        detalhe={`${pct(total.at.reservas ? c.at.reservas / total.at.reservas : null)} do total · ${n0(c.at.pessoas)} pessoas${c.at.b2b ? ` · ${n0(c.at.b2b)} B2B` : ''}`}
                        anterior={n0(c.an.reservas)} v={variacao(c.at.reservas, c.an.reservas)}
                        anoAnterior={anoTxt(g.id)} vAno={vAno(g.id, c.at.reservas)}>
                        <div style={{ fontSize: 10.5, color: C.muito, marginTop: 4 }}>ano anterior {g.hist.replace('no passado: ', '= ')}</div>
                      </Kpi>
                    )
                  })}
                </div>
              </>
            )
          })()}

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
                    {GRUPOS.filter(g => filtros.grupos.includes(g.id)).map((g, i, arr) => (
                      <Bar key={g.id} dataKey={g.id} stackId="a" fill={g.cor} maxBarSize={36} radius={i === arr.length - 1 ? [3, 3, 0, 0] : undefined} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Secao>
          )}

          <Secao titulo="Reservas criadas por casa" sub={`${periodo.label} · todas as origens, separadas · variação do total vs ${periodo.labelAnt} e vs ${periodo.labelAno}`}
            direita={<button style={botao} onClick={() => exportarExcel(`reservas_criadas_${periodo.inicio}_a_${periodo.fim}`, calc.filtradas)}>Exportar Excel</button>}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Casa</th><th style={thNum}>Total</th><th style={thNum}>vs ant.</th><th style={thNum}>vs ano ant.</th>
                  {GRUPOS.map(g => <th key={g.id} style={{ ...thNum, color: g.cor }}>{g.label}</th>)}
                  <th style={thNum}>Pessoas</th>
                </tr></thead>
                <tbody>
                  {calc.casas.map(c => (
                    <tr key={c.u}>
                      <td style={td}>{c.u}</td>
                      <td style={{ ...tdNum, fontWeight: 600 }}>{n0(c.total)}</td>
                      <td style={tdNum}><Var v={variacao(c.total, c.ant)} /></td>
                      <td style={tdNum}>{calcAno ? <Var v={variacao(c.total, calcAno.porCasa.get(c.u) || 0)} /> : <span style={{ color: C.muito }}>—</span>}</td>
                      {GRUPOS.map(g => <td key={g.id} style={tdNum}>{n0(c.porGrupo[g.id])}</td>)}
                      <td style={tdNum}>{n0(c.pessoas)}</td>
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

      {erroHist && <Aviso>Histórico mensal: {erroHist}</Aviso>}
      {hist && base.linhas && <BlocoHistorico hist={hist} base={base.linhas} filtros={filtros} hoje={hoje} />}
    </>
  )
}

