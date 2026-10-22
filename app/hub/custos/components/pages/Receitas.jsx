import React, { useState } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { loadReceitasResumo, loadReceitasLista } from '../../data/loader.js'
import { fmt, fmtK, fmtData, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Busca, Carregando, Erro, Vazio, useCarga, botaoSecundario, exportarExcel, BotaoExportar } from '../ui/nf.jsx'

// v27.12 — Receitas: o que entrou na conta no mês (contas a receber), separando
// o que é receita de verdade (por área) do que é dinheiro do próprio grupo.
// A área de cada tipo vem da aba Mapeamento_Receita da planilha.

const pctTxt = (a, b) => (b ? `${a >= b ? '+' : '−'}${Math.abs((a / b - 1) * 100).toFixed(1).replace('.', ',')}%` : '—')
const Cap = s => (s ? s[0].toUpperCase() + s.slice(1) : '')
const EXPLICA_AREA = {
  'Compras': 'rebate, bonificação e verba de fornecedor (inclui verba de patrocínio)',
  'Marketing': 'parcerias com marcas (exposição nas casas)',
}
const ehExtra = a => !['Fora', 'Faturamento', 'Revisar'].includes(a)

// v27.14 — Receitas extras: só o que as áreas trazem a mais, fora do faturamento
// (vendas, eventos e ingressos ficam no Faturamento e não aparecem aqui).
export default function Receitas() {
  const { corBU } = useFinanceiro()
  const [mesSel, setMesSel] = useState('')
  const [aberto, setAberto] = useState({})
  const [detalhe, setDetalhe] = useState(null)
  const c = useCarga(() => loadReceitasResumo(mesSel), [mesSel])

  if (c.carregando && !c.dados) return <Carregando texto="Carregando receitas extras…" />
  if (c.erro) return <div style={{ padding: 20 }}><Erro texto={c.erro} onTentar={c.tentarDeNovo} /></div>
  const d = c.dados
  if (!d || !d.mes) return <div style={{ padding: 20 }}><Vazio>Nenhum recebimento arquivado ainda. Cole o relatório de contas a receber na aba Receitas da planilha e rode Menu → 💵 Arquivar Receitas.</Vazio></div>

  const rec = d.linhas.filter(l => ehExtra(l.area))
  const semArea = d.linhas.filter(l => l.area === 'Revisar' && l.valor)
  const soma = (arr, k = 'valor') => arr.reduce((t, x) => t + (x[k] || 0), 0)
  const tRec = soma(rec), tRecAnt = soma(rec, 'valor_ant')
  const areas = [...new Set(rec.map(l => l.area))].map(a => {
    const ls = rec.filter(l => l.area === a && (l.valor || l.valor_ant))
    return { area: a, valor: soma(ls), ant: soma(ls, 'valor_ant'), qtd: soma(ls, 'qtd'), linhas: ls }
  }).filter(a => a.valor || a.ant).sort((a, b) => b.valor - a.valor)
  const nomeMes = mesNome(d.mes)
  const abrir = (area, l) => {
    setDetalhe({ area, natureza: l ? l.descricao : '', titulo: l ? l.descricao : area })
    setTimeout(() => { const el = document.getElementById('rec-det'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 60)
  }
  const grid = 'minmax(200px, 2fr) 70px 120px 90px'

  return (
    <div style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1080, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: COR.suave }}>Mês
          <select value={d.mes} onChange={e => { setMesSel(e.target.value); setDetalhe(null); setAberto({}) }} style={{ ...botaoSecundario, padding: '8px 12px', fontSize: 14, fontWeight: 600, minWidth: 180 }}>
            {d.meses.map(m => <option key={m} value={m}>{mesNomeCurto(m)}</option>)}
          </select>
        </label>
        {c.carregando && <span style={{ fontSize: 12, color: COR.suave }}>atualizando…</span>}
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ fontSize: 13, color: COR.suave }}>Fora do faturamento · contas a receber, pela data do recebimento</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, lineHeight: 1.3, maxWidth: 860 }}>
          {tRec
            ? <>Em {nomeMes}, as áreas trouxeram <span style={{ ...num, color: '#4F6B14' }}>{fmtK(tRec)}</span> a mais{tRecAnt ? <> ({pctTxt(tRec, tRecAnt)} vs {mesNome(d.mes_anterior)})</> : null}.</>
            : <>Em {nomeMes}, nenhuma receita extra registrada.</>}
        </h1>
      </section>

      <section aria-labelledby="rec-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 id="rec-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Por área</h2>
        <div style={{ fontSize: 12, color: COR.suave }}>Clique na área pra ver os tipos, e no tipo pra ver os recebimentos.</div>
        {!areas.length ? <Vazio>Nenhuma receita extra nesse mês.</Vazio> : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 520 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Área</div><div style={{ textAlign: 'right' }}>Qtd</div><div style={{ textAlign: 'right' }}>{Cap(nomeMes)}</div><div style={{ textAlign: 'right' }}>vs {mesNome(d.mes_anterior).substring(0, 3)}</div>
              </div>
              {areas.map(a => (
                <React.Fragment key={a.area}>
                  <button onClick={() => setAberto(x => ({ ...x, [a.area]: !x[a.area] }))} aria-expanded={!!aberto[a.area]}
                    style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', width: '100%', border: 'none', borderBottom: '0.5px solid #F0F0EC', background: '#fff', padding: '10px 4px', fontFamily: 'inherit', fontSize: 13, color: COR.texto, textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                        <span aria-hidden="true" style={{ width: 14, color: COR.fraco }}>{aberto[a.area] ? '▾' : '▸'}</span>
                        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: corBU(a.area) }} />{a.area}
                      </span>
                      <span style={{ fontSize: 11, color: COR.suave, paddingLeft: 22 }}>{EXPLICA_AREA[a.area] || ''}</span>
                    </div>
                    <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{a.qtd.toLocaleString('pt-BR')}</span>
                    <span style={{ ...num, textAlign: 'right', fontWeight: 600 }}>{fmtK(a.valor)}</span>
                    <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{pctTxt(a.valor, a.ant)}</span>
                  </button>
                  {aberto[a.area] && a.linhas.map(l => (
                    <button key={a.area + l.descricao} onClick={() => abrir(a.area, l)}
                      style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', width: '100%', border: 'none', borderBottom: '0.5px solid #F0F0EC', background: COR.fundo, padding: '7px 4px 7px 30px', fontFamily: 'inherit', fontSize: 12, color: COR.texto, textAlign: 'left', cursor: 'pointer' }}>
                      <span style={{ textDecoration: 'underline', textDecorationColor: '#D9D9D2', textUnderlineOffset: 3 }}>{l.descricao}</span>
                      <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{l.qtd}</span>
                      <span style={{ ...num, textAlign: 'right' }}>{fmtK(l.valor)}</span>
                      <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{pctTxt(l.valor, l.valor_ant)}</span>
                    </button>
                  ))}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}
      </section>

      {semArea.length > 0 && (
        <section style={{ background: COR.alertaFundo, border: `0.5px solid ${COR.alertaBorda}`, borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: COR.alerta }}>Entradas sem classificação: {fmtK(soma(semArea))}</div>
          <div style={{ fontSize: 12, color: '#7A3A12', lineHeight: 1.5 }}>Tipos que apareceram no contas a receber e ainda não foram classificados. Na aba Mapeamento_Receita, defina se é receita extra (Compras, Marketing…), Faturamento ou Fora.</div>
          {semArea.map(l => (
            <button key={l.descricao} onClick={() => abrir('Revisar', l)} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, border: 'none', background: 'transparent', padding: '4px 0', fontFamily: 'inherit', fontSize: 12, color: COR.texto, cursor: 'pointer', textAlign: 'left' }}>
              <span style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>{l.descricao}</span><span style={num}>{fmtK(l.valor)}</span>
            </button>
          ))}
        </section>
      )}

      {detalhe && <ListaDetalhe key={detalhe.area + detalhe.natureza + d.mes} detalhe={detalhe} mes={d.mes} onFechar={() => setDetalhe(null)} />}

      <div style={{ fontSize: 12, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: '12px 14px', lineHeight: 1.6 }}>
        <b style={{ color: COR.texto }}>O que entra aqui:</b> só o que as áreas trazem <b>a mais</b>, fora do faturamento: rebate, bonificação e verba de fornecedor, inclusive verba de patrocínio (Compras), e parcerias com marcas (Marketing). Vendas das casas, eventos corporativos e ingressos já estão no faturamento e ficam de fora, assim como resgates, transferências e movimentos entre empresas do grupo. Cada tipo do TOTVS tem sua classificação na aba <b>Mapeamento_Receita</b>; tipo novo com "rebate", "bonificação" ou "verba" no nome já entra sozinho em Compras, e com "parceria" em Marketing.
      </div>
    </div>
  )
}

function ListaDetalhe({ detalhe, mes, onFechar }) {
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(100)
  const c = useCarga(() => loadReceitasLista({ bu: detalhe.area, mes, natureza: detalhe.natureza }), [detalhe.area, detalhe.natureza, mes])
  const b = busca.trim().toUpperCase()
  const linhas = (c.dados || []).filter(l => !b || [l.cliente, l.historico, l.loja].some(v => String(v || '').toUpperCase().includes(b)))
  const total = linhas.reduce((t, l) => t + l.valor, 0)
  const exportar = () => exportarExcel(`Receitas - ${detalhe.titulo} - ${mesNomeCurto(mes).replace('/', '-')}`, [
    { titulo: 'Área', valor: l => l.area === 'Revisar' ? 'Sem área' : l.area, largura: 14 },
    { titulo: 'Tipo', valor: l => l.descricao, largura: 30 },
    { titulo: 'Cliente', valor: l => l.cliente, largura: 40 },
    { titulo: 'Histórico', valor: l => l.historico, largura: 36 },
    { titulo: 'Casa', valor: l => l.loja, largura: 14 },
    { titulo: 'Valor recebido', valor: l => l.valor, tipo: 'num', largura: 14 },
    { titulo: 'Data do recebimento', valor: l => l.dt_baixa, tipo: 'data', largura: 18 },
  ], linhas, 'Receitas')
  const grid = 'minmax(200px, 2fr) minmax(160px, 1.4fr) 100px 120px 100px'
  return (
    <section id="rec-det" aria-labelledby="rec-det-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 12, scrollMarginTop: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <h2 id="rec-det-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{detalhe.titulo} · {mesNomeCurto(mes)}</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} placeholder="Buscar cliente, histórico ou casa" />
          <BotaoExportar onClick={exportar} desabilitado={!linhas.length} />
          <button onClick={onFechar} style={botaoSecundario}>Fechar</button>
        </div>
      </div>
      {c.carregando ? <Carregando texto="Buscando recebimentos…" />
        : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} />
        : !linhas.length ? <Vazio>Nenhum recebimento.</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 720 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Cliente</div><div>Histórico</div><div>Casa</div><div style={{ textAlign: 'right' }}>Valor</div><div>Recebido em</div>
              </div>
              {linhas.slice(0, limite).map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '9px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.cliente}>{l.cliente || '—'}</div>
                    <div style={{ fontSize: 11, color: COR.suave }}>{l.descricao}</div>
                  </div>
                  <div style={{ fontSize: 12, color: COR.suave, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.historico}>{l.historico}</div>
                  <div>{l.loja}</div>
                  <div style={{ ...num, textAlign: 'right' }}>{fmt(l.valor)}</div>
                  <div style={num}>{fmtData(l.dt_baixa)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '12px 4px 0', fontSize: 13 }}>
                <span style={{ color: COR.suave }}>{linhas.length.toLocaleString('pt-BR')} recebimentos · {fmt(total)}</span>
                {linhas.length > limite && <button onClick={() => setLimite(x => x + 200)} style={botaoSecundario}>Mostrar mais {Math.min(200, linhas.length - limite)}</button>}
              </div>
            </div>
          </div>
        )}
    </section>
  )
}
