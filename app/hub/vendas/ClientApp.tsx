'use client'

// app/hub/vendas/ClientApp.tsx
// Vendas por Produto (ZIG) — lê o resumo pré-agregado do Apps Script via
// /api/vendas. O período inteiro é agregado no servidor; aqui só filtra,
// ordena e desenha. Detalhe linha a linha é sempre de UM dia (CSV cru).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

// ─── Tipos ────────────────────────────────────────────────────────────
type Meta = {
  primeiroDia: string | null
  ultimoDia: string | null
  atualizadoEm: string | null
  lojas: string[]
  canais: string[]
  maxDias: number
}
type Produto = {
  id: string; sku: string; produto: string; categoria: string; tipo: string
  qtd: number; bruto: number; desconto: number; liquido: number; transacoes: number
  estornoQtd: number; estornoValor: number
  loja?: string; canal?: string
}
type Resumo = {
  periodo: { inicio: string; fim: string; dias: number; diasComDados: number; diasSemDados: string[]; diasSemTransacao: string[] }
  filtros: { porItem: boolean; adicoes: boolean }
  kpis: {
    faturamento: number; bruto: number; desconto: number; itens: number; transacoes: number
    transacoesPorItem: boolean; ticketMedio: number | null; mediaDiaria: number; produtosDistintos: number
    estornoQtd: number; estornoValor: number
  }
  porDia: { dia: string; temDados: boolean; liquido: number; qtd: number; transacoes: number }[]
  porLoja: { loja: string; canal: string; liquido: number; qtd: number; transacoes: number; ticketMedio: number | null }[]
  porCategoria: { categoria: string; liquido: number; qtd: number }[]
  categoriasDisponiveis: string[]
  catalogo?: CatItem[]
  produtos: Produto[]
}
type CustosResp = {
  custos: Record<string, { custo: number; nome: string; fichas: number }>
  totalFichas: number
  duplicados: { sku: string; fichas: { nome: string; custo: number }[] }[]
  atualizadaEm?: string | null
}
// undefined = não se aplica (adição, gorjeta) ou custos ainda carregando | null = sem ficha
type CustoDe = (p: Produto) => number | null | undefined
type CatItem = { id: string; sku: string; produto: string; categoria: string; tipo: string; liquido: number }
type DetalheProdutoResp = {
  id: string; produto: string; total: { qtd: number; liquido: number }
  porLoja: { loja: string; canal: string; qtd: number; bruto: number; desconto: number; liquido: number }[]
  adicoes: { id: string; sku: string; produto: string; qtd: number; lojas: { loja: string; qtd: number }[] }[]
}
type Detalhe = {
  dia: string; colunas: string[]; linhas: (string | number)[][]; total: number; truncado: boolean
  totais: { qtd: number; liquido: number }
}

// ─── Formatação ─────────────────────────────────────────────────────────
const brlFmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const brl0Fmt = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const numFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 })
const pctFmt = new Intl.NumberFormat('pt-BR', { style: 'percent', maximumFractionDigits: 1 })
const brl = (v: number) => brlFmt.format(v || 0)
const brl0 = (v: number) => brl0Fmt.format(v || 0)
const num = (v: number) => numFmt.format(v || 0)
const pct = (v: number) => pctFmt.format(v || 0)
const brlCompact = (v: number) => {
  const a = Math.abs(v || 0)
  if (a >= 1e6) return `R$ ${(v / 1e6).toFixed(1).replace('.', ',')}M`
  if (a >= 1e3) return `R$ ${(v / 1e3).toFixed(1).replace('.', ',')}k`
  return brl0(v)
}
const dataCurta = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`
const dataLonga = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`
const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']
const diaSemana = (iso: string) => DIAS_SEMANA[new Date(iso + 'T12:00:00').getDay()]

const normalizar = (s: string) => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
const chaveProduto = (p: { id: string; tipo: string }) => p.id + '|' + p.tipo
const semZeros = (s: string) => s.replace(/^0+(?=\d)/, '')
const ehGorjeta = (p: { categoria: string; produto: string }) =>
  normalizar(p.categoria) === 'tip' || normalizar(p.produto).includes('gorjeta')

function addDias(iso: string, n: number) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}
function diasEntre(a: string, b: string) {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 86400000) + 1
}

// ─── Estilo ─────────────────────────────────────────────────────────────
const C = {
  borda: '#EBEBEB', bordaForte: '#1a1a1a', texto: '#1a1a1a', suave: '#888', muito: '#BBB',
  verde: '#97A624', verdeFundo: '#F4F6E6', vermelho: '#8C1414', vermelhoFundo: '#FBEFEF', fundo: '#FAFAF8',
}
const MONO: React.CSSProperties = { fontFamily: "'DM Mono', monospace" }
const card: React.CSSProperties = { background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 10 }
const pill = (ativo: boolean): React.CSSProperties => ({
  height: 32, padding: '0 12px', borderRadius: 99, fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
  border: `1px solid ${ativo ? C.bordaForte : '#E8E8E8'}`, background: '#fff',
  color: ativo ? C.texto : '#666', fontWeight: ativo ? 600 : 400, outline: 'none', whiteSpace: 'nowrap',
})
const th: React.CSSProperties = {
  textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: C.suave, padding: '10px 12px',
  borderBottom: `1px solid ${C.borda}`, background: '#fff', position: 'sticky', top: 0, whiteSpace: 'nowrap',
}
const td: React.CSSProperties = { fontSize: 13, padding: '9px 12px', borderBottom: '1px solid #F3F3F3', verticalAlign: 'top' }
const tdNum: React.CSSProperties = { ...td, ...MONO, textAlign: 'right', whiteSpace: 'nowrap' }

// ─── Hook de fetch ────────────────────────────────────────────────────────
async function getJSON<T>(params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`/api/vendas?${params.toString()}`, { signal, cache: 'no-store' })
  const data = await res.json().catch(() => null)
  if (!res.ok || !data || data.ok === false) throw new Error(data?.erro || `Erro ${res.status}`)
  return data as T
}

// ─── Componentes pequenos ───────────────────────────────────────────────────
function Spinner({ texto = 'Carregando vendas...' }: { texto?: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 60 }}>
      <div style={{ width: 28, height: 28, border: '2px solid #E8E8E8', borderTopColor: C.texto, borderRadius: '50%', animation: 'vspin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: '#999' }}>{texto}</div>
      <style>{`@keyframes vspin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Aviso({ tipo = 'erro', children }: { tipo?: 'erro' | 'info'; children: React.ReactNode }) {
  const erro = tipo === 'erro'
  return (
    <div style={{
      fontSize: 13, padding: '10px 14px', borderRadius: 8,
      background: erro ? C.vermelhoFundo : '#F5F5F2', color: erro ? C.vermelho : '#555',
    }}>{children}</div>
  )
}

function Kpi({ label, valor, sub, cor }: { label: string; valor: string; sub?: string; cor?: string }) {
  return (
    <div style={{ ...card, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
      <span style={{ fontSize: 12, color: C.suave }}>{label}</span>
      <span style={{ ...MONO, fontSize: 'clamp(16px, 1.45vw, 22px)', fontWeight: 500, color: cor || C.texto, whiteSpace: 'nowrap', letterSpacing: '-0.02em' }}>{valor}</span>
      {sub && <span style={{ fontSize: 11.5, color: C.muito }}>{sub}</span>}
    </div>
  )
}

function MultiSelect({ label, labelTodos, opcoes, valor, onChange }: {
  label: string; labelTodos: string; opcoes: string[]; valor: string[]; onChange: (v: string[]) => void
}) {
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [aberto])

  const texto = valor.length === 0 ? labelTodos : valor.length === 1 ? valor[0] : `${valor.length} ${label}`
  const alternar = (o: string) => onChange(valor.includes(o) ? valor.filter(v => v !== o) : [...valor, o])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button type="button" onClick={() => setAberto(a => !a)} style={{ ...pill(valor.length > 0), maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {texto} <span style={{ color: C.muito, marginLeft: 4 }}>▾</span>
      </button>
      {aberto && (
        <div style={{ ...card, position: 'absolute', top: 38, left: 0, zIndex: 40, minWidth: 230, maxHeight: 340, overflowY: 'auto', padding: 6, boxShadow: '0 8px 24px rgb(0 0 0 / 0.08)' }}>
          <button type="button" onClick={() => onChange([])}
            style={{ width: '100%', textAlign: 'left', border: 'none', background: 'none', padding: '8px 10px', fontSize: 12.5, color: valor.length ? '#666' : C.texto, fontWeight: valor.length ? 400 : 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {labelTodos}
          </button>
          {opcoes.map(o => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', fontSize: 12.5, cursor: 'pointer', borderRadius: 6 }}>
              <input type="checkbox" checked={valor.includes(o)} onChange={() => alternar(o)} style={{ accentColor: C.texto }} />
              {o}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function Chip({ children, onRemover }: { children: React.ReactNode; onRemover: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, padding: '4px 6px 4px 10px', borderRadius: 99, background: '#F0F0EC', color: '#333' }}>
      {children}
      <button type="button" onClick={onRemover} aria-label="Remover filtro"
        style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#888', fontSize: 14, lineHeight: 1, padding: '0 2px' }}>×</button>
    </span>
  )
}

function Painel({ titulo, direita, children, style }: { titulo: string; direita?: React.ReactNode; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{ ...card, display: 'flex', flexDirection: 'column', minWidth: 0, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px 10px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 600, margin: 0, color: C.texto }}>{titulo}</h2>
        {direita}
      </div>
      {children}
    </section>
  )
}

async function exportarExcel(nome: string, linhas: Record<string, any>[]) {
  if (!linhas.length) return
  const XLSX = await import('xlsx')
  const ws = XLSX.utils.json_to_sheet(linhas)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Vendas')
  XLSX.writeFile(wb, `${nome}.xlsx`)
}

// ─── Seletor de produtos (multi) ───────────────────────────────────────────────
function SeletorProdutos({ catalogo, selecionados, onAlternar, onAplicarBusca }: {
  catalogo: CatItem[]; selecionados: string[]; onAlternar: (c: CatItem) => void; onAplicarBusca: (texto: string) => void
}) {
  const [texto, setTexto] = useState('')
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!aberto) return
    const fechar = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false) }
    document.addEventListener('mousedown', fechar)
    return () => document.removeEventListener('mousedown', fechar)
  }, [aberto])

  const alvo = normalizar(texto)
  const encontrados = useMemo(() => {
    const lista = alvo ? catalogo.filter(c => normalizar(`${c.produto} ${c.sku}`).includes(alvo)) : catalogo
    return lista
  }, [catalogo, alvo])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input type="search" value={texto} placeholder="Buscar e selecionar produtos"
        onChange={e => { setTexto(e.target.value); setAberto(true) }}
        onFocus={() => setAberto(true)}
        onKeyDown={e => {
          if (e.key === 'Escape') setAberto(false)
          if (e.key === 'Enter' && texto.trim()) { onAplicarBusca(texto.trim()); setTexto(''); setAberto(false) }
        }}
        style={{ ...pill(selecionados.length > 0), cursor: 'text', width: 240, padding: '0 14px' }} aria-label="Buscar e selecionar produtos" />
      {aberto && (
        <div style={{ ...card, position: 'absolute', top: 38, left: 0, zIndex: 40, width: 380, maxHeight: 400, overflowY: 'auto', padding: 6, boxShadow: '0 8px 24px rgb(0 0 0 / 0.08)' }}>
          {texto.trim() && encontrados.length > 0 && (
            <button type="button" onClick={() => { onAplicarBusca(texto.trim()); setTexto(''); setAberto(false) }}
              style={{ width: '100%', textAlign: 'left', border: 'none', background: '#F5F5F2', borderRadius: 6, padding: '8px 10px', fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 4 }}>
              Filtrar todos que contêm “{texto.trim()}” <span style={{ color: C.suave }}>({num(encontrados.length)})</span>
            </button>
          )}
          {encontrados.length === 0 && <div style={{ padding: '10px', fontSize: 12.5, color: C.suave }}>Nenhum produto encontrado no período.</div>}
          {encontrados.slice(0, 80).map(c => {
            const marcado = selecionados.includes(chaveProduto(c))
            return (
              <label key={chaveProduto(c)} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 10px', fontSize: 12.5, cursor: 'pointer', borderRadius: 6, background: marcado ? C.verdeFundo : undefined }}>
                <input type="checkbox" checked={marcado} onChange={() => onAlternar(c)} style={{ accentColor: C.texto, marginTop: 2 }} />
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block' }}>{c.produto || '(sem nome)'}</span>
                  <span style={{ ...MONO, fontSize: 11, color: C.muito }}>{c.sku ? `SKU ${c.sku}` : 'sem SKU'} · {c.categoria}</span>
                </span>
              </label>
            )
          })}
          {encontrados.length > 80 && <div style={{ padding: '8px 10px', fontSize: 11.5, color: C.muito }}>Mostrando 80 de {num(encontrados.length)}. Digite mais pra refinar.</div>}
        </div>
      )}
    </div>
  )
}

// ─── Detalhe de um produto (onde vendeu + adições) ────────────────────────────────
function DetalheProduto({ produto, consulta, filtrado, onAlternarFiltro }: {
  produto: Produto; consulta: URLSearchParams; filtrado: boolean; onAlternarFiltro: () => void
}) {
  const [dados, setDados] = useState<DetalheProdutoResp | null>(null)
  const [erro, setErro] = useState('')
  const chave = consulta.toString()

  useEffect(() => {
    const ctrl = new AbortController()
    setDados(null); setErro('')
    const p = new URLSearchParams(chave)
    p.set('acao', 'produto'); p.set('id', produto.id); p.set('tipo', produto.tipo)
    getJSON<DetalheProdutoResp>(p, ctrl.signal).then(setDados).catch(e => { if (e.name !== 'AbortError') setErro(e.message) })
    return () => ctrl.abort()
  }, [chave, produto.id, produto.tipo])

  const ehAdicao = produto.tipo === 'Adição'
  const sub: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: C.texto, margin: '0 0 8px' }

  return (
    <div style={{ padding: '14px 16px 18px', background: '#FBFBF8', borderBottom: `1px solid ${C.borda}` }}>
      {erro ? <Aviso>{erro}</Aviso> : !dados ? <div style={{ fontSize: 12.5, color: C.suave }}>Carregando...</div> : (
        <div style={{ display: 'grid', gridTemplateColumns: ehAdicao ? '1fr' : 'repeat(auto-fit, minmax(340px, 1fr))', gap: 20 }}>
          <div>
            <h3 style={sub}>Onde vendeu</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 8 }}>
              <thead><tr>
                <th style={{ ...th, position: 'static' }}>Loja</th><th style={{ ...th, position: 'static' }}>Canal</th>
                <th style={{ ...th, position: 'static', textAlign: 'right' }}>Qtd</th>
                <th style={{ ...th, position: 'static', textAlign: 'right' }}>Valor total</th>
                <th style={{ ...th, position: 'static', textAlign: 'right' }}>% qtd</th>
              </tr></thead>
              <tbody>
                {dados.porLoja.map(l => (
                  <tr key={l.loja + l.canal}>
                    <td style={{ ...td, fontWeight: 500 }}>{l.loja}</td>
                    <td style={{ ...td, color: '#666' }}>{l.canal}</td>
                    <td style={tdNum}>{num(l.qtd)}</td>
                    <td style={tdNum}>{brl(l.liquido)}</td>
                    <td style={{ ...tdNum, color: C.suave }}>{dados.total.qtd ? pct(l.qtd / dados.total.qtd) : '—'}</td>
                  </tr>
                ))}
                {dados.porLoja.length === 0 && <tr><td style={td} colSpan={5}>Sem vendas nas lojas filtradas.</td></tr>}
              </tbody>
            </table>
          </div>

          {!ehAdicao && (
            <div>
              <h3 style={sub}>Adições escolhidas <span style={{ fontWeight: 400, color: C.suave }}>(montáveis e combos)</span></h3>
              {dados.adicoes.length === 0 ? (
                <div style={{ fontSize: 12.5, color: C.suave, background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 8, padding: 12 }}>
                  Nenhuma adição registrada neste produto no período.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 8 }}>
                  <thead><tr>
                    <th style={{ ...th, position: 'static' }}>Adição</th>
                    <th style={{ ...th, position: 'static', textAlign: 'right' }}>Qtd</th>
                    <th style={{ ...th, position: 'static', textAlign: 'right' }} title="Quantas vezes, em média, saiu por unidade do produto">Por unidade</th>
                    <th style={{ ...th, position: 'static' }}>Onde mais saiu</th>
                  </tr></thead>
                  <tbody>
                    {dados.adicoes.map(a => (
                      <tr key={a.id}>
                        <td style={td}>
                          <div style={{ fontWeight: 500 }}>{a.produto || '(sem nome)'}</div>
                          <div style={{ ...MONO, fontSize: 11, color: C.muito }}>{a.sku ? `SKU ${a.sku}` : 'sem SKU'}</div>
                        </td>
                        <td style={tdNum}>{num(a.qtd)}</td>
                        <td style={tdNum}>{dados.total.qtd ? num(a.qtd / dados.total.qtd) : '—'}</td>
                        <td style={{ ...td, fontSize: 12, color: '#666' }}>
                          {a.lojas.slice(0, 3).map(l => `${l.loja} (${num(l.qtd)})`).join(', ')}{a.lojas.length > 3 ? '…' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 12 }}>
        <button type="button" onClick={onAlternarFiltro} style={pill(filtrado)}>
          {filtrado ? 'Tirar este produto do filtro' : 'Filtrar o painel por este produto'}
        </button>
      </div>
    </div>
  )
}

// ─── Tabela de produtos ──────────────────────────────────────────────────────
type Ordem = { campo: 'produto' | 'loja' | 'categoria' | 'qtd' | 'valorUnitario' | 'desconto' | 'liquido' | 'transacoes' | 'custo' | 'cmv' | 'cmvPct' | 'margem'; dir: 1 | -1 }

function TabelaProdutos({ produtos, total, mostrarTx, consulta, selecionados, onAlternarFiltro, porLoja = false, custoDe }: {
  produtos: Produto[]; total: number; mostrarTx: boolean; consulta: URLSearchParams; porLoja?: boolean; custoDe: CustoDe
  selecionados: string[]; onAlternarFiltro: (p: Produto) => void
}) {
  const [ordem, setOrdem] = useState<Ordem>({ campo: 'liquido', dir: -1 })
  const [limite, setLimite] = useState(50)
  const [aberto, setAberto] = useState<string | null>(null)
  useEffect(() => { setLimite(50) }, [produtos])

  const ordenados = useMemo(() => {
    const val = (p: Produto) => {
      if (ordem.campo === 'valorUnitario') return p.qtd ? p.bruto / p.qtd : 0
      if (ordem.campo === 'custo' || ordem.campo === 'cmv' || ordem.campo === 'cmvPct' || ordem.campo === 'margem') {
        const c = custoDe(p)
        if (typeof c !== 'number') return -Infinity
        const cmv = c * p.qtd
        if (ordem.campo === 'custo') return c
        if (ordem.campo === 'cmv') return cmv
        if (ordem.campo === 'margem') return p.liquido - cmv
        return p.liquido > 0 ? cmv / p.liquido : -Infinity
      }
      return (p as any)[ordem.campo]
    }
    return [...produtos].sort((a, b) => {
      const va = val(a), vb = val(b)
      if (typeof va === 'string') return va.localeCompare(vb) * ordem.dir
      return ((va || 0) - (vb || 0)) * ordem.dir
    })
  }, [produtos, ordem, custoDe])

  const cab = (campo: Ordem['campo'], texto: string, direita = false) => (
    <th style={{ ...th, textAlign: direita ? 'right' : 'left', cursor: 'pointer', color: ordem.campo === campo ? C.texto : C.suave }}
      onClick={() => setOrdem(o => ({ campo, dir: o.campo === campo ? (o.dir === 1 ? -1 : 1) : (campo === 'produto' || campo === 'categoria' || campo === 'loja' ? 1 : -1) }))}>
      {texto}{ordem.campo === campo ? (ordem.dir === -1 ? ' ↓' : ' ↑') : ''}
    </th>
  )

  if (!produtos.length) {
    return <div style={{ padding: '24px 16px', fontSize: 13, color: C.suave }}>Nenhum produto vendido com esses filtros.</div>
  }

  const nCols = (mostrarTx ? 8 : 7) + (porLoja ? 2 : 0) + 4

  return (
    <>
      <div style={{ overflowX: 'auto', maxHeight: 720, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
          <thead>
            <tr>
              {cab('produto', 'Produto')}
              {porLoja && cab('loja', 'Loja')}
              {porLoja && <th style={th}>Canal</th>}
              {cab('categoria', 'Categoria')}
              {cab('qtd', 'Qtd', true)}
              {cab('valorUnitario', 'Valor unitário', true)}
              {cab('desconto', 'Descontos', true)}
              {cab('liquido', 'Valor total', true)}
              <th style={{ ...th, textAlign: 'right' }}>% total</th>
              {cab('custo', 'Custo unit.', true)}
              {cab('cmv', 'CMV', true)}
              {cab('cmvPct', 'CMV %', true)}
              {cab('margem', 'Margem', true)}
              {mostrarTx && cab('transacoes', 'Transações', true)}
            </tr>
          </thead>
          <tbody>
            {ordenados.slice(0, limite).map(p => {
              const k = chaveProduto(p) + (porLoja ? `|${p.loja}|${p.canal}` : '')
              const expandido = aberto === k
              const filtrado = selecionados.includes(chaveProduto(p))
              return (
                <FragmentoLinha key={k}>
                  <tr onClick={() => setAberto(expandido ? null : k)} title="Ver onde vendeu e as adições"
                    style={{ cursor: 'pointer', background: expandido ? '#FBFBF8' : filtrado ? C.verdeFundo : undefined }}>
                    <td style={td}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <span style={{ color: C.muito, fontSize: 11, width: 10, paddingTop: 2 }}>{expandido ? '▾' : '▸'}</span>
                        <div>
                          <div style={{ fontWeight: 500 }}>{p.produto || '(sem nome)'}</div>
                          <div style={{ ...MONO, fontSize: 11, color: C.muito, marginTop: 2 }}>
                            {p.sku ? `SKU ${p.sku}` : 'sem SKU'}{p.tipo === 'Adição' ? ' · adição de combo' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    {porLoja && <td style={{ ...td, fontWeight: 500, whiteSpace: 'nowrap' }}>{p.loja}</td>}
                    {porLoja && <td style={{ ...td, color: '#666' }}>{p.canal}</td>}
                    <td style={{ ...td, color: '#666' }}>{p.categoria}</td>
                    <td style={tdNum}>{num(p.qtd)}</td>
                    <td style={tdNum}>{p.qtd ? brl(p.bruto / p.qtd) : '—'}</td>
                    <td style={{ ...tdNum, color: p.desconto ? C.vermelho : C.muito }}>{p.desconto ? brl(p.desconto) : '—'}</td>
                    <td style={{ ...tdNum, fontWeight: 500 }}>{brl(p.liquido)}</td>
                    <td style={{ ...tdNum, color: C.suave }}>{total ? pct(p.liquido / total) : '—'}</td>
                    <CelulasCusto p={p} custoDe={custoDe} />
                    {mostrarTx && <td style={tdNum}>{num(p.transacoes)}</td>}
                  </tr>
                  {expandido && (
                    <tr>
                      <td colSpan={nCols} style={{ padding: 0 }}>
                        <DetalheProduto produto={p} consulta={consulta} filtrado={filtrado} onAlternarFiltro={() => onAlternarFiltro(p)} />
                      </td>
                    </tr>
                  )}
                </FragmentoLinha>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', fontSize: 12, color: C.suave }}>
        <span>Mostrando {num(Math.min(limite, ordenados.length))} de {num(ordenados.length)} {porLoja ? 'linhas (produto + casa)' : 'produtos'}</span>
        {limite < ordenados.length && (
          <button type="button" onClick={() => setLimite(l => l + 100)} style={pill(false)}>Mostrar mais 100</button>
        )}
      </div>
    </>
  )
}

function CelulasCusto({ p, custoDe }: { p: Produto; custoDe: CustoDe }) {
  const c = custoDe(p)
  if (c === undefined) return <><td style={{ ...tdNum, color: C.muito }}>—</td><td style={{ ...tdNum, color: C.muito }}>—</td><td style={{ ...tdNum, color: C.muito }}>—</td><td style={{ ...tdNum, color: C.muito }}>—</td></>
  if (c === null) {
    return (
      <>
        <td style={{ ...td, textAlign: 'right' }}>
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#FFF4E0', color: '#8A5A00', whiteSpace: 'nowrap' }}>sem ficha</span>
        </td>
        <td style={{ ...tdNum, color: C.muito }}>—</td><td style={{ ...tdNum, color: C.muito }}>—</td><td style={{ ...tdNum, color: C.muito }}>—</td>
      </>
    )
  }
  const cmv = c * p.qtd
  const margem = p.liquido - cmv
  return (
    <>
      <td style={tdNum}>{brl(c)}</td>
      <td style={tdNum}>{brl(cmv)}</td>
      <td style={{ ...tdNum, fontWeight: 500 }}>{p.liquido > 0 ? pct(cmv / p.liquido) : <span style={{ color: C.suave, fontWeight: 400 }}>cortesia</span>}</td>
      <td style={{ ...tdNum, color: margem < 0 ? C.vermelho : undefined }}>{brl(margem)}</td>
    </>
  )
}

function FragmentoLinha({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

// ─── Painel lateral de detalhe (um dia) ─────────────────────────────────────────
const COLS_DETALHE: { campo: string; label: string; num?: 'brl' | 'qtd' }[] = [
  { campo: 'loja', label: 'Loja' }, { campo: 'canal', label: 'Canal' }, { campo: 'produto', label: 'Produto' },
  { campo: 'sku', label: 'SKU' }, { campo: 'quantidade', label: 'Qtd', num: 'qtd' },
  { campo: 'valorTotal', label: 'Valor', num: 'brl' }, { campo: 'desconto', label: 'Desconto', num: 'brl' },
  { campo: 'funcionario', label: 'Funcionário' }, { campo: 'estacao', label: 'Estação' },
  { campo: 'cliente', label: 'Cliente' }, { campo: 'estornado', label: 'Estornado' },
]

function PainelDetalhe({ dia, filtros, onFechar }: { dia: string; filtros: URLSearchParams; onFechar: () => void }) {
  const [dados, setDados] = useState<Detalhe | null>(null)
  const [erro, setErro] = useState('')
  const chave = filtros.toString()

  useEffect(() => {
    const ctrl = new AbortController()
    setDados(null); setErro('')
    const p = new URLSearchParams(chave)
    p.set('acao', 'detalhe'); p.set('dia', dia); p.delete('inicio'); p.delete('fim')
    getJSON<Detalhe>(p, ctrl.signal).then(setDados).catch(e => { if (e.name !== 'AbortError') setErro(e.message) })
    return () => ctrl.abort()
  }, [dia, chave])

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onFechar])

  const ix = useMemo(() => {
    const m: Record<string, number> = {}
    dados?.colunas.forEach((c, i) => { m[c] = i })
    return m
  }, [dados])

  const exportar = () => {
    if (!dados) return
    exportarExcel(`vendas_detalhe_${dia}`, dados.linhas.map(l => {
      const o: Record<string, any> = {}
      dados.colunas.forEach((c, i) => { o[c] = l[i] })
      return o
    }))
  }

  return (
    <div role="dialog" aria-label={`Vendas de ${dataLonga(dia)}`}
      style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', justifyContent: 'flex-end', background: 'rgb(0 0 0 / 0.25)' }}
      onMouseDown={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div style={{ width: 'min(1100px, 100%)', height: '100%', background: '#fff', display: 'flex', flexDirection: 'column', boxShadow: '-8px 0 30px rgb(0 0 0 / 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '16px 20px', borderBottom: `1px solid ${C.borda}` }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>Vendas de {dataLonga(dia)} ({diaSemana(dia)})</div>
            <div style={{ fontSize: 12, color: C.suave, marginTop: 2 }}>Linha a linha, com os mesmos filtros do painel</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {dados && dados.linhas.length > 0 && <button type="button" onClick={exportar} style={pill(false)}>Exportar Excel</button>}
            <button type="button" onClick={onFechar} style={pill(true)}>Fechar</button>
          </div>
        </div>

        {erro ? <div style={{ padding: 20 }}><Aviso>{erro}</Aviso></div>
          : !dados ? <Spinner texto="Abrindo o dia..." />
          : (
            <>
              <div style={{ display: 'flex', gap: 24, padding: '12px 20px', fontSize: 13, flexWrap: 'wrap' }}>
                <span><span style={{ color: C.suave }}>Linhas </span><b style={MONO}>{num(dados.total)}</b></span>
                <span><span style={{ color: C.suave }}>Itens </span><b style={MONO}>{num(dados.totais.qtd)}</b></span>
                <span><span style={{ color: C.suave }}>Faturamento </span><b style={MONO}>{brl(dados.totais.liquido)}</b></span>
              </div>
              {dados.truncado && (
                <div style={{ padding: '0 20px 10px' }}>
                  <Aviso tipo="info">Mostrando as primeiras {num(dados.linhas.length)} linhas de {num(dados.total)}. Os totais acima consideram todas. Filtre por loja ou produto pra ver o resto.</Aviso>
                </div>
              )}
              <div style={{ flex: 1, overflow: 'auto', borderTop: `1px solid ${C.borda}` }}>
                {dados.linhas.length === 0
                  ? <div style={{ padding: 20, fontSize: 13, color: C.suave }}>Nenhuma venda nesse dia com os filtros atuais.</div>
                  : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980 }}>
                      <thead><tr>{COLS_DETALHE.map(c => <th key={c.campo} style={{ ...th, textAlign: c.num ? 'right' : 'left' }}>{c.label}</th>)}</tr></thead>
                      <tbody>
                        {dados.linhas.map((l, i) => {
                          const estornado = l[ix.estornado] === 'Sim'
                          return (
                            <tr key={i} style={{ color: estornado ? C.vermelho : undefined, textDecoration: estornado ? 'line-through' : undefined }}>
                              {COLS_DETALHE.map(c => {
                                const v = ix[c.campo] === undefined ? '' : l[ix[c.campo]]
                                if (c.num) return <td key={c.campo} style={tdNum}>{c.num === 'brl' ? brl(Number(v)) : num(Number(v))}</td>
                                return <td key={c.campo} style={{ ...td, fontSize: 12.5 }}>{String(v ?? '')}</td>
                              })}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )}
              </div>
            </>
          )}
      </div>
    </div>
  )
}

// ─── App ────────────────────────────────────────────────────────────────────────
export default function VendasClientApp() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [erroMeta, setErroMeta] = useState('')

  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [lojas, setLojas] = useState<string[]>([])
  const [canal, setCanal] = useState<'todos' | 'Salão' | 'Delivery'>('todos')
  const [categorias, setCategorias] = useState<string[]>([])
  const [busca, setBusca] = useState('')
  const [catalogo, setCatalogo] = useState<CatItem[]>([])
  const [adicoes, setAdicoes] = useState(false)
  const [produtosSel, setProdutosSel] = useState<{ chave: string; id: string; nome: string }[]>([])

  const [dados, setDados] = useState<Resumo | null>(null)
  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [diaDetalhe, setDiaDetalhe] = useState<string | null>(null)
  const [visao, setVisao] = useState<'produto' | 'loja'>('produto')
  const [linhasLoja, setLinhasLoja] = useState<Produto[] | null>(null)
  const [erroLoja, setErroLoja] = useState('')
  const [exportando, setExportando] = useState(false)
  const [custosResp, setCustosResp] = useState<CustosResp | null>(null)
  const [erroCustos, setErroCustos] = useState('')
  const [soSemFicha, setSoSemFicha] = useState(false)

  // Meta: período disponível + lojas liberadas pro usuário
  useEffect(() => {
    getJSON<Meta>(new URLSearchParams({ acao: 'meta' }))
      .then(m => {
        setMeta(m)
        if (m.ultimoDia) {
          const ini = m.ultimoDia.slice(0, 8) + '01'
          setInicio(m.primeiroDia && ini < m.primeiroDia ? m.primeiroDia : ini)
          setFim(m.ultimoDia)
        }
      })
      .catch(e => setErroMeta(e.message))
  }, [])

  const alternarProduto = useCallback((p: { id: string; tipo: string; produto: string; sku: string }) => {
    const chave = chaveProduto(p)
    setProdutosSel(sel => sel.some(x => x.chave === chave)
      ? sel.filter(x => x.chave !== chave)
      : [...sel, { chave, id: p.id, nome: p.produto || p.sku }])
  }, [])

  const filtros = useMemo(() => {
    const p = new URLSearchParams()
    if (lojas.length) p.set('lojas', lojas.join('|'))
    if (canal !== 'todos') p.set('canais', canal)
    if (categorias.length) p.set('categorias', categorias.join('|'))
    if (produtosSel.length) p.set('skus', Array.from(new Set(produtosSel.map(x => x.id))).join('|'))
    if (busca) p.set('busca', busca)
    if (adicoes) p.set('adicoes', '1')
    return p
  }, [lojas, canal, categorias, produtosSel, busca, adicoes])

  const maxDias = meta?.maxDias || 186
  const periodoInvalido = !inicio || !fim ? 'Escolha o período' : fim < inicio ? 'A data final está antes da inicial' : diasEntre(inicio, fim) > maxDias ? `Período máximo de ${maxDias} dias` : ''

  const pedido = useRef<AbortController | null>(null)
  const carregar = useCallback((semCache = false) => {
    if (periodoInvalido) return
    pedido.current?.abort()
    const ctrl = new AbortController()
    pedido.current = ctrl
    const p = new URLSearchParams(filtros)
    p.set('acao', 'resumo'); p.set('inicio', inicio); p.set('fim', fim)
    if (semCache) p.set('nocache', '1')
    setCarregando(true); setErro('')
    getJSON<Resumo>(p, ctrl.signal)
      .then(d => { if (!ctrl.signal.aborted) { setDados(d); if (d.catalogo) setCatalogo(d.catalogo) } })
      .catch(e => { if (e.name !== 'AbortError') setErro(e.message) })
      .finally(() => { if (pedido.current === ctrl) setCarregando(false) })
  }, [filtros, inicio, fim, periodoInvalido])

  useEffect(() => { carregar() }, [carregar])

  // Custos das fichas técnicas (módulo de CMV) — carrega uma vez
  useEffect(() => {
    getJSON<CustosResp>(new URLSearchParams({ acao: 'custos' }))
      .then(setCustosResp)
      .catch(e => setErroCustos(e.message))
  }, [])

  const mapaCustos = useMemo(() => {
    const m = new Map<string, number>()
    if (!custosResp) return m
    for (const [sku, c] of Object.entries(custosResp.custos)) {
      m.set(sku, c.custo)
      const z = semZeros(sku)
      if (!m.has(z)) m.set(z, c.custo)
    }
    return m
  }, [custosResp])

  const custoDe = useCallback<CustoDe>((p) => {
    if (!custosResp) return undefined
    if (p.tipo === 'Adição' || ehGorjeta(p)) return undefined
    if (!p.sku) return null
    const c = mapaCustos.get(p.sku) ?? mapaCustos.get(semZeros(p.sku))
    return c === undefined ? null : c
  }, [custosResp, mapaCustos])

  const paramsProdutoLoja = useCallback(() => {
    const p = new URLSearchParams(filtros)
    p.set('acao', 'produtoLoja'); p.set('inicio', inicio); p.set('fim', fim)
    return p
  }, [filtros, inicio, fim])

  // Visão "por produto e casa": busca produto × loja × canal no período
  useEffect(() => {
    if (visao !== 'loja' || periodoInvalido) return
    const ctrl = new AbortController()
    setLinhasLoja(null); setErroLoja('')
    getJSON<{ linhas: Produto[] }>(paramsProdutoLoja(), ctrl.signal)
      .then(d => setLinhasLoja(d.linhas))
      .catch(e => { if (e.name !== 'AbortError') setErroLoja(e.message) })
    return () => ctrl.abort()
  }, [visao, paramsProdutoLoja, periodoInvalido])

  const presets = useMemo(() => {
    const u = meta?.ultimoDia
    if (!u) return []
    const inicioMes = u.slice(0, 8) + '01'
    const fimMesAnt = addDias(inicioMes, -1)
    return [
      { label: 'Último dia', ini: u, fim: u },
      { label: '7 dias', ini: addDias(u, -6), fim: u },
      { label: '30 dias', ini: addDias(u, -29), fim: u },
      { label: 'Mês atual', ini: inicioMes, fim: u },
      { label: 'Mês anterior', ini: fimMesAnt.slice(0, 8) + '01', fim: fimMesAnt },
    ]
  }, [meta])

  const limparFiltros = () => {
    setLojas([]); setCanal('todos'); setCategorias([]); setBusca(''); setProdutosSel([]); setAdicoes(false)
  }
  const temFiltro = lojas.length > 0 || canal !== 'todos' || categorias.length > 0 || !!busca || produtosSel.length > 0 || adicoes

  const consultaProduto = useMemo(() => {
    const p = new URLSearchParams({ inicio, fim })
    if (lojas.length) p.set('lojas', lojas.join('|'))
    if (canal !== 'todos') p.set('canais', canal)
    return p
  }, [inicio, fim, lojas, canal])

  const cmvResumo = useMemo(() => {
    if (!dados || !custosResp) return null
    let cmv = 0, fatComFicha = 0, fatSemFicha = 0, cortesias = 0, semFicha = 0
    for (const p of dados.produtos) {
      const c = custoDe(p)
      if (c === undefined) continue
      if (c === null) { semFicha++; fatSemFicha += p.liquido; continue }
      if (p.liquido > 0) { cmv += c * p.qtd; fatComFicha += p.liquido } else cortesias += c * p.qtd
    }
    const fatTotal = fatComFicha + fatSemFicha
    return { cmv, fatComFicha, cortesias, semFicha, pct: fatComFicha ? cmv / fatComFicha : null, cobertura: fatTotal ? fatComFicha / fatTotal : null }
  }, [dados, custosResp, custoDe])

  const k = dados?.kpis
  const porItem = !!k?.transacoesPorItem
  const diasSemTx = dados?.periodo.diasSemTransacao.length || 0

  // Excel sempre sai uma linha por produto + casa + canal
  const exportarProdutos = async () => {
    setExportando(true)
    try {
      const linhas = linhasLoja && visao === 'loja' ? linhasLoja : (await getJSON<{ linhas: Produto[] }>(paramsProdutoLoja())).linhas
      await exportarExcel(`vendas_produtos_por_casa_${inicio}_a_${fim}`, linhas.map(p => ({
        Loja: p.loja, Canal: p.canal, Produto: p.produto, SKU: p.sku, Categoria: p.categoria, Tipo: p.tipo,
        Quantidade: p.qtd,
        'Valor unitário': p.qtd ? Math.round((p.bruto / p.qtd) * 100) / 100 : 0,
        'Valor bruto': p.bruto, Descontos: p.desconto, 'Valor total': p.liquido,
        Transações: p.transacoes, 'Qtd estornada': p.estornoQtd, 'Valor estornado': p.estornoValor,
        ...(() => {
          const c = custoDe(p)
          if (typeof c !== 'number') return { 'Custo unit.': c === null ? 'sem ficha' : '', CMV: '', 'CMV %': '', Margem: '' }
          const cmv = c * p.qtd
          return {
            'Custo unit.': Math.round(c * 100) / 100, CMV: Math.round(cmv * 100) / 100,
            'CMV %': p.liquido > 0 ? Math.round((cmv / p.liquido) * 10000) / 100 : '',
            Margem: Math.round((p.liquido - cmv) * 100) / 100,
          }
        })(),
      })))
    } catch (e: any) {
      alert('Não foi possível exportar: ' + (e?.message || e))
    } finally {
      setExportando(false)
    }
  }

  // ─── Render ───
  const topo = (
    <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
      <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">← Voltar ao HUB</Link>
      <span className="text-zinc-700 text-xs">|</span>
      <span className="text-xs text-zinc-500">Vendas por Produto</span>
    </div>
  )

  if (erroMeta) {
    return (
      <div style={{ minHeight: '100vh', background: C.fundo }}>{topo}
        <div style={{ maxWidth: 560, margin: '60px auto', padding: 20 }}><Aviso>Não foi possível abrir o painel: {erroMeta}</Aviso></div>
      </div>
    )
  }
  if (!meta) return <div style={{ minHeight: '100vh', background: C.fundo, display: 'flex', flexDirection: 'column' }}>{topo}<Spinner /></div>
  if (!meta.ultimoDia) {
    return (
      <div style={{ minHeight: '100vh', background: C.fundo }}>{topo}
        <div style={{ maxWidth: 560, margin: '60px auto', padding: 20 }}>
          <Aviso tipo="info">Ainda não há vendas resumidas. Rode reconstruirResumo() no Apps Script de vendas e recarregue esta página.</Aviso>
        </div>
      </div>
    )
  }

  const maxCat = Math.max(1, ...(dados?.porCategoria || []).map(c => c.liquido))
  const totalLojas = (dados?.porLoja || []).reduce((s, l) => s + l.liquido, 0)

  return (
    <div style={{ minHeight: '100vh', background: C.fundo, display: 'flex', flexDirection: 'column' }}>
      {topo}

      {/* Cabeçalho + filtros */}
      <header style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '14px 24px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: C.texto }}>Vendas por Produto</h1>
            <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>
              Dados de {dataLonga(meta.primeiroDia || meta.ultimoDia)} até {dataLonga(meta.ultimoDia)} · atualiza toda manhã com o dia anterior
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {presets.map(p => (
              <button key={p.label} type="button" onClick={() => { setInicio(p.ini); setFim(p.fim) }} style={pill(inicio === p.ini && fim === p.fim)}>{p.label}</button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <input type="date" value={inicio} min={meta.primeiroDia || undefined} max={meta.ultimoDia} onChange={e => setInicio(e.target.value)} style={{ ...pill(true), padding: '0 10px', cursor: 'text' }} aria-label="Data inicial" />
          <span style={{ fontSize: 12, color: C.muito }}>até</span>
          <input type="date" value={fim} min={meta.primeiroDia || undefined} max={meta.ultimoDia} onChange={e => setFim(e.target.value)} style={{ ...pill(true), padding: '0 10px', cursor: 'text' }} aria-label="Data final" />

          <span style={{ width: 1, height: 20, background: C.borda, margin: '0 4px' }} />

          <MultiSelect label="lojas" labelTodos="Todas as lojas" opcoes={meta.lojas} valor={lojas} onChange={setLojas} />

          <div style={{ display: 'inline-flex', border: '1px solid #E8E8E8', borderRadius: 99, overflow: 'hidden', height: 32 }}>
            {(['todos', 'Salão', 'Delivery'] as const).map(c => (
              <button key={c} type="button" onClick={() => setCanal(c)}
                style={{ border: 'none', padding: '0 12px', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', background: canal === c ? C.texto : '#fff', color: canal === c ? '#fff' : '#666', fontWeight: canal === c ? 600 : 400 }}>
                {c === 'todos' ? 'Salão + Delivery' : c}
              </button>
            ))}
          </div>

          <MultiSelect label="categorias" labelTodos="Todas as categorias" opcoes={dados?.categoriasDisponiveis || []} valor={categorias} onChange={setCategorias} />

          <SeletorProdutos catalogo={catalogo} selecionados={produtosSel.map(x => x.chave)}
            onAlternar={alternarProduto} onAplicarBusca={setBusca} />

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: '#666', cursor: 'pointer', marginLeft: 4 }}>
            <input type="checkbox" checked={adicoes} onChange={e => setAdicoes(e.target.checked)} style={{ accentColor: C.texto }} />
            Incluir adições de combo
          </label>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {temFiltro && <button type="button" onClick={limparFiltros} style={{ ...pill(false), border: 'none', textDecoration: 'underline', color: '#999' }}>Limpar filtros</button>}
            <button type="button" onClick={() => carregar(true)} style={pill(false)} title="Buscar de novo, ignorando o cache de 10 min">Atualizar</button>
          </div>
        </div>

        {(produtosSel.length > 0 || busca) && (
          <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {busca && <Chip onRemover={() => setBusca('')}>Contém: {busca}</Chip>}
            {produtosSel.map(x => (
              <Chip key={x.chave} onRemover={() => setProdutosSel(sel => sel.filter(y => y.chave !== x.chave))}>{x.nome}</Chip>
            ))}
            {produtosSel.length > 1 && (
              <button type="button" onClick={() => setProdutosSel([])}
                style={{ border: 'none', background: 'none', fontSize: 12, color: '#999', textDecoration: 'underline', cursor: 'pointer', fontFamily: 'inherit' }}>
                limpar produtos
              </button>
            )}
          </div>
        )}
        {carregando && <div style={{ position: 'absolute', left: 0, right: 0, bottom: -2, height: 2, background: C.verde, animation: 'vbar 1.1s ease-in-out infinite' }} />}
        <style>{`@keyframes vbar{0%{transform:scaleX(0);transform-origin:left}50%{transform:scaleX(1);transform-origin:left}51%{transform-origin:right}100%{transform:scaleX(0);transform-origin:right}}`}</style>
      </header>

      <main style={{ flex: 1, padding: '20px 24px 40px', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1480, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
        {periodoInvalido && <Aviso>{periodoInvalido}.</Aviso>}
        {erro && <Aviso>{erro}</Aviso>}
        {!dados && !erro && !periodoInvalido && <Spinner />}

        {dados && k && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: carregando ? 0.55 : 1, transition: 'opacity .15s' }}>
            {dados.periodo.diasSemDados.length > 0 && (
              <Aviso tipo="info">
                {dados.periodo.diasSemDados.length === 1 ? '1 dia' : `${dados.periodo.diasSemDados.length} dias`} do período sem dados
                ({dados.periodo.diasSemDados.slice(0, 6).map(dataCurta).join(', ')}{dados.periodo.diasSemDados.length > 6 ? '…' : ''}).
              </Aviso>
            )}

            {/* KPIs */}
            <style>{`.vkpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}@media(max-width:980px){.vkpis{grid-template-columns:repeat(2,minmax(0,1fr))}}`}</style>
            <div className="vkpis">
              <Kpi label="Faturamento" valor={brl0(k.faturamento)} sub={`média de ${brl0(k.mediaDiaria)} por dia`} />
              <Kpi label="Itens vendidos" valor={num(k.itens)} sub={`${num(k.produtosDistintos)} produtos diferentes`} />
              <Kpi label={porItem ? 'Transações com o item' : 'Transações'} valor={num(k.transacoes)}
                sub={diasSemTx && !porItem ? `${diasSemTx} dia(s) sem esse dado` : undefined} />
              <Kpi label="Ticket médio" valor={k.ticketMedio === null ? '—' : brl(k.ticketMedio)}
                sub={porItem ? 'não se aplica com filtro de produto' : diasSemTx ? 'só dias com dado de transação' : undefined} />
              <Kpi label="Descontos" valor={brl0(k.desconto)} sub={k.bruto ? `${pct(k.desconto / k.bruto)} do bruto` : undefined} cor={k.desconto ? C.vermelho : undefined} />
              <Kpi label="Estornos" valor={brl0(k.estornoValor)} sub={`${num(k.estornoQtd)} itens, fora do faturamento`} cor={k.estornoValor ? C.vermelho : undefined} />
              <Kpi label="CMV" valor={cmvResumo?.pct == null ? '—' : pct(cmvResumo.pct)}
                sub={erroCustos ? 'fichas indisponíveis' : !cmvResumo ? 'carregando fichas...' : `${brl0(cmvResumo.cmv)} de custo${cmvResumo.cortesias ? ` + ${brl0(cmvResumo.cortesias)} em cortesias` : ''}`} />
              <Kpi label="Cobertura de ficha" valor={cmvResumo?.cobertura == null ? '—' : pct(cmvResumo.cobertura)}
                sub={cmvResumo ? `${num(cmvResumo.semFicha)} produtos sem ficha${custosResp?.atualizadaEm ? ` · ficha de ${dataCurta(custosResp.atualizadaEm.slice(0, 10))}` : ''}` : undefined}
                cor={cmvResumo && cmvResumo.cobertura != null && cmvResumo.cobertura < 0.9 ? '#8A5A00' : undefined} />
            </div>
            {erroCustos && <Aviso>{erroCustos}</Aviso>}
            {custosResp && custosResp.duplicados.length > 0 && (
              <Aviso tipo="info">
                {custosResp.duplicados.length} SKU(s) usados em mais de uma ficha: o custo usado é a média.{' '}
                {custosResp.duplicados.map(d => `SKU ${d.sku}: ${d.fichas.map(f => `${f.nome} (${brl(f.custo)})`).join(' / ')}`).join(' · ')}
              </Aviso>
            )}

            {/* Por dia */}
            <Painel titulo="Faturamento por dia" direita={<span style={{ fontSize: 12, color: C.muito }}>Clique num dia pra ver as vendas linha a linha</span>}>
              <div style={{ height: 240, padding: '0 8px 12px' }}>
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={200}>
                  <BarChart data={dados.porDia} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="#F0F0F0" />
                    <XAxis dataKey="dia" tickFormatter={dataCurta} tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={false} minTickGap={12} />
                    <YAxis tickFormatter={(v: number) => brlCompact(v)} tick={{ fontSize: 11, fill: '#999' }} tickLine={false} axisLine={false} width={64} />
                    <Tooltip cursor={{ fill: '#F4F4F0' }} content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0].payload
                      return (
                        <div style={{ ...card, padding: '10px 12px', fontSize: 12.5, boxShadow: '0 4px 16px rgb(0 0 0 / 0.08)' }}>
                          <div style={{ fontWeight: 600, marginBottom: 4 }}>{dataLonga(d.dia)} ({diaSemana(d.dia)})</div>
                          {d.temDados ? (
                            <>
                              <div style={MONO}>{brl(d.liquido)}</div>
                              <div style={{ color: C.suave }}>{num(d.qtd)} itens{d.transacoes ? ` · ${num(d.transacoes)} transações` : ''}</div>
                            </>
                          ) : <div style={{ color: C.suave }}>sem dados</div>}
                        </div>
                      )
                    }} />
                    <Bar dataKey="liquido" radius={[3, 3, 0, 0]} cursor="pointer"
                      onClick={(d: any) => { const dia = d?.payload?.dia ?? d?.dia; if (dia) setDiaDetalhe(dia) }}>
                      {dados.porDia.map(d => {
                        const dow = new Date(d.dia + 'T12:00:00').getDay()
                        return <Cell key={d.dia} fill={!d.temDados ? '#E8E8E2' : dow === 0 || dow === 6 ? '#6F7A1A' : C.verde} />
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', gap: 16, padding: '0 16px 14px', fontSize: 11.5, color: C.suave }}>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: C.verde, marginRight: 6 }} />dia de semana</span>
                <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#6F7A1A', marginRight: 6 }} />sábado e domingo</span>
              </div>
            </Painel>

            {/* Lojas + categorias */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 16 }}>
              <Painel titulo="Por loja e canal" direita={<span style={{ fontSize: 12, color: C.muito }}>Clique pra filtrar</span>}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        <th style={th}>Loja</th><th style={th}>Canal</th>
                        <th style={{ ...th, textAlign: 'right' }}>Faturamento</th>
                        <th style={{ ...th, textAlign: 'right' }}>%</th>
                        <th style={{ ...th, textAlign: 'right' }}>{porItem ? 'Transações c/ item' : 'Transações'}</th>
                        {!porItem && <th style={{ ...th, textAlign: 'right' }}>Ticket</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {dados.porLoja.filter(l => l.liquido || l.qtd || l.transacoes).map(l => (
                        <tr key={l.loja + l.canal} style={{ cursor: 'pointer', background: lojas.length === 1 && lojas[0] === l.loja ? C.verdeFundo : undefined }}
                          onClick={() => setLojas(lojas.length === 1 && lojas[0] === l.loja ? [] : [l.loja])}>
                          <td style={{ ...td, fontWeight: 500 }}>{l.loja}</td>
                          <td style={{ ...td, color: '#666' }}>{l.canal}</td>
                          <td style={tdNum}>{brl(l.liquido)}</td>
                          <td style={{ ...tdNum, color: C.suave }}>{totalLojas ? pct(l.liquido / totalLojas) : '—'}</td>
                          <td style={tdNum}>{num(l.transacoes)}</td>
                          {!porItem && <td style={tdNum}>{l.ticketMedio === null ? '—' : brl(l.ticketMedio)}</td>}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Painel>

              <Painel titulo="Por categoria" direita={<span style={{ fontSize: 12, color: C.muito }}>Clique pra filtrar</span>}>
                <div style={{ padding: '4px 16px 16px', display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 420, overflowY: 'auto' }}>
                  {dados.porCategoria.length === 0 && <div style={{ fontSize: 13, color: C.suave }}>Sem vendas.</div>}
                  {dados.porCategoria.map(c => {
                    const ativo = categorias.includes(c.categoria)
                    return (
                      <button key={c.categoria} type="button"
                        onClick={() => setCategorias(ativo ? categorias.filter(x => x !== c.categoria) : [c.categoria])}
                        style={{ border: 'none', background: ativo ? C.verdeFundo : 'transparent', textAlign: 'left', padding: '6px 8px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5 }}>
                          <span style={{ color: C.texto, fontWeight: ativo ? 600 : 400 }}>{c.categoria}</span>
                          <span style={{ ...MONO, color: '#555', whiteSpace: 'nowrap' }}>{brl0(c.liquido)} <span style={{ color: C.muito }}>· {num(c.qtd)} un</span></span>
                        </div>
                        <div style={{ height: 4, background: '#F0F0EC', borderRadius: 2, marginTop: 5 }}>
                          <div style={{ height: 4, width: `${Math.max(0, (c.liquido / maxCat) * 100)}%`, background: C.verde, borderRadius: 2 }} />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </Painel>
            </div>

            {/* Produtos */}
            <Painel titulo="Produtos" direita={
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ display: 'inline-flex', border: '1px solid #E8E8E8', borderRadius: 99, overflow: 'hidden', height: 32 }}>
                  {([['produto', 'Por produto'], ['loja', 'Por produto e casa']] as const).map(([v, t]) => (
                    <button key={v} type="button" onClick={() => setVisao(v)}
                      style={{ border: 'none', padding: '0 12px', fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer', background: visao === v ? C.texto : '#fff', color: visao === v ? '#fff' : '#666', fontWeight: visao === v ? 600 : 400 }}>
                      {t}
                    </button>
                  ))}
                </div>
                {cmvResumo && cmvResumo.semFicha > 0 && (
                  <button type="button" onClick={() => setSoSemFicha(v => !v)} style={pill(soSemFicha)}>
                    Só sem ficha ({num(cmvResumo.semFicha)})
                  </button>
                )}
                <button type="button" onClick={exportarProdutos} style={pill(false)} disabled={!dados.produtos.length || exportando}>
                  {exportando ? 'Gerando...' : 'Exportar Excel (por casa)'}
                </button>
              </div>
            }>
              {visao === 'loja' && erroLoja ? <div style={{ padding: 16 }}><Aviso>{erroLoja}</Aviso></div>
                : visao === 'loja' && !linhasLoja ? <Spinner texto="Abrindo por casa..." />
                : (
                  <TabelaProdutos porLoja={visao === 'loja'} custoDe={custoDe}
                    produtos={(visao === 'loja' && linhasLoja ? linhasLoja : dados.produtos).filter(p => !soSemFicha || custoDe(p) === null)}
                    total={k.faturamento} mostrarTx={!diasSemTx || porItem}
                    consulta={consultaProduto} selecionados={produtosSel.map(x => x.chave)} onAlternarFiltro={alternarProduto} />
                )}
            </Painel>
          </div>
        )}
      </main>

      {diaDetalhe && <PainelDetalhe dia={diaDetalhe} filtros={filtros} onFechar={() => setDiaDetalhe(null)} />}
    </div>
  )
}
