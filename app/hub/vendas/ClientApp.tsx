'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Meta = { primeiroDia: string | null; ultimoDia: string | null; atualizadoEm: string | null; lojas: string[]; canais: string[]; maxDias: number }
type Produto = { id: string; sku: string; produto: string; categoria: string; tipo: string; qtd: number; liquido: number; estornoQtd: number; estornoValor: number }
type Resumo = {
  periodo: { dias: number; diasComDados: number; diasSemDados: string[]; diasSemTransacao: string[] }
  filtros: { porItem: boolean }
  kpis: { faturamento: number; bruto: number; desconto: number; itens: number; transacoes: number; ticketMedio: number | null; estornoValor: number }
  porDia: { dia: string; temDados: boolean; liquido: number; qtd: number }[]
  porLoja: { loja: string; canal: string; liquido: number; qtd: number; transacoes: number }[]
  categoriasDisponiveis: string[]
  produtos: Produto[]
}
type Detalhe = { colunas: string[]; linhas: (string | number)[][]; total: number; truncado: boolean; totais: { qtd: number; liquido: number } }

const dinheiro = (n: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0)
const numero = (n: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 3 }).format(n || 0)
const dataBR = (s: string) => s ? s.split('-').reverse().join('/') : '—'

async function consultar<T>(params: URLSearchParams, signal?: AbortSignal): Promise<T> {
  const res = await fetch('/api/vendas?' + params, { signal, cache: 'no-store' })
  const data = await res.json()
  if (!res.ok || !data.ok) throw new Error(data.erro || 'Não foi possível carregar os dados')
  return data as T
}

export default function VendasClient() {
  const [meta, setMeta] = useState<Meta | null>(null)
  const [inicio, setInicio] = useState('')
  const [fim, setFim] = useState('')
  const [loja, setLoja] = useState('')
  const [canal, setCanal] = useState('')
  const [categoria, setCategoria] = useState('')
  const [busca, setBusca] = useState('')
  const [adicoes, setAdicoes] = useState(false)
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [detalhe, setDetalhe] = useState<Detalhe | null>(null)
  const [dia, setDia] = useState('')
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    const controller = new AbortController()
    consultar<Meta>(new URLSearchParams({ acao: 'meta' }), controller.signal)
      .then(m => {
        setMeta(m)
        if (m.ultimoDia) {
          setFim(m.ultimoDia)
          setInicio(m.ultimoDia.slice(0, 7) + '-01')
        }
      }).catch(e => { if (e.name !== 'AbortError') setErro(e.message) })
    return () => controller.abort()
  }, [])

  const params = useMemo(() => {
    const p = new URLSearchParams({ inicio, fim })
    if (loja) p.set('lojas', loja)
    if (canal) p.set('canais', canal)
    if (categoria) p.set('categorias', categoria)
    if (busca.trim()) p.set('busca', busca.trim())
    if (adicoes) p.set('adicoes', '1')
    return p
  }, [inicio, fim, loja, canal, categoria, busca, adicoes])

  useEffect(() => {
    if (!inicio || !fim) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setErro('')
      setDetalhe(null)
      setDia('')
      const p = new URLSearchParams(params)
      p.set('acao', 'resumo')
      consultar<Resumo>(p, controller.signal)
        .then(setResumo)
        .catch(e => { if (e.name !== 'AbortError') { setErro(e.message); setResumo(null) } })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 300)
    return () => { clearTimeout(timer); controller.abort() }
  }, [inicio, fim, params])

  async function abrirDia(d: string) {
    setDia(d)
    setDetalhe(null)
    setErro('')
    const p = new URLSearchParams(params)
    p.set('acao', 'detalhe')
    p.set('dia', d)
    try { setDetalhe(await consultar<Detalhe>(p)) }
    catch (e) { setErro(e instanceof Error ? e.message : 'Falha ao abrir o dia') }
  }

  const campo = 'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-green-600 focus:outline-none'
  return <div className="min-h-screen bg-zinc-50 text-zinc-900">
    <div className="bg-zinc-950 px-6 py-3 text-sm"><Link href="/hub" className="text-zinc-300 hover:text-white">← Voltar ao HUB</Link></div>
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header><h1 className="text-2xl font-bold">Vendas ZIG</h1><p className="mt-1 text-sm text-zinc-500">Vendas de produtos por data do evento. Último dia disponível: {dataBR(meta?.ultimoDia || '')}.</p></header>
      <section className="grid gap-3 rounded-xl border bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs font-semibold">De<input className={campo} type="date" value={inicio} min={meta?.primeiroDia || undefined} max={fim || undefined} onChange={e => setInicio(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Até<input className={campo} type="date" value={fim} max={meta?.ultimoDia || undefined} onChange={e => setFim(e.target.value)} /></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Unidade<select className={campo} value={loja} onChange={e => setLoja(e.target.value)}><option value="">Todas permitidas</option>{meta?.lojas.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Canal<select className={campo} value={canal} onChange={e => setCanal(e.target.value)}><option value="">Todos</option>{meta?.canais.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs font-semibold">Categoria<select className={campo} value={categoria} onChange={e => setCategoria(e.target.value)}><option value="">Todas</option>{resumo?.categoriasDisponiveis.map(x => <option key={x}>{x}</option>)}</select></label>
        <label className="flex flex-col gap-1 text-xs font-semibold sm:col-span-2">Buscar produto ou SKU<input className={campo} value={busca} onChange={e => setBusca(e.target.value)} placeholder="Nome ou código" /></label>
        <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={adicoes} onChange={e => setAdicoes(e.target.checked)} /> Incluir itens de combos</label>
      </section>
      {erro && <p role="alert" className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{erro}</p>}
      {loading && <p className="text-sm text-zinc-500">Carregando resumo…</p>}
      {resumo && <>
        {!!resumo.periodo.diasSemDados.length && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Há {resumo.periodo.diasSemDados.length} dia(s) sem arquivo no período. Os totais abaixo são apenas dos dias carregados.</p>}
        {!!resumo.periodo.diasSemTransacao.length && <p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900">Alguns CSVs antigos não têm identificador de transação. O ticket e o número de transações desse período podem estar incompletos.</p>}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {([['Faturamento', dinheiro(resumo.kpis.faturamento)], ['Itens vendidos', numero(resumo.kpis.itens)], ['Transações', resumo.filtros.porItem ? '—' : numero(resumo.kpis.transacoes)], ['Ticket médio', resumo.kpis.ticketMedio === null ? '—' : dinheiro(resumo.kpis.ticketMedio)], ['Bruto', dinheiro(resumo.kpis.bruto)], ['Descontos', dinheiro(resumo.kpis.desconto)], ['Estornos', dinheiro(resumo.kpis.estornoValor)], ['Dias carregados', `${resumo.periodo.diasComDados}/${resumo.periodo.dias}`]] as [string, string][]).map(([label, valor]) => <div key={label} className="rounded-xl border bg-white p-4 shadow-sm"><p className="text-xs text-zinc-500">{label}</p><p className="mt-2 text-xl font-semibold">{valor}</p></div>)}
        </section>
        <section className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-4"><h2 className="mb-3 font-semibold">Unidades e canais</h2><div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Unidade</th><th>Canal</th><th className="text-right">Faturamento</th></tr></thead><tbody>{resumo.porLoja.map((x, i) => <tr key={i} className="border-t"><td className="py-2">{x.loja}</td><td>{x.canal}</td><td className="text-right">{dinheiro(x.liquido)}</td></tr>)}</tbody></table></div></div>
          <div className="rounded-xl border bg-white p-4"><h2 className="mb-3 font-semibold">Dias — clique para ver os lançamentos</h2><div className="max-h-96 overflow-auto"><table className="w-full text-left text-sm"><thead><tr><th className="py-2">Dia</th><th className="text-right">Itens</th><th className="text-right">Faturamento</th></tr></thead><tbody>{resumo.porDia.map(x => <tr key={x.dia} className="border-t"><td className="py-2"><button className="text-green-700 underline disabled:text-zinc-400" disabled={!x.temDados} onClick={() => abrirDia(x.dia)}>{dataBR(x.dia)}</button></td><td className="text-right">{x.temDados ? numero(x.qtd) : 'Sem arquivo'}</td><td className="text-right">{x.temDados ? dinheiro(x.liquido) : '—'}</td></tr>)}</tbody></table></div></div>
        </section>
        <section className="rounded-xl border bg-white p-4"><h2 className="mb-3 font-semibold">Produtos ({resumo.produtos.length})</h2><div className="max-h-[580px] overflow-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead className="sticky top-0 bg-white"><tr><th className="py-2">Produto</th><th>SKU</th><th>Categoria</th><th className="text-right">Quantidade</th><th className="text-right">Faturamento</th></tr></thead><tbody>{resumo.produtos.map((x, i) => <tr key={`${x.id}-${x.tipo}-${i}`} className="border-t"><td className="py-2">{x.produto}{x.tipo === 'Adição' && <span className="ml-2 text-xs text-zinc-500">Adição</span>}</td><td>{x.sku || '—'}</td><td>{x.categoria}</td><td className="text-right">{numero(x.qtd)}</td><td className="text-right">{dinheiro(x.liquido)}</td></tr>)}</tbody></table></div></section>
      </>}
      {dia && <section className="rounded-xl border bg-white p-4"><h2 className="font-semibold">Lançamentos de {dataBR(dia)}</h2>{!detalhe ? <p className="mt-3 text-sm">Carregando detalhe…</p> : <><p className="my-2 text-sm text-zinc-500">{numero(detalhe.total)} linhas · {dinheiro(detalhe.totais.liquido)}{detalhe.truncado ? ' · exibindo apenas as primeiras 3.000 linhas' : ''}</p><div className="max-h-[600px] overflow-auto"><table className="min-w-max text-left text-xs"><thead className="sticky top-0 bg-white"><tr>{detalhe.colunas.map((x, i) => <th key={i} className="px-3 py-2">{x}</th>)}</tr></thead><tbody>{detalhe.linhas.map((row, i) => <tr key={i} className="border-t">{row.map((v, j) => <td key={j} className="px-3 py-2">{String(v)}</td>)}</tr>)}</tbody></table></div></>}</section>}
    </main>
  </div>
}
