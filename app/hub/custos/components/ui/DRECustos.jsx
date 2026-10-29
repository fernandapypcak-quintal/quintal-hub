import React, { useMemo, useState } from 'react'
import { AREAS_CUSTOS } from '@/lib/bus'
import { loadDRE } from '../../data/loader.js'
import { fmtK, fmtData, mesISOLabel, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Carregando, Erro, Vazio, useCarga, botaoSecundario, exportarExcel, BotaoExportar } from './nf.jsx'
import { filtrarVisaoPessoal } from '../../data/visaoPessoal.js'

// v27.7 — DRE de custos: área > tipo de gasto > fornecedor.
// Colunas: 3 meses fechados + mês atual (pago até agora + notas a pagar no mês = total).
// Custo = fixo + variável pela data do pagamento (igual ao resto do dashboard).
// Gestor: chamado com bu fixo (só a área dele). Diretoria/admin: comSeletor.

const MAX_FORN = 25

function montarArvore(d) {
  const [m0, m1, m2, mAtual] = d.meses
  const vazio = () => ({ [m0]: 0, [m1]: 0, [m2]: 0, pagoAtual: 0, aPagar: 0 })
  const raiz = {}
  const no = (bu, cat, forn) => {
    raiz[bu] = raiz[bu] || { nome: bu, v: vazio(), filhos: {} }
    const b = raiz[bu]
    if (!cat) return b
    b.filhos[cat] = b.filhos[cat] || { nome: cat, v: vazio(), filhos: {} }
    const c = b.filhos[cat]
    if (!forn) return c
    c.filhos[forn] = c.filhos[forn] || { nome: forn, v: vazio() }
    return c.filhos[forn]
  }
  const somar = (bu, cat, forn, campo, valor) => {
    no(bu).v[campo] += valor
    no(bu, cat).v[campo] += valor
    no(bu, cat, forn).v[campo] += valor
  }
  d.pago.forEach(r => somar(r.bu, r.categoria, r.fornecedor, r.mes === mAtual ? 'pagoAtual' : r.mes, r.valor))
  d.a_pagar.forEach(r => somar(r.bu, r.categoria, r.fornecedor, 'aPagar', r.valor))
  const total = v => v.pagoAtual + v.aPagar
  const ordenar = obj => Object.values(obj).sort((a, b) => (total(b.v) + b.v[m2]) - (total(a.v) + a.v[m2]))
  const lista = ordenar(raiz).map(b => ({ ...b, filhos: ordenar(b.filhos).map(c => ({ ...c, filhos: ordenar(c.filhos) })) }))
  const geral = vazio()
  lista.forEach(b => Object.keys(geral).forEach(k => { geral[k] += b.v[k] }))
  return { lista, geral, m0, m1, m2, mAtual }
}

export default function DRECustos({ bu = '', comSeletor = false, visaoPessoal = 'Todos', onVisaoPessoal = undefined }) {
  const [area, setArea] = useState('Todas')
  const alvo = comSeletor ? area : bu
  const c = useCarga(() => loadDRE({ bu: alvo }), [alvo])
  const [abertos, setAbertos] = useState({})
  const [verTodos, setVerTodos] = useState({})

  const arv = useMemo(() => { if (!c.dados || c.dados.meses.length !== 4) return null; if (!/pessoal/i.test(alvo) || visaoPessoal === 'Todos') return montarArvore(c.dados); const dados = { ...c.dados, pago: filtrarVisaoPessoal(c.dados.pago, visaoPessoal), a_pagar: filtrarVisaoPessoal(c.dados.a_pagar, visaoPessoal) }; return montarArvore(dados) }, [c.dados, alvo, visaoPessoal])
  const toggle = k => setAbertos(a => ({ ...a, [k]: !a[k] }))
  const unicaArea = arv && arv.lista.length === 1
  const aberto = (k, nivel) => (abertos[k] !== undefined ? abertos[k] : nivel === 0 && unicaArea)

  const exportar = () => {
    const linhas = []
    arv.lista.forEach(b => b.filhos.forEach(cat => cat.filhos.forEach(f => linhas.push({ bu: b.nome, cat: cat.nome, forn: f.nome, v: f.v }))))
    return exportarExcel(`DRE de custos${alvo && alvo !== 'Todas' ? ` - ${alvo}` : ''} - ${mesNomeCurto(arv.mAtual).replace('/', '-')}`, [
      { titulo: 'Área', valor: l => l.bu, largura: 18 },
      { titulo: 'Tipo de gasto', valor: l => l.cat, largura: 24 },
      { titulo: 'Fornecedor', valor: l => l.forn, largura: 40 },
      { titulo: mesNomeCurto(arv.m0), valor: l => l.v[arv.m0], tipo: 'num' },
      { titulo: mesNomeCurto(arv.m1), valor: l => l.v[arv.m1], tipo: 'num' },
      { titulo: mesNomeCurto(arv.m2), valor: l => l.v[arv.m2], tipo: 'num' },
      { titulo: `${mesNomeCurto(arv.mAtual)} pago`, valor: l => l.v.pagoAtual, tipo: 'num', largura: 14 },
      { titulo: `${mesNomeCurto(arv.mAtual)} a pagar`, valor: l => l.v.aPagar, tipo: 'num', largura: 14 },
      { titulo: `${mesNomeCurto(arv.mAtual)} total`, valor: l => l.v.pagoAtual + l.v.aPagar, tipo: 'num', largura: 14 },
    ], linhas, 'DRE')
  }

  const grid = 'minmax(250px, 2fr) 96px 96px 96px 104px 104px 110px 76px'
  const cel = { ...num, textAlign: 'right', fontSize: 13 }
  const varTxt = (a, b) => {
    if (!b) return { t: '—', cor: COR.suave }
    const p = (a / b - 1) * 100
    return { t: `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1).replace('.', ',')}%`, cor: p > 10 ? '#9A3C06' : p < -10 ? '#4F6B14' : COR.suave }
  }
  const k0 = v => (v ? fmtK(v) : '—')

  const linha = (n, nivel, chave, temFilhos) => {
    const tot = n.v.pagoAtual + n.v.aPagar
    const vr = varTxt(tot, n.v[arv.m2])   // v27.17: mês atual (pago + a pagar) vs mês anterior
    const estaAberto = temFilhos && aberto(chave, nivel)
    const Tag = temFilhos ? 'button' : 'div'
    return (
      <Tag key={chave} onClick={temFilhos ? () => toggle(chave) : undefined} aria-expanded={temFilhos ? estaAberto : undefined}
        style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', width: '100%', border: 'none', borderBottom: '0.5px solid #F0F0EC', fontFamily: 'inherit', textAlign: 'left', color: COR.texto, cursor: temFilhos ? 'pointer' : 'default', padding: nivel === 0 ? '10px 4px' : '7px 4px', background: nivel === 0 ? (n.nome === 'Revisar' ? COR.alertaFundo : '#fff') : nivel === 1 ? COR.fundo : '#F5F5F0' }}>
        <div style={{ paddingLeft: nivel * 22, fontSize: nivel === 2 ? 12 : 13, fontWeight: nivel === 0 ? 600 : 400, color: nivel === 2 ? COR.suave : COR.texto, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={n.nome}>
          <span aria-hidden="true" style={{ display: 'inline-block', width: 14, color: COR.fraco }}>{temFilhos ? (estaAberto ? '▾' : '▸') : ''}</span>
          {nivel === 0 && n.nome === 'Revisar' ? 'Sem área definida' : n.nome}
        </div>
        <div style={cel}>{k0(n.v[arv.m0])}</div>
        <div style={cel}>{k0(n.v[arv.m1])}</div>
        <div style={cel}>{k0(n.v[arv.m2])}</div>
        <div style={{ ...cel, color: COR.suave }}>{k0(n.v.pagoAtual)}</div>
        <div style={{ ...cel, color: COR.suave }}>{k0(n.v.aPagar)}</div>
        <div style={{ ...cel, fontWeight: 600 }}>{k0(tot)}</div>
        <div style={{ ...cel, fontSize: 12, color: vr.cor }}>{vr.t}</div>
      </Tag>
    )
  }

  return (
    <section aria-labelledby="dre-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, margin: comSeletor ? 20 : 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div>
          <h2 id="dre-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>DRE de custos{!comSeletor && bu ? `: ${bu}` : ''}</h2>
          <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5, maxWidth: 760 }}>
            Custo fixo + variável pago por mês. No mês atual: o que já foi pago + as notas em aberto com previsão de pagamento no mês = total previsto. Clique na área pra abrir os tipos de gasto, e no tipo pra abrir os fornecedores.
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {onVisaoPessoal && <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Visão de pessoal <select value={visaoPessoal} onChange={e => onVisaoPessoal(e.target.value)} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}><option>Todos</option><option>Pessoas</option><option>RH</option></select></label>}
          {comSeletor && (
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, color: COR.suave }}>Área
              <select value={area} onChange={e => { setArea(e.target.value); setAbertos({}) }} style={{ ...botaoSecundario, padding: '7px 10px', fontSize: 13 }}>
                <option value="Todas">Todas as áreas</option>
                {AREAS_CUSTOS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>
          )}
          <BotaoExportar onClick={exportar} desabilitado={!arv || !arv.lista.length} />
        </div>
      </div>

      {c.carregando ? <Carregando texto="Montando o DRE…" />
        : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} />
        : !arv || !arv.lista.length ? <Vazio>Sem dados pra essa área.</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 960 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `1px solid ${COR.texto}`, alignItems: 'end' }}>
                <div />
                <div style={{ textAlign: 'right' }}>{mesISOLabel(arv.m0)}</div>
                <div style={{ textAlign: 'right' }}>{mesISOLabel(arv.m1)}</div>
                <div style={{ textAlign: 'right' }}>{mesISOLabel(arv.m2)}</div>
                <div style={{ textAlign: 'right' }}>{mesISOLabel(arv.mAtual)} pago</div>
                <div style={{ textAlign: 'right' }}>{mesISOLabel(arv.mAtual)} a pagar</div>
                <div style={{ textAlign: 'right', color: COR.texto, fontWeight: 600 }}>{mesISOLabel(arv.mAtual)} total</div>
                <div style={{ textAlign: 'right' }}>{mesISOLabel(arv.mAtual).split('/')[0]} vs {mesISOLabel(arv.m2).split('/')[0].toLowerCase()}</div>
              </div>
              {arv.lista.map(b => {
                const kb = b.nome
                return (
                  <React.Fragment key={kb}>
                    {linha(b, 0, kb, b.filhos.length > 0)}
                    {aberto(kb, 0) && b.filhos.map(cat => {
                      const kc = kb + '||' + cat.nome
                      const fs = verTodos[kc] ? cat.filhos : cat.filhos.slice(0, MAX_FORN)
                      return (
                        <React.Fragment key={kc}>
                          {linha(cat, 1, kc, cat.filhos.length > 0)}
                          {aberto(kc, 1) && fs.map(f => linha(f, 2, kc + '||' + f.nome, false))}
                          {aberto(kc, 1) && cat.filhos.length > MAX_FORN && !verTodos[kc] && (
                            <button onClick={() => setVerTodos(v => ({ ...v, [kc]: true }))} style={{ ...botaoSecundario, margin: '6px 0 6px 48px', fontSize: 12 }}>
                              Ver mais {cat.filhos.length - MAX_FORN} fornecedores
                            </button>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </React.Fragment>
                )
              })}
              {(() => {
                const g = arv.geral, tot = g.pagoAtual + g.aPagar, vr = varTxt(tot, g[arv.m2])
                return (
                  <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, padding: '12px 4px 4px', fontSize: 13, fontWeight: 700, borderTop: `1.5px solid ${COR.texto}` }}>
                    <div>= Custo total</div>
                    <div style={cel}>{fmtK(g[arv.m0])}</div><div style={cel}>{fmtK(g[arv.m1])}</div><div style={cel}>{fmtK(g[arv.m2])}</div>
                    <div style={cel}>{fmtK(g.pagoAtual)}</div><div style={cel}>{fmtK(g.aPagar)}</div><div style={cel}>{fmtK(tot)}</div>
                    <div style={{ ...cel, fontSize: 12, color: vr.cor }}>{vr.t}</div>
                  </div>
                )
              })()}
            </div>
          </div>
        )}
      {arv && (
        <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.5 }}>
          {c.dados.baixas_ate ? `Pagamentos arquivados até ${fmtData(c.dados.baixas_ate)}. ` : ''}
          "A pagar" são notas já emitidas e em aberto com previsão de pagamento até o fim de {mesNome(arv.mAtual)}, incluindo as que já passaram da data (vencimento do TOTVS ou prazo médio do fornecedor). Notas que ainda não chegaram não aparecem. A variação compara o mês atual (pago + a pagar) com o mês anterior; como o mês está em andamento, ela muda até o fechamento.
        </div>
      )}
    </section>
  )
}
