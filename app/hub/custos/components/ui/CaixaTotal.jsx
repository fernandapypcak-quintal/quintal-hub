import React, { useMemo, useState } from 'react'
import { loadPagamentosFora } from '../../data/loader.js'
import { fmt, fmtK, fmtData, mesNome, mesNomeCurto } from '../../utils.js'
import { COR, num, Busca, Carregando, Erro, Vazio, useCarga, botaoSecundario, exportarExcel, BotaoExportar } from './nf.jsx'

// v27.5 — "Tudo que saiu do caixa": custo das áreas + o que fica fora do custo
// (impostos, royalties, aplicações, rateio holding, transferências...).
// O total bate com o filtro "Tudo" das páginas por casa.

const GASTO = ['Impostos', 'Royalties', 'Investimentos (obras e equipamentos)', 'Tarifas bancárias', 'Outros']
const MOVIMENTACAO = ['Aplicações financeiras', 'Rateio holding e dividendos', 'Transferências entre contas', 'Empréstimos e mútuo']
const EXPLICA = {
  'Impostos': 'COFINS, ICMS, PIS, IRRF, parcelamentos',
  'Royalties': 'royalties pagos aos sócios',
  'Investimentos (obras e equipamentos)': 'CAPEX',
  'Tarifas bancárias': 'tarifas e IOF',
  'Outros': 'lançamentos sem área de custo: vale conferir',
  'Aplicações financeiras': 'dinheiro aplicado, continua do grupo',
  'Rateio holding e dividendos': 'entre empresas do grupo e sócios',
  'Transferências entre contas': 'saiu de uma conta e entrou em outra',
  'Empréstimos e mútuo': 'pagamento de empréstimos e mútuos',
}
const varPct = (a, b) => (b ? (a / b - 1) * 100 : null)
const pctSinal = p => (p === null ? '—' : `${p > 0 ? '+' : p < 0 ? '−' : ''}${Math.abs(p).toFixed(1).replace('.', ',')}%`)

export default function CaixaTotal({ caixaFora, custo, custoAnt, mes, ant }) {
  const [grupoSel, setGrupoSel] = useState('')
  const d = useMemo(() => {
    const val = (g, m) => caixaFora.filter(x => x.grupo === g && x.mes === m).reduce((t, x) => t + x.valor, 0)
    const linha = g => ({ g, v: val(g, mes), a: val(g, ant) })
    const gasto = [{ g: 'Custo das áreas (fixo + variável)', v: custo, a: custoAnt, custo: true }, ...GASTO.map(linha)].filter(l => l.v || l.a)
    const mov = MOVIMENTACAO.map(linha).filter(l => l.v || l.a)
    const sub = arr => arr.reduce((t, l) => t + l.v, 0)
    return { gasto, mov, tGasto: sub(gasto), tMov: sub(mov) }
  }, [caixaFora, custo, custoAnt, mes, ant])
  const total = d.tGasto + d.tMov
  if (!total) return null
  const pct = v => `${Math.round(v / total * 100)}%`

  const bloco = (titulo, sub, linhas, subtotal, cor) => (
    <div style={{ flex: '1 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, paddingBottom: 6, borderBottom: `1.5px solid ${cor}` }}>
        <div><div style={{ fontSize: 14, fontWeight: 600 }}>{titulo}</div><div style={{ fontSize: 11, color: COR.suave }}>{sub}</div></div>
        <div style={{ ...num, fontSize: 16, fontWeight: 600 }}>{fmtK(subtotal)}</div>
      </div>
      {linhas.map(l => {
        const p = varPct(l.v, l.a)
        const ativo = grupoSel === l.g
        const Tag = l.custo ? 'div' : 'button'
        return (
          <Tag key={l.g} onClick={l.custo ? undefined : () => setGrupoSel(ativo ? '' : l.g)} aria-pressed={l.custo ? undefined : ativo}
            style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto 72px', gap: 10, alignItems: 'center', padding: '8px 6px', border: 'none', borderBottom: '0.5px solid #F0F0EC', background: ativo ? COR.verdeClaro : 'transparent', textAlign: 'left', fontFamily: 'inherit', cursor: l.custo ? 'default' : 'pointer', width: '100%', borderRadius: 6 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, color: COR.texto, fontWeight: l.custo ? 600 : 400, textDecoration: l.custo ? 'none' : 'underline', textDecorationColor: '#D9D9D2', textUnderlineOffset: 3 }}>{l.g}</div>
              {(EXPLICA[l.g] || l.custo) && <div style={{ fontSize: 11, color: COR.suave }}>{l.custo ? 'detalhe na tabela de áreas abaixo' : EXPLICA[l.g]}</div>}
            </div>
            <div style={{ ...num, fontSize: 13, textAlign: 'right' }}>{fmtK(l.v)}</div>
            <div style={{ ...num, fontSize: 11, textAlign: 'right', color: COR.suave }}>{pctSinal(p)}</div>
          </Tag>
        )
      })}
    </div>
  )

  return (
    <section aria-labelledby="caixa-tit" style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, display: 'flex', flexDirection: 'column', gap: 14, breakInside: 'avoid' }}>
      <div>
        <h2 id="caixa-tit" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Tudo que saiu do caixa em {mesNome(mes)}: <span style={num}>{fmtK(total)}</span></h2>
        <div style={{ fontSize: 12, color: COR.suave, marginTop: 3, lineHeight: 1.5 }}>Custo das áreas mais tudo que não entra nele. É o mesmo total do filtro "Tudo" nas páginas por casa. Clique numa linha pra ver os lançamentos. Variação contra {mesNome(ant)}.</div>
      </div>
      <div aria-hidden="true" style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#EEEDE6', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <div style={{ width: pct(d.gasto[0] && d.gasto[0].custo ? d.gasto[0].v : 0), background: '#4F6B14' }} />
        <div style={{ width: pct(d.tGasto - (d.gasto[0] && d.gasto[0].custo ? d.gasto[0].v : 0)), background: '#2B4C7E' }} />
        <div style={{ width: pct(d.tMov), background: '#B8BCAF' }} />
      </div>
      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: COR.suave, flexWrap: 'wrap' }}>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#4F6B14', marginRight: 5 }} />Custo das áreas</span>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#2B4C7E', marginRight: 5 }} />Outros gastos (impostos, royalties, investimentos)</span>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: '#B8BCAF', marginRight: 5 }} />Movimentação de dinheiro (não é gasto)</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {bloco('Gasto', 'o que efetivamente custou pro grupo', d.gasto, d.tGasto, '#4F6B14')}
        {bloco('Movimentação de dinheiro', 'saiu da conta, mas não é gasto', d.mov, d.tMov, '#B8BCAF')}
      </div>
      {grupoSel && <ListaFora key={grupoSel + mes} grupo={grupoSel} mes={mes} />}
    </section>
  )
}

function ListaFora({ grupo, mes }) {
  const [busca, setBusca] = useState('')
  const [limite, setLimite] = useState(100)
  const c = useCarga(() => loadPagamentosFora({ mes, grupo }), [mes, grupo])
  const b = busca.trim().toUpperCase()
  const linhas = (c.dados || []).filter(l => !b || [l.fornecedor, l.descricao, l.categoria].some(v => String(v || '').toUpperCase().includes(b)))
  const total = linhas.reduce((t, l) => t + l.valor, 0)
  const exportar = () => exportarExcel(`${grupo} - ${mesNomeCurto(mes).replace('/', '-')}`, [
    { titulo: 'Grupo', valor: l => l.grupo, largura: 26 },
    { titulo: 'Fornecedor', valor: l => l.fornecedor, largura: 40 },
    { titulo: 'Conta', valor: l => l.descricao, largura: 32 },
    { titulo: 'Categoria', valor: l => l.categoria, largura: 18 },
    { titulo: 'Casa', valor: l => l.loja, largura: 14 },
    { titulo: 'Valor pago', valor: l => l.valor, tipo: 'num', largura: 14 },
    { titulo: 'Data do pagamento', valor: l => l.dt_baixa, tipo: 'data', largura: 16 },
    { titulo: 'Vencimento', valor: l => l.vencto, tipo: 'data', largura: 14 },
  ], linhas, grupo)
  const grid = 'minmax(200px, 2fr) minmax(140px, 1.2fr) 100px 120px 96px'
  return (
    <div className="no-print" style={{ borderTop: `0.5px solid ${COR.borda}`, paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ fontSize: 14, fontWeight: 600 }}>{grupo} · {mesNomeCurto(mes)}</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} placeholder="Buscar fornecedor ou conta" />
          <BotaoExportar onClick={exportar} desabilitado={!linhas.length} />
        </div>
      </div>
      {c.carregando ? <Carregando texto="Buscando lançamentos…" />
        : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} />
        : !linhas.length ? <Vazio>Nenhum lançamento.</Vazio>
        : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 700 }}>
              <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, fontSize: 12, color: COR.suave, padding: '6px 4px', borderBottom: `0.5px solid ${COR.borda}` }}>
                <div>Fornecedor</div><div>Conta</div><div>Casa</div><div style={{ textAlign: 'right' }}>Valor</div><div>Pago em</div>
              </div>
              {linhas.slice(0, limite).map((l, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: grid, gap: 10, alignItems: 'center', padding: '9px 4px', borderBottom: '0.5px solid #F0F0EC', fontSize: 13 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div>
                  <div style={{ fontSize: 12, color: COR.suave, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.descricao}>{l.descricao}</div>
                  <div>{l.loja}</div>
                  <div style={{ ...num, textAlign: 'right' }}>{fmt(l.valor)}</div>
                  <div style={num}>{fmtData(l.dt_baixa)}</div>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', padding: '10px 4px 0', fontSize: 13 }}>
                <span style={{ color: COR.suave }}>{linhas.length.toLocaleString('pt-BR')} lançamentos · {fmt(total)}</span>
                {linhas.length > limite && <button onClick={() => setLimite(l => l + 200)} style={botaoSecundario}>Mostrar mais {Math.min(200, linhas.length - limite)}</button>}
              </div>
            </div>
          </div>
        )}
    </div>
  )
}
