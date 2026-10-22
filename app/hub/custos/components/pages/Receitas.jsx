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
  'Operações': 'vendas das casas: cartão, ZigPay, PIX, iFood, vales, dinheiro',
  'Marketing': 'eventos corporativos vendidos pelo comercial',
  'Eventos': 'venda de ingressos',
  'Compras': 'verba e rebate de fornecedor',
  'Revisar': 'tipos que ainda não têm área na aba Mapeamento_Receita',
}

export default function Receitas() {
  const { corBU } = useFinanceiro()
  const [mesSel, setMesSel] = useState('')
  const [aberto, setAberto] = useState({})
  const [detalhe, setDetalhe] = useState(null)   // { area, natureza, descricao }
  const c = useCarga(() => loadReceitasResumo(mesSel), [mesSel])

  if (c.carregando && !c.dados) return <Carregando texto="Carregando receitas…" />
  if (c.erro) return <div style={{ padding: 20 }}><Erro texto={c.erro} onTentar={c.tentarDeNovo} /></div>
  const d = c.dados
  if (!d || !d.mes) return <div style={{ padding: 20 }}><Vazio>Nenhuma receita arquivada ainda. Cole o relatório de contas a receber na aba Receitas da planilha e rode Menu → 💵 Arquivar Receitas.</Vazio></div>

  const rec = d.linhas.filter(l => l.area !== 'Fora')
  const fora = d.linhas.filter(l => l.area === 'Fora')
  const soma = (arr, k = 'valor') => arr.reduce((t, x) => t + (x[k] || 0), 0)
  const tRec = soma(rec), tFora = soma(fora), tRecAnt = soma(rec, 'valor_ant')
  const total = tRec + tFora
  const areas = [...new Set(rec.map(l => l.area))].map(a => {
    const ls = rec.filter(l => l.area === a)
    return { area: a, valor: soma(ls), ant: soma(ls, 'valor_ant'), qtd: soma(ls, 'qtd'), linhas: ls }
  }).sort((a, b) => (a.area === 'Revisar') - (b.area === 'Revisar') || b.valor - a.valor)
  const nomeMes = mesNome(d.mes)
  const abrir = (area, l) => {
    setDetalhe({ area, natureza: l ? l.descricao : '', titulo: l ? `${l.descricao}` : area })
    setTimeout(() => { const el = document.getElementById('rec-det'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, 60)
  }

  const linhaTipo = (area, l) => (
    <button key={area + l.descricao} onClick={() => abrir(area, l)}
      style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 70px 120px 90px', gap: 10, alignItems: 'center', width: '100%', border: 'none', borderBottom: '0.5px solid #F0F0EC', background: COR.fundo, padding: '7px 4px 7px 30px', fontFamily: 'inherit', fontSize: 12, color: COR.texto, textAlign: 'left', cursor: 'pointer' }}>
      <span style={{ textDecoration: 'underline', textDecorationColor: '#D9D9D2', textUnderlineOffset: 3 }}>{l.descricao}</span>
      <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{l.qtd}</span>
      <span style={{ ...num, textAlign: 'right' }}>{fmtK(l.valor)}</span>
      <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{pctTxt(l.valor, l.valor_ant)}</span>
    </button>
  )

  return (
    <div style={{ padding: '20px 20px 48px', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 1180, width: '100%', boxSizing: 'border-box', margin: '0 auto' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: COR.suave }}>Mês
          <select value={d.mes} onChange={e => { setMesSel(e.target.value); setDetalhe(null); setAberto({}) }} style={{ ...botaoSecundario, padding: '8px 12px', fontSize: 14, fontWeight: 600, minWidth: 180 }}>
            {d.meses.map(m => <option key={m} value={m}>{mesNomeCurto(m)}</option>)}
          </select>
        </label>
        {c.carregando && <span style={{ fontSize: 12, color: COR.suave }}>atualizando…</span>}
      </div>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 13, color: COR.suave }}>Contas a receber, pela data do recebimento</div>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, lineHeight: 1.3, maxWidth: 860 }}>
          Em {nomeMes} entraram <span style={num}>{fmtK(total)}</span> na conta: <span style={{ ...num, color: '#4F6B14' }}>{fmtK(tRec)}</span> de receita e <span style={{ ...num, color: COR.suave }}>{fmtK(tFora)}</span> de dinheiro do próprio grupo.
        </h1>
        <div aria-hidden="true" style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', background: '#EEEDE6', marginTop: 6 }}>
          <div style={{ width: `${total ? tRec / total * 100 : 0}%`, background: '#4F6B14' }} />
          <div style={{ width: `${total ? tFora / total * 100 : 0}%`, background: '#C9CCBF' }} />
        </div>
        <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COR.suave, flexWrap: 'wrap' }}>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#4F6B14', marginRight: 5 }} />Receita ({total ? Math.round(tRec / total * 100) : 0}%)</span>
          <span><span style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#C9CCBF', marginRight: 5 }} />Não é receita ({total ? Math.round(tFora / total * 100) : 0}%)</span>
        </div>
      </section>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <section aria-labelledby="rec-tit" style={{ flex: '999 1 560px', minWidth: 0, background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <h2 id="rec-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>É receita: <span style={num}>{fmtK(tRec)}</span></h2>
            <span style={{ fontSize: 12, color: COR.suave }}>{tRecAnt ? `${pctTxt(tRec, tRecAnt)} vs ${mesNome(d.mes_anterior)}` : ''}</span>
          </div>
          <div style={{ fontSize: 12, color: COR.suave }}>Clique na área pra ver os tipos de receita, e no tipo pra ver os recebimentos.</div>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 520 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 70px 120px 90px', gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Área</div><div style={{ textAlign: 'right' }}>Qtd</div><div style={{ textAlign: 'right' }}>{Cap(nomeMes)}</div><div style={{ textAlign: 'right' }}>vs {mesNome(d.mes_anterior).substring(0, 3)}</div>
              </div>
              {areas.map(a => (
                <React.Fragment key={a.area}>
                  <button onClick={() => setAberto(x => ({ ...x, [a.area]: !x[a.area] }))} aria-expanded={!!aberto[a.area]}
                    style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 2fr) 70px 120px 90px', gap: 10, alignItems: 'center', width: '100%', border: 'none', borderBottom: '0.5px solid #F0F0EC', background: a.area === 'Revisar' ? COR.alertaFundo : '#fff', padding: '10px 4px', fontFamily: 'inherit', fontSize: 13, color: COR.texto, textAlign: 'left', cursor: 'pointer' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
                        <span aria-hidden="true" style={{ width: 14, color: COR.fraco }}>{aberto[a.area] ? '▾' : '▸'}</span>
                        <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: 2, background: a.area === 'Revisar' ? '#C2561A' : corBU(a.area) }} />
                        {a.area === 'Revisar' ? 'Sem área definida' : a.area}
                      </span>
                      <span style={{ fontSize: 11, color: COR.suave, paddingLeft: 22 }}>{EXPLICA_AREA[a.area] || ''}</span>
                    </div>
                    <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{a.qtd.toLocaleString('pt-BR')}</span>
                    <span style={{ ...num, textAlign: 'right', fontWeight: 600 }}>{fmtK(a.valor)}</span>
                    <span style={{ ...num, textAlign: 'right', color: COR.suave }}>{pctTxt(a.valor, a.ant)}</span>
                  </button>
                  {aberto[a.area] && a.linhas.map(l => linhaTipo(a.area, l))}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="fora-tit" style={{ flex: '1 1 340px', minWidth: 0, background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="fora-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Não é receita: <span style={{ ...num, color: COR.suave }}>{fmtK(tFora)}</span></h2>
          <div style={{ fontSize: 12, color: COR.suave, lineHeight: 1.5 }}>Dinheiro que entrou na conta mas não veio de cliente: resgate de aplicação, transferência entre contas, rateio da holding, repasses e royalties entre empresas do grupo, dividendos, mútuo.</div>
          {fora.map(l => (
            <button key={l.descricao} onClick={() => abrir('Fora', l)}
              style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: 10, alignItems: 'center', border: 'none', borderBottom: '0.5px solid #F0F0EC', background: 'transparent', padding: '7px 2px', fontFamily: 'inherit', fontSize: 12, color: COR.texto, textAlign: 'left', cursor: 'pointer' }}>
              <span style={{ textDecoration: 'underline', textDecorationColor: '#D9D9D2', textUnderlineOffset: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.descricao}>{l.descricao}</span>
              <span style={{ ...num }}>{fmtK(l.valor)}</span>
            </button>
          ))}
        </section>
      </div>

      {d.por_unidade.some(u => u.area === 'Operações') && (
        <section aria-labelledby="casas-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 id="casas-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Vendas por casa</h2>
          <div style={{ fontSize: 12, color: COR.suave }}>Receita de Operações (vendas) em {nomeMes}, por casa. Cartão de crédito cai na conta dias depois da venda, então pode não bater com o faturamento da ZIG do mês.</div>
          {(() => {
            const us = d.por_unidade.filter(u => u.area === 'Operações'); const mx = Math.max(1, ...us.map(u => u.valor))
            return us.map(u => (
              <div key={u.unidade} style={{ display: 'grid', gridTemplateColumns: '120px minmax(120px, 1fr) 110px', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span>{u.unidade}</span>
                <div style={{ height: 10, background: '#EEEDE6', borderRadius: 5, overflow: 'hidden' }}><div style={{ height: '100%', width: `${u.valor / mx * 100}%`, background: corBU('Operações') }} /></div>
                <span style={{ ...num, textAlign: 'right' }}>{fmtK(u.valor)}</span>
              </div>
            ))
          })()}
        </section>
      )}

      {detalhe && <ListaDetalhe key={detalhe.area + detalhe.natureza + d.mes} detalhe={detalhe} mes={d.mes} onFechar={() => setDetalhe(null)} />}

      <div style={{ fontSize: 12, color: COR.suave, background: COR.fundo, borderRadius: 8, padding: '12px 14px', lineHeight: 1.6 }}>
        <b style={{ color: COR.texto }}>O que conta como receita:</b> vendas das casas (cartão, ZigPay, PIX, iFood, vales, dinheiro) → Operações · eventos corporativos → Marketing · ingressos → Eventos · verba e rebate de fornecedor → Compras. Todo o resto é dinheiro do próprio grupo e fica fora. Cada tipo (natureza do TOTVS) tem sua área na aba <b>Mapeamento_Receita</b> da planilha: pra mudar, é só trocar a área lá e arquivar de novo.
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
