import React, { useMemo, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { loadNFLista, loadDetalheLancamentosPorBU, reportarDivergenciaBU } from '../../data/loader.js'
import { fmt, fmtK, fmtPctBR as fmtPct, fmtData, mesISOLabel, mesAnteriorISO } from '../../utils.js'
import {
  COR, num, Painel, Kpi, GradeKpis, NomeBU, Abas, Busca, Tabela, Carregando, Erro, Vazio,
  ChipStatus, SemDadosNF, useCarga, botaoSecundario,
} from '../ui/nf.jsx'

// v27 — Custos por BU: o que entrou em nota no mês, o que foi pago no mês
// e o que está em aberto, por BU. Clique numa BU pra ver fornecedores,
// notas e pagamentos.

const somar = (arr, filtro, campo = 'valor') => arr.filter(filtro).reduce((s, x) => s + (x[campo] || 0), 0)

export default function PorBUNF({ irPara }) {
  const { nfResumo, busConfig, corBU, grupoBU, mesNF, buFiltro, setBuFiltro } = useFinanceiro()
  const [modo, setModo] = useState('comp')   // comp = competência (NF) | caixa = pago

  const dados = useMemo(() => {
    if (!nfResumo) return null
    const ant = mesAnteriorISO(mesNF)
    const lista = busConfig.length ? busConfig.map(b => b.bu)
      : [...new Set([...nfResumo.entrou, ...nfResumo.pago].map(x => x.bu))]
    const linhas = lista.map(bu => {
      const e  = somar(nfResumo.entrou, x => x.bu === bu && x.mes === mesNF)
      const eA = somar(nfResumo.entrou, x => x.bu === bu && x.mes === ant)
      const qn = somar(nfResumo.entrou, x => x.bu === bu && x.mes === mesNF, 'qtd')
      // v27.4: "pago" é só fixo + variável; as BUs fora dos totais vêm do pago_tipo
      const fonte = grupoBU(bu) === 'Fora dos totais' ? (nfResumo.pago_tipo || []) : nfResumo.pago
      const p  = somar(fonte, x => x.bu === bu && x.mes === mesNF)
      const pA = somar(fonte, x => x.bu === bu && x.mes === ant)
      const pN = somar(nfResumo.pago,   x => x.bu === bu && x.mes === mesNF, 'valor_com_nf')
      const ab = nfResumo.aberto.find(x => x.bu === bu) || { valor: 0, vencido: 0, qtd: 0, qtd_vencido: 0 }
      return { bu, grupo: grupoBU(bu), entrou: e, entrouAnt: eA, qtdNotas: qn, pago: p, pagoAnt: pA, pagoComNF: pN, aberto: ab.valor, vencido: ab.vencido, qtdAberto: ab.qtd, qtdVencido: ab.qtd_vencido }
    }).filter(l => l.entrou || l.pago || l.aberto || l.entrouAnt || l.pagoAnt)
    const principais = linhas.filter(l => l.grupo !== 'Fora dos totais')
    const fora = linhas.filter(l => l.grupo === 'Fora dos totais')
    const tot = k => principais.reduce((s, l) => s + l[k], 0)
    return {
      principais, fora,
      tot: { entrou: tot('entrou'), entrouAnt: tot('entrouAnt'), qtdNotas: tot('qtdNotas'), pago: tot('pago'), pagoAnt: tot('pagoAnt'), pagoComNF: tot('pagoComNF'), aberto: tot('aberto'), vencido: tot('vencido'), qtdAberto: tot('qtdAberto') },
      foraPago: fora.reduce((s, l) => s + l.pago, 0),
      revisar: linhas.find(l => l.bu === 'Revisar'),
    }
  }, [nfResumo, busConfig, mesNF])

  if (!nfResumo) return <SemDadosNF />
  if (!dados) return null

  const comp = modo === 'comp'
  const campo = comp ? 'entrou' : 'pago'
  const campoAnt = comp ? 'entrouAnt' : 'pagoAnt'
  const ordenadas = [...dados.principais].sort((a, b) => (a.bu === 'Revisar') - (b.bu === 'Revisar') || b[campo] - a[campo])
  const max = Math.max(1, ...ordenadas.map(l => l[campo]))
  const { tot } = dados
  const varPct = (a, b) => b ? ((a - b) / b) * 100 : null
  const selecionada = buFiltro !== 'Todas' ? buFiltro : null
  const label = mesISOLabel(mesNF)

  const grid = 'minmax(150px,1.2fr) minmax(140px,2fr) 96px 96px 90px 84px 96px 92px'

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, width: '100%', boxSizing: 'border-box' }}>
      <GradeKpis>
        <Kpi rotulo={`Entrou em nota em ${label}`} valor={fmtK(tot.entrou)}
          detalhe={`${tot.qtdNotas.toLocaleString('pt-BR')} notas${varPct(tot.entrou, tot.entrouAnt) !== null ? ` · ${fmtPct(varPct(tot.entrou, tot.entrouAnt))} vs mês anterior` : ''}`} />
        <Kpi rotulo={`Pago em ${label}`} valor={fmtK(tot.pago)}
          detalhe={`${tot.pago ? Math.round(tot.pagoComNF / tot.pago * 100) : 0}% com nota${dados.foraPago ? ` · fora dos totais: ${fmtK(dados.foraPago)}` : ''}`} />
        <Kpi rotulo="A pagar (notas em aberto)" valor={fmtK(tot.aberto)}
          detalhe={`${tot.qtdAberto.toLocaleString('pt-BR')} notas · ver agenda`} onClick={() => irPara && irPara('apagar')} />
        <Kpi alerta rotulo="Previsão de pagamento vencida" valor={fmtK(tot.vencido)}
          detalhe={dados.revisar && dados.revisar.vencido ? `${fmtK(dados.revisar.vencido)} em fornecedores sem BU` : 'Notas sem pagamento depois da previsão'}
          onClick={() => irPara && irPara('conciliacao')} />
      </GradeKpis>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <Painel style={{ flex: '999 1 680px' }}
          titulo={comp ? `Por BU: notas que entraram em ${label}` : `Por BU: pago em ${label}`}
          extra={
            <div role="group" aria-label="Visão" style={{ display: 'flex', background: '#F4F4EF', borderRadius: 8, padding: 3, gap: 3 }}>
              {[['comp', 'Competência (nota)'], ['caixa', 'Caixa (pago)']].map(([id, txt]) => (
                <button key={id} onClick={() => setModo(id)} aria-pressed={modo === id}
                  style={{ padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', background: modo === id ? '#fff' : 'transparent', color: modo === id ? COR.texto : COR.suave, fontWeight: modo === id ? 600 : 400 }}>{txt}</button>
              ))}
            </div>
          }>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 860 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '6px 10px', fontSize: 12, color: COR.suave, borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>BU</div><div /><div style={{ textAlign: 'right' }}>Entrou</div><div style={{ textAlign: 'right' }}>Pago</div>
                <div style={{ textAlign: 'right' }}>Pago c/ nota</div><div style={{ textAlign: 'right' }}>vs mês ant.</div>
                <div style={{ textAlign: 'right' }}>A pagar</div><div style={{ textAlign: 'right' }}>Vencido</div>
              </div>
              {ordenadas.map(l => {
                const sel = selecionada === l.bu
                const rev = l.bu === 'Revisar'
                const v = varPct(l[campo], l[campoAnt])
                return (
                  <button key={l.bu} onClick={() => setBuFiltro(sel ? 'Todas' : l.bu)} aria-pressed={sel}
                    style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', width: '100%', padding: '10px', border: 'none', borderBottom: '0.5px solid #F0F0EC', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, color: COR.texto, textAlign: 'left', background: sel ? COR.verdeClaro : rev ? COR.alertaFundo : '#fff' }}>
                    <div style={{ fontWeight: 600 }}><NomeBU bu={l.bu} cor={corBU(l.bu)} /></div>
                    <div style={{ height: 10, background: '#EEEDE6', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round(l[campo] / max * 100)}%`, background: corBU(l.bu), borderRadius: 5 }} />
                    </div>
                    <div style={{ ...num, textAlign: 'right' }}>{l.entrou ? fmtK(l.entrou) : '—'}</div>
                    <div style={{ ...num, textAlign: 'right' }}>{l.pago ? fmtK(l.pago) : '—'}</div>
                    <div style={{ ...num, textAlign: 'right', color: COR.suave }}>{l.pago ? `${Math.round(l.pagoComNF / l.pago * 100)}%` : '—'}</div>
                    <div style={{ ...num, textAlign: 'right', color: v === null ? COR.fraco : v > 10 ? COR.alerta : v < -10 ? COR.verde : COR.suave }}>{v === null ? '—' : fmtPct(v)}</div>
                    <div style={{ ...num, textAlign: 'right' }}>{l.aberto ? fmtK(l.aberto) : '—'}</div>
                    <div style={{ ...num, textAlign: 'right', color: l.vencido > 50000 ? COR.alerta : COR.suave, fontWeight: l.vencido > 50000 ? 600 : 400 }}>{l.vencido ? fmtK(l.vencido) : '—'}</div>
                  </button>
                )
              })}
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '12px 10px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
                <div>Total</div><div />
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(tot.entrou)}</div>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(tot.pago)}</div>
                <div style={{ ...num, textAlign: 'right' }}>{tot.pago ? `${Math.round(tot.pagoComNF / tot.pago * 100)}%` : '—'}</div>
                <div style={{ ...num, textAlign: 'right' }}>{varPct(tot[campo], tot[campoAnt]) === null ? '—' : fmtPct(varPct(tot[campo], tot[campoAnt]))}</div>
                <div style={{ ...num, textAlign: 'right' }}>{fmtK(tot.aberto)}</div>
                <div style={{ ...num, textAlign: 'right', color: COR.alerta }}>{fmtK(tot.vencido)}</div>
              </div>
              {dados.fora.length > 0 && (
                <>
                  <div style={{ fontSize: 12, color: COR.suave, padding: '14px 10px 4px' }}>Fora dos totais</div>
                  {dados.fora.map(l => (
                    <div key={l.bu} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '8px 10px', fontSize: 13, color: COR.suave }}>
                      <div><NomeBU bu={l.bu} cor={corBU(l.bu)} /></div><div />
                      <div style={{ ...num, textAlign: 'right' }}>{l.entrou ? fmtK(l.entrou) : '—'}</div>
                      <div style={{ ...num, textAlign: 'right' }}>{l.pago ? fmtK(l.pago) : '—'}</div>
                      <div style={{ ...num, textAlign: 'right' }}>{l.pago ? `${Math.round(l.pagoComNF / l.pago * 100)}%` : '—'}</div>
                      <div />
                      <div style={{ ...num, textAlign: 'right' }}>{l.aberto ? fmtK(l.aberto) : '—'}</div>
                      <div style={{ ...num, textAlign: 'right' }}>{l.vencido ? fmtK(l.vencido) : '—'}</div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </Painel>

        <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <EvolucaoBU bu={selecionada} />
          {selecionada
            ? <DrillBU bu={selecionada} />
            : <Painel><Vazio>Clique numa BU pra ver fornecedores, notas e pagamentos dela.</Vazio></Painel>}
        </div>
      </div>
    </div>
  )
}

// ── Entrou × pago nos últimos 6 meses ────────────────────────
function EvolucaoBU({ bu }) {
  const { nfResumo, grupoBU, mesNF } = useFinanceiro()
  const serie = useMemo(() => {
    const meses = nfResumo.meses.map(m => m.mes).filter(m => m <= mesNF).sort().slice(-6)
    const ok = x => bu ? x.bu === bu : grupoBU(x.bu) !== 'Fora dos totais'
    return meses.map(m => ({
      mes: mesISOLabel(m),
      Entrou: Math.round(somar(nfResumo.entrou, x => x.mes === m && ok(x))),
      Pago: Math.round(somar(nfResumo.pago, x => x.mes === m && ok(x))),
    }))
  }, [nfResumo, bu, mesNF])
  return (
    <Painel titulo={bu ? `${bu}: entrou × pago` : 'Total: entrou × pago'} extra="últimos 6 meses">
      <div style={{ height: 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={serie} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F0F0EC" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: COR.suave }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => fmtK(v).replace('R$ ', '')} tick={{ fontSize: 11, fill: COR.suave }} axisLine={false} tickLine={false} width={48} />
            <Tooltip formatter={v => fmtK(v)} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Entrou" fill="#97A624" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Pago" fill="#2B4C7E" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Painel>
  )
}

// ── Detalhe da BU: fornecedores, notas, pagamentos ───────────
function DrillBU({ bu }) {
  const [aba, setAba] = useState('fornecedores')
  return (
    <Painel titulo={bu}>
      <Abas ativa={aba} onChange={setAba} abas={[
        { id: 'fornecedores', label: 'Fornecedores' },
        { id: 'notas', label: 'Notas' },
        { id: 'pagamentos', label: 'Pagamentos' },
      ]} />
      {aba === 'fornecedores' && <FornecedoresBU bu={bu} />}
      {aba === 'notas' && <NotasBU bu={bu} />}
      {aba === 'pagamentos' && <PagamentosBU bu={bu} />}
    </Painel>
  )
}

function FornecedoresBU({ bu }) {
  const { nfResumo, mesNF } = useFinanceiro()
  const linhas = useMemo(() => {
    const prazo = {}
    nfResumo.prazos.forEach(p => { prazo[p.cod_for || p.fornecedor] = p })
    return nfResumo.fornecedores
      .filter(f => f.bu === bu && f.mes === mesNF)
      .sort((a, b) => b.valor - a.valor).slice(0, 15)
      .map(f => ({ ...f, prazo: prazo[f.cod_for || f.fornecedor] }))
  }, [nfResumo, bu, mesNF])
  if (!linhas.length) return <Vazio>Nenhuma nota dessa BU em {mesISOLabel(mesNF)}.</Vazio>
  return (
    <>
      <Tabela minWidth={320} linhas={linhas} chave={l => l.cod_for + l.fornecedor} colunas={[
        { id: 'fornecedor', label: 'Fornecedor', render: l => <span title={l.fornecedor} style={{ display: 'block', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.fornecedor}</span> },
        { id: 'valor', label: 'Entrou', direita: true, mono: true, render: l => fmtK(l.valor) },
        { id: 'prazo', label: 'Prazo', direita: true, mono: true, render: l => l.prazo ? `${l.prazo.usado}d` : '—', estilo: () => ({ color: '#6e7a1a', fontWeight: 500 }) },
      ]} />
      <div style={{ fontSize: 11, color: COR.suave, marginTop: 8, lineHeight: 1.5 }}>Prazo = combinado com o fornecedor ou, se não tiver, a mediana real entre a entrada da nota e o pagamento.</div>
    </>
  )
}

function NotasBU({ bu }) {
  const { mesNF } = useFinanceiro()
  const [busca, setBusca] = useState('')
  const { carregando, erro, dados, tentarDeNovo } = useCarga(() => loadNFLista({ mes: mesNF, bu }), [mesNF, bu])
  if (carregando) return <Carregando texto="Buscando notas…" />
  if (erro) return <Erro texto={erro} onTentar={tentarDeNovo} />
  const b = busca.trim().toUpperCase()
  const linhas = (dados || []).filter(n => !b || n.fornecedor.toUpperCase().includes(b) || String(n.documento).includes(b)).slice(0, 100)
  return (
    <>
      <div style={{ marginBottom: 10 }}><Busca valor={busca} onChange={setBusca} placeholder="Buscar fornecedor ou número" /></div>
      <Tabela minWidth={420} linhas={linhas} chave={l => l.chave_nf} vazio="Nenhuma nota encontrada." colunas={[
        { id: 'fornecedor', label: 'Fornecedor', render: l => <div><div style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div><div style={{ fontSize: 11, color: COR.suave }}>NF {l.documento} · {l.unidade}</div></div> },
        { id: 'valor', label: 'Valor', direita: true, mono: true, render: l => fmt(l.valor) },
        { id: 'status', label: 'Situação', render: l => <ChipStatus status={l.status} /> },
      ]} />
      {(dados || []).length > 100 && <div style={{ fontSize: 11, color: COR.suave, marginTop: 8 }}>Mostrando as 100 maiores de {(dados || []).length}. Use a busca pra achar as outras.</div>}
    </>
  )
}

function PagamentosBU({ bu }) {
  const { mesNF } = useFinanceiro()
  const { carregando, erro, dados, tentarDeNovo } = useCarga(
    () => loadDetalheLancamentosPorBU({ centroCusto: bu, mes: mesISOLabel(mesNF), loja: 'Todas' }), [mesNF, bu])
  if (carregando) return <Carregando texto="Buscando pagamentos…" />
  if (erro) return <Erro texto={erro} onTentar={tentarDeNovo} />
  const linhas = (dados || []).slice(0, 100)
  return (
    <>
      <Tabela minWidth={420} linhas={linhas} vazio="Nenhum pagamento dessa BU no mês." colunas={[
        { id: 'fornecedor', label: 'Fornecedor', render: l => <div><div style={{ maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div><div style={{ fontSize: 11, color: COR.suave }}>{l.descricao} · {l.loja}{l.com_nf ? ' · com nota' : ''}</div></div> },
        { id: 'valor', label: 'Valor', direita: true, mono: true, render: l => <div>{fmt(l.valor)}<div style={{ fontSize: 11, color: COR.suave }}>{l.dt_baixa ? `pago ${fmtData(l.dt_baixa)}` : 'em aberto'}</div></div> },
        { id: 'acao', label: '', render: l => <ReportarBU item={l} /> },
      ]} />
      <div style={{ fontSize: 11, color: COR.suave, marginTop: 8, lineHeight: 1.5 }}>Lançamentos do mês {mesISOLabel(mesNF)} (data do título). Se algum não é dessa BU, use "BU errada?" e a correção vai pra aba Correcoes_BU.</div>
    </>
  )
}

function ReportarBU({ item }) {
  const { busDisponiveis } = useFinanceiro()
  const [aberto, setAberto] = useState(false)
  const [bu, setBu] = useState('')
  const [estado, setEstado] = useState('')   // '' | enviando | ok | erro
  if (estado === 'ok') return <span style={{ fontSize: 11, color: COR.verde }}>Enviado</span>
  if (!aberto) return <button onClick={() => setAberto(true)} style={{ ...botaoSecundario, padding: '3px 8px', fontSize: 11 }}>BU errada?</button>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <select value={bu} onChange={e => setBu(e.target.value)} aria-label="BU certa" style={{ fontSize: 11, padding: 3, borderRadius: 6, border: `0.5px solid ${COR.borda}`, fontFamily: 'inherit' }}>
        <option value="">BU certa…</option>
        {busDisponiveis.filter(b => b !== 'Todas' && b !== item.centro_custo).map(b => <option key={b} value={b}>{b}</option>)}
      </select>
      <button disabled={!bu || estado === 'enviando'} onClick={async () => {
        setEstado('enviando')
        const ok = await reportarDivergenciaBU({ fornecedor: item.fornecedor, descricao: item.descricao, buAtual: item.centro_custo, buSugerido: bu, mes: item.mes, loja: item.loja, valor: item.valor })
        setEstado(ok ? 'ok' : 'erro')
      }} style={{ ...botaoSecundario, padding: '3px 8px', fontSize: 11 }}>{estado === 'enviando' ? 'Enviando…' : estado === 'erro' ? 'Tentar de novo' : 'Enviar'}</button>
    </div>
  )
}
