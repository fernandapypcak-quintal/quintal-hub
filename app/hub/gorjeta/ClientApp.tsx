'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { UNITS, type UnitId } from '@/lib/units'
import { FILIAL_PAGAMENTO, periodoAtual, type TipoFolha } from '@/lib/gorjeta-config'
import {
  compute, aplicarDescontoAdiantamento, construirHistoricoEntry,
  type Ativo, type Presenca, type HistoricoEntry, type ComputeResult,
} from '@/lib/gorjeta-engine'
import { lerAtivosGeral, filtrarAtivosPorFilial, parsePresencaXlsx, type AtivosGeralParsed } from '@/lib/gorjeta-import'
import { useGorjeta } from './hooks/useGorjeta'

const UNIDADES_GORJETA = UNITS.filter(u => u.id !== 'holding')
// Mesma paleta do Stores.jsx (Faturamento) — mantém a cor de cada loja igual
// em todo o HUB, em vez de inventar uma paleta nova aqui.
const STORE_COLORS = ['#97A624', '#D9B504', '#D9CB04', '#8C1414', '#0D9488', '#7C3AED', '#EA580C', '#0284C7', '#65A30D', '#6B7280']
function corDaUnidade(id: string): string {
  const idx = UNIDADES_GORJETA.findIndex(u => u.id === id)
  return idx >= 0 ? STORE_COLORS[idx % STORE_COLORS.length] : '#6B7280'
}

function brl(v: number | undefined | null): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

// Uma métrica secundária discreta — texto corrido, não uma caixa própria.
function Stat({ label, valor, cor }: { label: string; valor: string; cor?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-zinc-400">{label}</span>
      <span className="font-mono text-[15px] font-semibold" style={cor ? { color: cor } : undefined}>{valor}</span>
    </div>
  )
}

const inputCls = "h-9 px-3 rounded-lg border border-surface-border bg-surface-card text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-olive/30 focus:border-brand-olive"
const labelCls = "flex flex-col gap-1 text-xs text-zinc-500"
const btnPrimary = "h-9 px-4 rounded-lg bg-brand-olive text-white text-[13px] font-semibold hover:brightness-95 transition disabled:opacity-40 disabled:cursor-default"
const btnDark = "h-9 px-4 rounded-lg bg-brand-black text-white text-[13px] font-semibold hover:bg-zinc-800 transition disabled:opacity-40 disabled:cursor-default"
const btnGhost = "h-9 px-4 rounded-lg border border-surface-border bg-surface-card text-brand-black text-[13px] font-semibold hover:bg-surface-muted transition"

export default function GorjetaClientApp({
  allowedLojas, usuario, isAdmin,
}: { allowedLojas: UnitId[] | '*'; usuario: string; isAdmin: boolean }) {
  const unidadesPermitidas = useMemo(
    () => allowedLojas === '*' ? UNIDADES_GORJETA : UNIDADES_GORJETA.filter(u => allowedLojas.includes(u.id)),
    [allowedLojas]
  )

  const [unitId, setUnitId] = useState<UnitId | ''>(unidadesPermitidas[0]?.id ?? '')
  const periodoPadrao = useMemo(() => periodoAtual(), [])
  const [tipoFolha, setTipoFolha] = useState<TipoFolha>(periodoPadrao.tipo)
  const [inicio, setInicio] = useState(periodoPadrao.inicio)
  const [fim, setFim] = useState(periodoPadrao.fim)

  const { porUnidade, carregar } = useGorjeta()
  const estado = unitId ? porUnidade[unitId] : undefined

  const [ativos, setAtivos] = useState<Ativo[]>([])
  // Guarda o ATIVOS_GERAL lido (todas as unidades juntas) — ao trocar de
  // unidade, só refiltra, sem precisar reimportar o arquivo.
  const [ativosGeralRaw, setAtivosGeralRaw] = useState<AtivosGeralParsed | null>(null)
  // Presença é um arquivo POR unidade (cada Ponto já sai filtrado de 1
  // unidade só) — guarda um por unidade, pra lembrar ao trocar e ao exportar
  // várias de uma vez.
  const [presPorUnidade, setPresPorUnidade] = useState<Record<string, { pres: Presenca; presImported: boolean; nomeArquivo: string }>>({})
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erroImport, setErroImport] = useState<string | null>(null)
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set())
  const [exportando, setExportando] = useState(false)
  const [aba, setAba] = useState<'unidade' | 'geral'>('unidade')
  const [carregandoGeral, setCarregandoGeral] = useState(false)

  const pres = unitId ? (presPorUnidade[unitId]?.pres ?? {}) : {}
  const presImported = unitId ? (presPorUnidade[unitId]?.presImported ?? false) : false

  // Histórico só em memória por enquanto (persistência em Supabase é a
  // próxima fatia) — dura a sessão da página, some ao recarregar.
  const [historicoPorUnidade, setHistoricoPorUnidade] = useState<Record<string, HistoricoEntry[]>>({})

  const ativosFileRef = useRef<HTMLInputElement>(null)
  const presFileRef = useRef<HTMLInputElement>(null)

  // Carrega automaticamente ao trocar de unidade ou período
  useEffect(() => {
    if (!unitId) return
    carregar(unitId, inicio, fim).catch(() => {})
    setMensagem(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, inicio, fim])

  // Re-filtra os Ativos pela Filial da unidade atual sempre que trocar de
  // unidade — sem precisar reimportar o arquivo, já que ele tem todas juntas.
  useEffect(() => {
    if (!ativosGeralRaw || !unitId) { if (!ativosGeralRaw) setAtivos([]); return }
    const filial = FILIAL_PAGAMENTO[unitId]
    const { ativos: filtrados, totalNoArquivo, funcoesNaoReconhecidas } = filtrarAtivosPorFilial(ativosGeralRaw, filial)
    setAtivos(filtrados)
    let msg = `✓ ${filtrados.length} colaborador(es) desta unidade (de ${totalNoArquivo} no arquivo todo).`
    if (funcoesNaoReconhecidas.length) msg += ` ⚠️ Funções não reconhecidas (0 pontos): ${funcoesNaoReconhecidas.join(' · ')}.`
    setMensagem(msg)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, ativosGeralRaw])

  const zig = estado?.zig ?? []
  const rank = estado?.rank ?? []

  // Calcula uma unidade qualquer a partir do que já está carregado (não
  // busca da Zig sozinho — quem chama decide se precisa buscar antes).
  function computarUnidade(u: UnitId): ComputeResult | null {
    if (!ativosGeralRaw) return null
    const dadosZig = porUnidade[u]
    if (!dadosZig || !dadosZig.zig.length) return null
    const filial = FILIAL_PAGAMENTO[u]
    const { ativos: ativosU } = filtrarAtivosPorFilial(ativosGeralRaw, filial)
    if (!ativosU.length) return null
    const presU = presPorUnidade[u]?.pres ?? {}
    const presImportedU = presPorUnidade[u]?.presImported ?? false
    const historicoU = historicoPorUnidade[u] ?? []
    const ultimoAdiantamentoU = historicoU.find(h => h.tipo === 'adiantamento') ?? null
    return aplicarDescontoAdiantamento(compute(ativosU, dadosZig.zig, dadosZig.rank, presU, presImportedU), tipoFolha, ultimoAdiantamentoU)
  }

  // Ao abrir a Visão Geral, busca da Zig quem ainda não tiver sido carregado.
  useEffect(() => {
    if (aba !== 'geral') return
    const faltando = unidadesPermitidas.filter(u => !porUnidade[u.id]?.zig.length)
    if (!faltando.length) return
    setCarregandoGeral(true)
    ;(async () => {
      for (const u of faltando) { try { await carregar(u.id, inicio, fim) } catch { /* segue */ } }
      setCarregandoGeral(false)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, inicio, fim])

  const C: ComputeResult | null = useMemo(() => {
    if (!ativos.length && !zig.length) return null
    const base = compute(ativos, zig, rank, pres, presImported)
    const historico = unitId ? (historicoPorUnidade[unitId] ?? []) : []
    const ultimoAdiantamento = historico.find(h => h.tipo === 'adiantamento') ?? null
    return aplicarDescontoAdiantamento(base, tipoFolha, ultimoAdiantamento)
  }, [ativos, zig, rank, pres, presImported, tipoFolha, historicoPorUnidade, unitId])

  async function onImportAtivos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setErroImport(null)
    try {
      const parsed = await lerAtivosGeral(file)
      setAtivosGeralRaw(parsed) // o useEffect [unitId, ativosGeralRaw] já refiltra e seta a mensagem
    } catch (err: any) { setErroImport(err.message) }
    e.target.value = ''
  }

  async function onImportPres(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !unitId) return
    setErroImport(null)
    try {
      const zigDatesBR = new Set(zig.map(z => z.data))
      const { pres: novaPres, ativosNovos, diasCasados, diasNoArquivo } = await parsePresencaXlsx(file, ativos, zigDatesBR)
      setPresPorUnidade(prev => ({ ...prev, [unitId]: { pres: novaPres, presImported: true, nomeArquivo: file.name } }))
      if (ativosNovos.length) setAtivos(prev => [...prev, ...ativosNovos])
      let msg = `✓ Presença importada (${file.name}). Dias casados com a Gorjeta: ${diasCasados} de ${diasNoArquivo}.`
      if (ativosNovos.length) msg += ` ${ativosNovos.length} colaborador(es) novo(s) criado(s) a partir do nome.`
      if (diasCasados < diasNoArquivo) msg += ' ⚠️ Algumas datas do arquivo não existem na Gorjeta carregada.'
      setMensagem(msg)
    } catch (err: any) { setErroImport(err.message) }
    e.target.value = ''
  }

  function fecharQuinzena() {
    if (!C || !unitId) return
    if (!confirm(`Fechar a folha ${tipoFolha === 'mensal' ? 'Mensal' : 'Adiantamento'} de ${inicio} a ${fim}?`)) return
    const entry = construirHistoricoEntry(C, tipoFolha, `${inicio} a ${fim}`, usuario)
    setHistoricoPorUnidade(prev => {
      const atual = prev[unitId] ?? []
      const novo = [entry, ...atual].slice(0, 4)
      return { ...prev, [unitId]: novo }
    })
    setMensagem(`✓ Quinzena fechada (em memória — ainda não persistido no banco). Distribuído: ${brl(entry.distribuido)}.`)
  }

  // Gera e baixa o .xlsx de pagamento de UMA unidade já calculada.
  // Devolve false se não tinha nada a pagar (pra quem chama poder avisar/pular).
  function gerarXlsxPagamento(unitIdAlvo: UnitId, C: ComputeResult): boolean {
    const filial = FILIAL_PAGAMENTO[unitIdAlvo]
    const verba = C.tipoFolha === 'mensal' ? 139 : 169
    const nomeAba = C.tipoFolha === 'mensal' ? 'IMP_GORJ_M' : 'IMP_ADI'
    const colGorj = C.tipoFolha === 'mensal' ? 'GORJETA MENSAL' : 'GORJETA ADI'
    const aoa: (string | number)[][] = [['Filial', 'Matricula', 'VERBA', colGorj]]
    Object.values(C.res).forEach(r => {
      const val = C.tipoFolha === 'mensal' && r.pagarLiquido != null ? r.pagarLiquido : r.pagar
      if (val > 0.005) aoa.push([filial, r.mat, verba, Number(val.toFixed(2))])
    })
    if (aoa.length === 1) return false
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 6.71 }, { wch: 8.43 }, { wch: 3.71 }, { wch: 12.71 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, nomeAba)
    const hoje = new Date()
    const stamp = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`
    XLSX.writeFile(wb, `${nomeAba}_Filial_${filial}_${stamp}.xlsx`)
    return true
  }

  function exportarPagamento() {
    if (!C || !unitId) return
    if (!gerarXlsxPagamento(unitId, C)) alert('Nenhum valor a pagar para exportar.')
  }

  // Exporta várias unidades de uma vez — busca na Zig quem ainda não tiver
  // sido carregado, usa o Ativos (refiltrado pela Filial de cada uma) e a
  // Presença já guardada daquela unidade (se tiver).
  async function exportarVarias(ids: string[]) {
    if (!ativosGeralRaw) { alert('Importe o arquivo de Ativos primeiro.'); return }
    setExportando(true)
    let geradas = 0, puladas: string[] = []
    try {
      for (const id of ids) {
        const u = id as UnitId
        let dadosZig = porUnidade[u]
        if (!dadosZig || (!dadosZig.zig.length && !dadosZig.loading)) {
          try { await carregar(u, inicio, fim) } catch { /* segue mesmo se falhar, vai pular abaixo */ }
        }
        const zigU = porUnidade[u]?.zig ?? []
        const rankU = porUnidade[u]?.rank ?? []
        const filial = FILIAL_PAGAMENTO[u]
        const { ativos: ativosU } = filtrarAtivosPorFilial(ativosGeralRaw, filial)
        if (!ativosU.length || !zigU.length) { puladas.push(u); continue }
        const presU = presPorUnidade[u]?.pres ?? {}
        const presImportedU = presPorUnidade[u]?.presImported ?? false
        const historicoU = historicoPorUnidade[u] ?? []
        const ultimoAdiantamentoU = historicoU.find(h => h.tipo === 'adiantamento') ?? null
        const CU = aplicarDescontoAdiantamento(compute(ativosU, zigU, rankU, presU, presImportedU), tipoFolha, ultimoAdiantamentoU)
        if (gerarXlsxPagamento(u, CU)) geradas++
        else puladas.push(u)
        await new Promise(res => setTimeout(res, 300)) // pequena folga entre downloads
      }
    } finally {
      setExportando(false)
    }
    let msg = `✓ ${geradas} planilha(s) exportada(s).`
    if (puladas.length) msg += ` ⚠️ Puladas (sem Ativos ou sem Gorjeta carregada): ${puladas.map(id => UNIDADES_GORJETA.find(u => u.id === id)?.label ?? id).join(' · ')}.`
    setMensagem(msg)
  }

  function toggleSelecionada(id: string) {
    setSelecionadas(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const unidadeAtual = UNIDADES_GORJETA.find(u => u.id === unitId)
  const corAtual = unitId ? corDaUnidade(unitId) : '#97A624'
  const rows = C ? Object.values(C.res).sort((a, b) => (b.pagar + b.ferias + b.resc) - (a.pagar + a.ferias + a.resc)) : []
  const semMatch = C ? Object.values(ativos).filter(a => /^GARCOM|^GARCONETE/i.test(a.funcao) && !C.matched.some(m => m.a.mat === a.mat)) : []
  const heroValor = C ? (C.tipoFolha === 'mensal' ? Object.values(C.res).reduce((s, r) => s + (r.pagarLiquido ?? r.pagar), 0) : C.distribTot) : 0

  return (
    <div className="max-w-5xl mx-auto px-5 py-7 pb-16 bg-surface-base min-h-screen animate-fade-in">
      <h1 className="font-display text-[26px] font-semibold text-brand-black mb-1">
        Gorjeta{aba === 'unidade' ? <> — <span style={{ color: corAtual }}>{unidadeAtual?.label ?? 'selecione a unidade'}</span></> : ' — Visão Geral'}
      </h1>
      <p className="text-[13px] text-zinc-500 mb-6">
        33% retenção · 67% distribuído entre Salão e Retaguarda — Adiantamento (25→10) e Mensal (11→24)
      </p>

      <div className="flex gap-1 mb-6 border-b border-surface-border">
        {(['unidade', 'geral'] as const).map(a => (
          <button key={a} onClick={() => setAba(a)}
            className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${aba === a ? 'bg-surface-card border border-b-0 border-surface-border text-brand-black' : 'text-zinc-400 hover:text-zinc-600'}`}
            style={{ marginBottom: -1 }}>
            {a === 'unidade' ? 'Por unidade' : '📊 Visão Geral (todas as casas)'}
          </button>
        ))}
      </div>

      {aba === 'geral' ? (
        <div>
          {carregandoGeral && <div className="text-[13px] text-zinc-400 mb-4">Carregando as unidades que ainda faltam...</div>}
          {!ativosGeralRaw && (
            <div className="text-[13px] text-amber-800 bg-amber-50 px-4 py-2.5 rounded-lg mb-4">
              ⚠️ Importe o arquivo de Ativos (em qualquer unidade, na aba "Por unidade") pra Visão Geral conseguir calcular.
            </div>
          )}
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
            {unidadesPermitidas.map(u => {
              const CU = computarUnidade(u.id)
              const cor = corDaUnidade(u.id)
              const liquido = CU ? Object.values(CU.res).reduce((s, r) => s + (r.pagarLiquido ?? r.pagar), 0) : 0
              const fechada = (historicoPorUnidade[u.id] ?? []).some(h => h.tipo === tipoFolha)
              return (
                <button key={u.id} onClick={() => { setUnitId(u.id); setAba('unidade') }}
                  className="bg-surface-card border border-surface-border rounded-2xl text-left shadow-card hover:shadow-card-hover transition-shadow"
                  style={{ borderLeft: `4px solid ${cor}`, padding: '14px 16px' }}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">{u.label}</span>
                    {fechada && <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-surface-muted text-zinc-500">fechada</span>}
                  </div>
                  {CU ? (
                    <>
                      <div className="font-mono text-[19px] font-bold" style={{ color: cor }}>{brl(tipoFolha === 'mensal' ? liquido : CU.distribuido)}</div>
                      <div className="text-[11px] text-zinc-400 mt-0.5">
                        bruto {brl(CU.brutoTot)} · {Object.keys(CU.res).length} colab.{CU.sobra > 0.005 ? ` · sobra ${brl(CU.sobra)}` : ''}
                      </div>
                    </>
                  ) : (
                    <div className="text-[12.5px] text-zinc-300">
                      {!porUnidade[u.id]?.zig.length ? 'carregando...' : 'sem Ativos desta unidade no arquivo'}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
      <>
      {/* Seletores */}
      <div className="flex gap-3 flex-wrap items-end mb-6">
        <label className={labelCls}>Unidade
          <select value={unitId} onChange={e => setUnitId(e.target.value as UnitId)} className={inputCls}>
            {unidadesPermitidas.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label className={labelCls}>Folha
          <select value={tipoFolha} onChange={e => setTipoFolha(e.target.value as TipoFolha)} className={inputCls}>
            <option value="adiantamento">Adiantamento (25→10)</option>
            <option value="mensal">Mensal (11→24)</option>
          </select>
        </label>
        <label className={labelCls}>Início
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)} className={inputCls} />
        </label>
        <label className={labelCls}>Fim
          <input type="date" value={fim} onChange={e => setFim(e.target.value)} className={inputCls} />
        </label>
        <button onClick={() => unitId && carregar(unitId, inicio, fim)} className={btnPrimary}>🔄 Atualizar da Zig</button>
      </div>

      {estado?.loading && <div className="text-[13px] text-zinc-400 mb-3">Carregando Gorjeta e Ranking da Zig...</div>}
      {estado?.erro && <div className="text-[13px] text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-3">⚠️ {estado.erro}</div>}

      {/* Importações */}
      <div className="flex gap-3.5 flex-wrap mb-5">
        <div className="flex-1 min-w-[260px] border border-dashed border-surface-border rounded-xl p-3.5 bg-surface-card">
          <div className="text-[13px] font-semibold mb-1.5">Ativos (ATIVOS_GERAL)</div>
          <div className="text-[11.5px] text-zinc-400 mb-2">Filtra sozinho pela Filial desta unidade ({FILIAL_PAGAMENTO[unitId as UnitId] || '—'}).</div>
          <input ref={ativosFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImportAtivos} className="text-[12.5px]" />
        </div>
        <div className="flex-1 min-w-[260px] border border-dashed border-surface-border rounded-xl p-3.5 bg-surface-card">
          <div className="text-[13px] font-semibold mb-1.5">Presença (Ponto TOTVS)</div>
          <div className="text-[11.5px] text-zinc-400 mb-2">Aceita pivot (Nome × Data) ou o formato comprido (Nome, Dia, Entrada 1) — casa por nome com os Ativos.</div>
          <input ref={presFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImportPres} className="text-[12.5px]" />
        </div>
      </div>

      {mensagem && <div className="text-[12.5px] text-emerald-800 bg-emerald-50 px-3 py-2 rounded-lg mb-3">{mensagem}</div>}
      {erroImport && <div className="text-[12.5px] text-red-700 bg-red-50 px-3 py-2 rounded-lg mb-3">⚠️ {erroImport}</div>}

      {/* Export de várias unidades de uma vez */}
      <div className="border border-surface-border bg-surface-card rounded-xl p-3.5 mb-6">
        <div className="text-[13px] font-semibold mb-2">Exportar várias unidades de uma vez</div>
        <div className="text-[11.5px] text-zinc-400 mb-2.5">
          Usa o mesmo Ativos (filtrado pela Filial de cada uma) e a Presença já importada pra cada unidade — busca da Zig sozinho quem ainda não tiver sido carregado.
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-2.5">
          <label className="text-[12.5px] flex items-center gap-1.5">
            <input type="checkbox"
              checked={selecionadas.size === unidadesPermitidas.length}
              onChange={e => setSelecionadas(e.target.checked ? new Set(unidadesPermitidas.map(u => u.id)) : new Set())} />
            <b>Selecionar todas</b>
          </label>
          {unidadesPermitidas.map(u => (
            <label key={u.id} className="text-[12.5px] flex items-center gap-1.5">
              <input type="checkbox" checked={selecionadas.has(u.id)} onChange={() => toggleSelecionada(u.id)} />
              {u.label}
              {presPorUnidade[u.id]?.presImported && <span title="Presença já importada">📋</span>}
            </label>
          ))}
        </div>
        <button disabled={exportando || !selecionadas.size} onClick={() => exportarVarias([...selecionadas])} className={btnDark}>
          {exportando ? 'Exportando...' : `⬇️ Exportar ${selecionadas.size || ''} unidade(s) selecionada(s)`}
        </button>
      </div>

      {C && (
        <>
          {/* Hero: o número que importa, em destaque — o resto vira stats discretos ao lado */}
          <div className="bg-surface-card border border-surface-border rounded-2xl shadow-card p-5 mb-5" style={{ borderTop: `3px solid ${corAtual}` }}>
            <div className="flex flex-wrap items-start justify-between gap-6">
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">
                  {C.tipoFolha === 'mensal' ? 'Líquido a pagar · Mensal' : 'A distribuir · 67%'}
                </span>
                <div className="font-mono text-[32px] font-bold leading-tight" style={{ color: corAtual }}>{brl(heroValor)}</div>
                {C.tipoFolha === 'mensal' && (
                  <div className="text-[12px] text-zinc-400 mt-0.5">
                    apurado do mês − {brl(Object.values(C.res).reduce((s, r) => s + (r.descontoAdiant || 0), 0))} já pago no Adiantamento
                    {!C.adiantRef && <span className="text-amber-700"> (nenhum Adiantamento fechado ainda)</span>}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-x-7 gap-y-3">
                <Stat label={`Gorjeta bruta · ${C.days} dias`} valor={brl(C.brutoTot)} />
                <Stat label="Retenção casa · 33%" valor={brl(C.retidoTot)} />
                {C.sobra > 0.005 && <Stat label="Sobra (não distribuída)" valor={brl(C.sobra)} cor="#B45309" />}
              </div>
            </div>

            {/* Proporção Salão × Retaguarda — uma barra, não duas caixas */}
            <div className="mt-5 pt-4 border-t border-surface-border">
              <div className="flex justify-between text-[11px] text-zinc-400 mb-1.5">
                <span>Bolo Salão · {brl(C.poolSalaoTot)} ({(C.pctSalao * 100).toFixed(1)}% · {C.ptsSalao} pts)</span>
                <span>Bolo Retaguarda · {brl(C.poolRetagTot)} ({(C.pctRetag * 100).toFixed(1)}% · {C.ptsRetag} pts)</span>
              </div>
              <div className="flex h-2 rounded-full overflow-hidden bg-surface-muted">
                <div style={{ width: `${C.pctSalao * 100}%`, background: corAtual }} />
                <div style={{ width: `${C.pctRetag * 100}%`, background: '#D9D9D2' }} />
              </div>
            </div>
          </div>

          {semMatch.length > 0 && (
            <div className="text-[12.5px] text-amber-800 bg-amber-50 px-3 py-2 rounded-lg mb-4">
              ⚠️ {semMatch.length} garçom(ns) não casaram com o Ranking (nem por CPF, nem por nome): {semMatch.map(a => a.nome.split(' ').slice(0, 2).join(' ')).join(' · ')}
            </div>
          )}

          <div className="flex gap-2.5 mb-4">
            <button onClick={fecharQuinzena} className={btnDark}>✓ Fechar quinzena</button>
            <button onClick={exportarPagamento} className={btnGhost}>⬇️ Planilha de pagamento (.xlsx)</button>
          </div>

          <div className="bg-surface-card border border-surface-border rounded-xl shadow-card overflow-hidden">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-surface-muted text-left">
                  <th className="px-3 py-2.5 font-semibold">Colaborador</th>
                  <th className="px-3 py-2.5 font-semibold">Função</th>
                  <th className="px-3 py-2.5 font-semibold">Setor</th>
                  <th className="px-3 py-2.5 font-semibold text-right">A pagar</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Férias</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Rescisão</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.mat} className="border-t border-surface-border hover:bg-surface-muted/50 transition-colors">
                    <td className="px-3 py-2">{r.nome}{r.hasR ? ' 🔴' : ''}</td>
                    <td className="px-3 py-2 text-zinc-400 text-xs">{r.funcao}</td>
                    <td className="px-3 py-2">{r.setor}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {brl(r.pagar)}
                      {C.tipoFolha === 'mensal' && r.pagarLiquido != null && (
                        <div className="text-[10.5px] text-zinc-400">líq. {brl(r.pagarLiquido)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-amber-700">{r.ferias > 0 ? brl(r.ferias) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono text-red-700">{r.resc > 0 ? brl(r.resc) : '—'}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{brl(r.pagar + r.ferias + r.resc)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={7} className="p-6 text-center text-zinc-400">Importe os Ativos para ver o relatório.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!C && !estado?.loading && (
        <div className="p-10 text-center text-zinc-400 text-[13.5px]">
          Selecione a unidade e importe os Ativos para começar.
        </div>
      )}
      </>
      )}
    </div>
  )
}
