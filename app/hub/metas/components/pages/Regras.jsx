// app/hub/metas/components/pages/Regras.jsx
// Aba "Regras" — quem tem a permissão 'metas-regras' (ou admin) edita
// indicadores, pesos, metas, casas críticas, carteiras dos regionais e a
// regra de bônus das críticas, sem mexer em código.
//
// Cada vigência vale do mês de início até a próxima. Vigências que já
// começaram ficam protegidas (só admin altera): para mudar daqui pra
// frente, cria-se uma vigência nova a partir do mês atual ou futuro.

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Save, Lock, Copy, AlertTriangle, Check } from 'lucide-react'
import { UNITS, labelForUnit } from '@/lib/units'
import { validarVigencia, gerarChave, totalPontosPossiveis } from '@/lib/metas/config'
import { useMetasData } from '../../hooks/useMetasData'

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const UNIDADES = UNITS.filter((u) => u.id !== 'holding')
const CORES = ['#97A624', '#0284C7', '#7C3AED', '#DB2777', '#EA580C', '#0F766E', '#B45309']

function rotuloMes(anoMes) {
  if (!anoMes || anoMes < '2001-01') return 'início'
  const [a, m] = anoMes.split('-').map(Number)
  return `${MESES[m - 1]}/${String(a).slice(2)}`
}

function proximoMes(anoMes) {
  const [a, m] = anoMes.split('-').map(Number)
  return m === 12 ? `${a + 1}-01` : `${a}-${String(m + 1).padStart(2, '0')}`
}

const clonar = (o) => JSON.parse(JSON.stringify(o))

// ---- opções em linguagem simples ------------------------------------
const ORIGENS_REAL = [
  { id: 'manual', label: 'Lançado no Input Manual', real: { tipo: 'manual' } },
  { id: 'fat_total', label: 'Faturamento total (automático)', real: { tipo: 'faturamento' } },
  { id: 'fat_casa', label: 'Faturamento salão (automático)', real: { tipo: 'faturamento', canal: 'CASA' } },
  { id: 'fat_delivery', label: 'Faturamento delivery (automático)', real: { tipo: 'faturamento', canal: 'DELIVERY' } },
  { id: 'perdas', label: 'Desconto + estorno + desperdício (automático)', real: { tipo: 'perdas' } },
]

function origemRealId(real) {
  if (real.tipo === 'faturamento') return real.canal === 'CASA' ? 'fat_casa' : real.canal === 'DELIVERY' ? 'fat_delivery' : 'fat_total'
  return real.tipo
}

const ORIGENS_META = [
  { id: 'manual', label: 'Lançada no Input Manual (por casa)' },
  { id: 'fixa', label: 'Fixa, igual para todas as casas' },
  { id: 'reducaoMesAnterior', label: 'Redução vs mês anterior' },
  { id: 'faturamento', label: 'Metas do Faturamento (mesmo canal do realizado)' },
]

// ---- pedaços de formulário -------------------------------------------
const inputCls = 'w-full rounded-md border border-surface-border bg-white px-2 py-1.5 text-sm disabled:bg-surface-muted disabled:text-zinc-500'
const labelCls = 'block text-[11px] font-medium text-zinc-500 mb-1'

function Secao({ titulo, descricao, children, extra }) {
  return (
    <section className="bg-white border border-surface-border rounded-2xl shadow-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-brand-black">{titulo}</h3>
          {descricao && <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">{descricao}</p>}
        </div>
        {extra}
      </div>
      {children}
    </section>
  )
}

function Chip({ ativo, onClick, children, disabled, cor = '#18181B', title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`text-xs px-2.5 py-1.5 rounded-lg border-2 font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        ativo ? 'text-white' : 'bg-white text-zinc-600 border-surface-border hover:border-zinc-300'
      }`}
      style={ativo ? { backgroundColor: cor, borderColor: cor } : undefined}
    >
      {children}
    </button>
  )
}

// ---- indicador ---------------------------------------------------------
function IndicadorCard({ ind, onChange, onRemover, travado }) {
  const legado = ind.real.tipo === 'bandas'
  const set = (patch) => onChange({ ...ind, ...patch })
  const pct = ind.formato === 'pct'

  function mudarOrigemReal(id) {
    const op = ORIGENS_REAL.find((o) => o.id === id)
    const patch = { real: clonar(op.real) }
    if (id.startsWith('fat_') || id === 'perdas') {
      patch.formato = 'moeda'
      patch.agregacao = 'soma'
    }
    if (id === 'fat_total' || id === 'fat_casa' || id === 'fat_delivery') patch.direcao = 'maior'
    if (id === 'perdas') patch.direcao = 'menor'
    if (ind.meta.tipo === 'faturamento') {
      // meta do Faturamento acompanha o canal do realizado; se o realizado deixou de ser faturamento, volta pra manual
      patch.meta = id.startsWith('fat_') ? (op.real.canal ? { tipo: 'faturamento', canal: op.real.canal } : { tipo: 'faturamento' }) : { tipo: 'manual' }
    }
    set(patch)
  }

  function mudarOrigemMeta(id) {
    if (id === 'fixa') set({ meta: { tipo: 'fixa', valor: ind.meta.valor ?? 0 } })
    else if (id === 'reducaoMesAnterior') set({ meta: { tipo: 'reducaoMesAnterior', pct: ind.meta.pct ?? 0.1 } })
    else if (id === 'faturamento') set({ meta: ind.real.canal ? { tipo: 'faturamento', canal: ind.real.canal } : { tipo: 'faturamento' } })
    else set({ meta: { tipo: id } })
  }

  function mudarFormato(formato) {
    set({ formato, agregacao: formato === 'moeda' ? 'soma' : 'media' })
  }

  if (legado) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-300 p-3 text-xs text-zinc-500 flex items-center justify-between gap-2">
        <span><b className="text-zinc-700">{ind.label}</b> · {ind.peso} pts · indicador antigo (arrecadação − custo do artista), não editável aqui.</span>
        {!travado && <button type="button" onClick={onRemover} className="text-rose-600 hover:text-rose-800"><Trash2 size={14} /></button>}
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-surface-border p-4 space-y-3">
      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-5">
          <label className={labelCls}>Nome</label>
          <input
            className={inputCls}
            value={ind.label}
            disabled={travado}
            onChange={(e) => {
              const label = e.target.value
              set(ind._novo ? { label, key: gerarChave(label) } : { label })
            }}
          />
          <div className="text-[10px] text-zinc-400 mt-0.5">chave: {ind.key}{ind._novo ? ' (definida ao salvar)' : ''}</div>
        </div>
        <div className="col-span-6 sm:col-span-3">
          <label className={labelCls}>Nome curto (coluna)</label>
          <input className={inputCls} value={ind.curto} maxLength={12} disabled={travado} onChange={(e) => set({ curto: e.target.value })} />
        </div>
        <div className="col-span-4 sm:col-span-2">
          <label className={labelCls}>Pontos</label>
          <input className={inputCls} type="number" min={0} max={100} value={ind.peso} disabled={travado} onChange={(e) => set({ peso: Number(e.target.value) })} />
        </div>
        <div className="col-span-2 sm:col-span-2 flex items-end justify-end">
          {!travado && (
            <button type="button" onClick={onRemover} className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 pb-2">
              <Trash2 size={14} /> Remover
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-4">
          <label className={labelCls}>De onde vem o realizado</label>
          <select className={inputCls} value={origemRealId(ind.real)} disabled={travado} onChange={(e) => mudarOrigemReal(e.target.value)}>
            {ORIGENS_REAL.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div className="col-span-6 sm:col-span-2">
          <label className={labelCls}>Formato</label>
          <select className={inputCls} value={ind.formato} disabled={travado || ind.real.tipo !== 'manual'} onChange={(e) => mudarFormato(e.target.value)}>
            <option value="pct">%</option>
            <option value="moeda">R$</option>
            <option value="num">Número</option>
          </select>
        </div>
        <div className="col-span-6 sm:col-span-3">
          <label className={labelCls}>Bate a meta quando o real é</label>
          <select className={inputCls} value={ind.direcao} disabled={travado} onChange={(e) => set({ direcao: e.target.value })}>
            <option value="menor">menor ou igual à meta (custo)</option>
            <option value="maior">maior ou igual à meta (receita)</option>
          </select>
        </div>
        <div className="col-span-12 sm:col-span-3">
          <label className={labelCls}>Total da carteira do regional</label>
          <select className={inputCls} value={ind.agregacao} disabled={travado} onChange={(e) => set({ agregacao: e.target.value })}>
            <option value="media">Média das casas</option>
            <option value="soma">Soma das casas</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        <div className="col-span-12 sm:col-span-4">
          <label className={labelCls}>Meta</label>
          <select className={inputCls} value={ind.meta.tipo === 'nenhuma' ? 'manual' : ind.meta.tipo} disabled={travado} onChange={(e) => mudarOrigemMeta(e.target.value)}>
            {ORIGENS_META.filter((o) => o.id !== 'faturamento' || ind.real.tipo === 'faturamento').map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
        </div>
        {ind.meta.tipo === 'fixa' && (
          <div className="col-span-6 sm:col-span-2">
            <label className={labelCls}>Valor da meta {pct ? '(%)' : ''}</label>
            <input
              className={inputCls}
              type="number"
              step="any"
              disabled={travado}
              value={pct ? +(ind.meta.valor * 100).toFixed(4) : ind.meta.valor}
              onChange={(e) => set({ meta: { tipo: 'fixa', valor: pct ? Number(e.target.value) / 100 : Number(e.target.value) } })}
            />
          </div>
        )}
        {ind.meta.tipo === 'reducaoMesAnterior' && (
          <div className="col-span-6 sm:col-span-2">
            <label className={labelCls}>Reduzir quanto (%)</label>
            <input
              className={inputCls}
              type="number"
              step="any"
              min={0}
              max={99}
              disabled={travado}
              value={+(ind.meta.pct * 100).toFixed(4)}
              onChange={(e) => set({ meta: { tipo: 'reducaoMesAnterior', pct: Number(e.target.value) / 100 } })}
            />
          </div>
        )}
        <div className={`col-span-12 ${ind.meta.tipo === 'fixa' || ind.meta.tipo === 'reducaoMesAnterior' ? 'sm:col-span-6' : 'sm:col-span-8'}`}>
          <label className={labelCls}>Como é calculado (aparece na tela)</label>
          <input className={inputCls} value={ind.descricao || ''} disabled={travado} onChange={(e) => set({ descricao: e.target.value })} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Aviso "a definir" (deixe vazio quando a regra estiver validada)</label>
        <input className={inputCls} value={ind.pendente || ''} disabled={travado} onChange={(e) => set({ pendente: e.target.value || undefined })} />
      </div>
    </div>
  )
}

// ---- página ------------------------------------------------------------
function novoIndicador(n) {
  return {
    key: `novo_indicador_${n}`,
    _novo: true,
    label: '',
    curto: '',
    formato: 'pct',
    peso: 0,
    direcao: 'menor',
    agregacao: 'media',
    real: { tipo: 'manual' },
    meta: { tipo: 'manual' },
  }
}

function limparParaSalvar(v) {
  const c = clonar(v)
  delete c.atualizadoEm
  delete c.atualizadoPor
  c.indicadores = c.indicadores.map((i) => {
    const { _novo, ...resto } = i
    if (!resto.curto?.trim()) resto.curto = resto.label.slice(0, 12)
    if (!resto.descricao) delete resto.descricao
    if (!resto.pendente) delete resto.pendente
    return resto
  })
  c.regionais = c.regionais.map(({ _novo, ...r }) => r)
  return c
}

export default function Regras() {
  const { vigencias, isAdmin, mesAtualServidor, recarregarRegras, avisoRegras } = useMetasData()
  const mesAtual = mesAtualServidor
  const ordenadas = useMemo(() => [...vigencias].sort((a, b) => b.vigenteDesde.localeCompare(a.vigenteDesde)), [vigencias])
  const emVigor = useMemo(() => [...ordenadas].find((v) => v.vigenteDesde <= mesAtual) ?? ordenadas[ordenadas.length - 1], [ordenadas, mesAtual])

  const [selecionada, setSelecionada] = useState(null) // vigenteDesde original | 'nova'
  const [rascunho, setRascunho] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  useEffect(() => {
    if (selecionada == null && emVigor) abrir(emVigor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emVigor])

  function abrir(v) {
    setSelecionada(v.vigenteDesde)
    setRascunho(clonar(v))
    setMensagem(null)
  }

  function novaVigencia(base) {
    const inicio = base.vigenteDesde >= mesAtual ? proximoMes(base.vigenteDesde) : proximoMes(mesAtual)
    const c = clonar(base)
    c.vigenteDesde = inicio
    c.nome = `Regras a partir de ${rotuloMes(inicio)}`
    delete c.atualizadoEm
    delete c.atualizadoPor
    setSelecionada('nova')
    setRascunho(c)
    setMensagem(null)
  }

  const original = selecionada === 'nova' ? null : selecionada
  const travado = !!rascunho && !isAdmin && original != null && original < mesAtual
  const erros = useMemo(() => (rascunho ? validarVigencia(limparParaSalvar(rascunho)) : []), [rascunho])
  const somaPesos = rascunho ? totalPontosPossiveis(rascunho) : 0
  const unidadesUsadas = useMemo(() => {
    const m = {}
    rascunho?.regionais.forEach((r, idx) => r.unidades.forEach((u) => { m[u] = idx }))
    return m
  }, [rascunho])

  const setR = (patch) => setRascunho((r) => ({ ...r, ...patch }))

  async function salvar() {
    setSalvando(true)
    setMensagem(null)
    try {
      const vigencia = limparParaSalvar(rascunho)
      const res = await fetch('/api/metas/regras', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vigencia, vigenteDesdeOriginal: original }),
      }).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      await recarregarRegras()
      setSelecionada(vigencia.vigenteDesde)
      setRascunho(vigencia)
      setMensagem({ ok: true, texto: 'Regras salvas. O dashboard já usa a versão nova.' })
    } catch (e) {
      setMensagem({ ok: false, texto: e.message })
    } finally {
      setSalvando(false)
    }
  }

  async function excluir() {
    if (!original || !window.confirm(`Excluir a vigência "${rascunho.nome}"? Os meses dela passam a usar a vigência anterior.`)) return
    setSalvando(true)
    try {
      const res = await fetch(`/api/metas/regras?vigenteDesde=${encodeURIComponent(original)}`, { method: 'DELETE' }).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      await recarregarRegras()
      setSelecionada(null)
      setRascunho(null)
      setMensagem({ ok: true, texto: 'Vigência excluída.' })
    } catch (e) {
      setMensagem({ ok: false, texto: e.message })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
      {/* Lista de vigências */}
      <aside className="space-y-3">
        <div>
          <h1 className="text-lg font-semibold text-brand-black">Regras das metas</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Cada vigência vale do mês de início até a próxima. Para mudar algo daqui pra frente, crie uma vigência nova: os meses anteriores continuam com as regras deles.
          </p>
        </div>
        {avisoRegras && <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">{avisoRegras}</p>}
        <button
          type="button"
          onClick={() => emVigor && novaVigencia(emVigor)}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-brand-olive text-white text-sm font-semibold px-3 py-2"
        >
          <Plus size={15} /> Nova vigência
        </button>
        <div className="space-y-1.5">
          {selecionada === 'nova' && (
            <div className="rounded-lg border-2 border-brand-olive bg-white px-3 py-2 text-sm">
              <div className="font-medium text-brand-black">{rascunho?.nome || 'Nova vigência'}</div>
              <div className="text-[11px] text-zinc-500">não salva ainda</div>
            </div>
          )}
          {ordenadas.map((v) => {
            const status = v === emVigor ? 'em vigor' : v.vigenteDesde > mesAtual ? 'futura' : 'encerrada'
            const ativo = selecionada === v.vigenteDesde
            return (
              <button
                key={v.vigenteDesde}
                type="button"
                onClick={() => abrir(v)}
                className={`w-full text-left rounded-lg border-2 px-3 py-2 bg-white transition-colors ${ativo ? 'border-brand-black' : 'border-surface-border hover:border-zinc-300'}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-brand-black truncate">{v.nome}</span>
                  {v.vigenteDesde < mesAtual && !isAdmin && <Lock size={12} className="text-zinc-400 shrink-0" />}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-zinc-500">
                  <span>desde {rotuloMes(v.vigenteDesde)}</span>
                  <span className={`px-1.5 rounded ${status === 'em vigor' ? 'bg-emerald-100 text-emerald-800' : status === 'futura' ? 'bg-sky-100 text-sky-800' : 'bg-zinc-100 text-zinc-500'}`}>{status}</span>
                </div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* Editor */}
      {rascunho && (
        <div className="space-y-5 min-w-0">
          {travado && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <span className="flex items-center gap-2"><Lock size={15} /> Essa vigência já começou e está protegida, para não mudar resultados de meses passados.</span>
              <button type="button" onClick={() => novaVigencia(rascunho)} className="flex items-center gap-1.5 text-xs font-semibold rounded-lg bg-white border border-amber-300 px-3 py-1.5">
                <Copy size={13} /> Copiar para uma vigência nova
              </button>
            </div>
          )}

          <Secao titulo="Vigência">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className={labelCls}>Nome</label>
                <input className={inputCls} value={rascunho.nome} disabled={travado} onChange={(e) => setR({ nome: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Vale a partir de</label>
                <input
                  className={inputCls}
                  type="month"
                  value={rascunho.vigenteDesde < '2001-01' ? '' : rascunho.vigenteDesde}
                  min={isAdmin ? undefined : mesAtual}
                  disabled={travado}
                  onChange={(e) => setR({ vigenteDesde: e.target.value })}
                />
              </div>
            </div>
            {rascunho.atualizadoPor && (
              <p className="text-[11px] text-zinc-400 mt-2">
                Última alteração: {rascunho.atualizadoPor}
                {rascunho.atualizadoEm ? ` em ${new Date(rascunho.atualizadoEm).toLocaleString('pt-BR')}` : ''}
              </p>
            )}
          </Secao>

          <Secao
            titulo="Indicadores"
            descricao="O regional ganha os pontos do indicador quando o total da carteira dele bate a meta. Indicador novo com realizado lançado no Input Manual não precisa de programação."
            extra={
              <span className={`text-sm font-semibold tabular-nums ${somaPesos === 100 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {somaPesos} / 100 pts
              </span>
            }
          >
            <div className="space-y-3">
              {rascunho.indicadores.map((ind, idx) => (
                <IndicadorCard
                  key={idx}
                  ind={ind}
                  travado={travado}
                  onChange={(novo) => setR({ indicadores: rascunho.indicadores.map((x, i) => (i === idx ? novo : x)) })}
                  onRemover={() => setR({ indicadores: rascunho.indicadores.filter((_, i) => i !== idx) })}
                />
              ))}
            </div>
            {!travado && (
              <button
                type="button"
                onClick={() => setR({ indicadores: [...rascunho.indicadores, novoIndicador(rascunho.indicadores.length + 1)] })}
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-black border border-surface-border rounded-lg px-3 py-1.5 hover:bg-surface-muted"
              >
                <Plus size={13} /> Adicionar indicador
              </button>
            )}
          </Secao>

          <Secao titulo="Casas críticas" descricao="Aparecem marcadas no dashboard e no card do regional. Se a regra de bônus abaixo estiver ligada, elas travam o bônus do regional.">
            <div className="flex flex-wrap gap-2">
              {UNIDADES.map((u) => {
                const ativo = rascunho.unidadesCriticas.includes(u.id)
                return (
                  <Chip
                    key={u.id}
                    ativo={ativo}
                    cor="#B45309"
                    disabled={travado}
                    onClick={() =>
                      setR({ unidadesCriticas: ativo ? rascunho.unidadesCriticas.filter((x) => x !== u.id) : [...rascunho.unidadesCriticas, u.id] })
                    }
                  >
                    {u.label}
                  </Chip>
                )
              })}
            </div>
          </Secao>

          <Secao titulo="Regra de bônus das casas críticas">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input
                type="checkbox"
                disabled={travado}
                checked={!!rascunho.regraCriticas}
                onChange={(e) =>
                  setR({ regraCriticas: e.target.checked ? { tipo: 'todas_criticas', minimoPontos: 50, efeito: { tipo: 'zera' } } : null })
                }
              />
              Ligar: o regional só recebe o bônus cheio se todas as casas críticas da carteira dele atingirem um mínimo de pontos
            </label>
            {rascunho.regraCriticas && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <div>
                  <label className={labelCls}>Mínimo de pontos de cada crítica</label>
                  <input
                    className={inputCls}
                    type="number"
                    min={0}
                    max={100}
                    disabled={travado}
                    value={rascunho.regraCriticas.minimoPontos}
                    onChange={(e) => setR({ regraCriticas: { ...rascunho.regraCriticas, minimoPontos: Number(e.target.value) } })}
                  />
                </div>
                <div>
                  <label className={labelCls}>Se alguma crítica não atingir</label>
                  <select
                    className={inputCls}
                    disabled={travado}
                    value={rascunho.regraCriticas.efeito.tipo}
                    onChange={(e) =>
                      setR({ regraCriticas: { ...rascunho.regraCriticas, efeito: e.target.value === 'zera' ? { tipo: 'zera' } : { tipo: 'fator', fator: 0.5 } } })
                    }
                  >
                    <option value="zera">O regional zera os pontos</option>
                    <option value="fator">O regional perde uma parte dos pontos</option>
                  </select>
                </div>
                {rascunho.regraCriticas.efeito.tipo === 'fator' && (
                  <div>
                    <label className={labelCls}>Perde quanto (%)</label>
                    <input
                      className={inputCls}
                      type="number"
                      min={0}
                      max={100}
                      disabled={travado}
                      value={Math.round((1 - rascunho.regraCriticas.efeito.fator) * 100)}
                      onChange={(e) =>
                        setR({ regraCriticas: { ...rascunho.regraCriticas, efeito: { tipo: 'fator', fator: 1 - Number(e.target.value) / 100 } } })
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </Secao>

          <Secao titulo="Regionais e carteiras" descricao="Cada casa pode estar em um regional só. Casas fora de todas as carteiras aparecem como “Sem regional”.">
            <div className="space-y-3">
              {rascunho.regionais.map((r, idx) => {
                const setReg = (patch) => setR({ regionais: rascunho.regionais.map((x, i) => (i === idx ? { ...x, ...patch } : x)) })
                return (
                  <div key={idx} className="rounded-xl border border-surface-border p-3" style={{ borderLeft: `4px solid ${r.cor}` }}>
                    <div className="flex flex-wrap items-end gap-3 mb-3">
                      <div className="flex-1 min-w-[160px]">
                        <label className={labelCls}>Nome do regional</label>
                        <input
                          className={inputCls}
                          value={r.nome}
                          disabled={travado}
                          onChange={(e) => setReg(r._novo ? { nome: e.target.value, id: gerarChave(e.target.value) } : { nome: e.target.value })}
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Cor</label>
                        <div className="flex gap-1">
                          {CORES.map((c) => (
                            <button
                              key={c}
                              type="button"
                              disabled={travado}
                              onClick={() => setReg({ cor: c })}
                              className={`w-6 h-6 rounded-full border-2 ${r.cor === c ? 'border-brand-black' : 'border-white'}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      {!travado && (
                        <button
                          type="button"
                          onClick={() => setR({ regionais: rascunho.regionais.filter((_, i) => i !== idx) })}
                          className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1 pb-1.5"
                        >
                          <Trash2 size={14} /> Remover
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {UNIDADES.map((u) => {
                        const ativo = r.unidades.includes(u.id)
                        const outro = unidadesUsadas[u.id] != null && unidadesUsadas[u.id] !== idx
                        return (
                          <Chip
                            key={u.id}
                            ativo={ativo}
                            cor={r.cor}
                            disabled={travado || outro}
                            title={outro ? `Já está com ${rascunho.regionais[unidadesUsadas[u.id]].nome}` : undefined}
                            onClick={() => setReg({ unidades: ativo ? r.unidades.filter((x) => x !== u.id) : [...r.unidades, u.id] })}
                          >
                            {u.label}
                          </Chip>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
            {!travado && (
              <button
                type="button"
                onClick={() =>
                  setR({
                    regionais: [
                      ...rascunho.regionais,
                      { id: `regional_${rascunho.regionais.length + 1}`, _novo: true, nome: '', cor: CORES[rascunho.regionais.length % CORES.length], unidades: [] },
                    ],
                  })
                }
                className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-brand-black border border-surface-border rounded-lg px-3 py-1.5 hover:bg-surface-muted"
              >
                <Plus size={13} /> Adicionar regional
              </button>
            )}
            {(() => {
              const fora = UNIDADES.filter((u) => unidadesUsadas[u.id] == null).map((u) => labelForUnit(u.id))
              return fora.length ? <p className="text-[11px] text-zinc-400 mt-2">Sem regional: {fora.join(', ')}</p> : null
            })()}
          </Secao>

          {/* Rodapé */}
          {!travado && (
            <div className="sticky bottom-0 bg-surface-base/95 backdrop-blur border-t border-surface-border -mx-1 px-1 py-3 space-y-2">
              {erros.length > 0 && (
                <ul className="text-xs text-rose-700 space-y-0.5">
                  {erros.map((e) => (
                    <li key={e} className="flex items-start gap-1.5"><AlertTriangle size={12} className="mt-0.5 shrink-0" /> {e}</li>
                  ))}
                </ul>
              )}
              {mensagem && (
                <p className={`text-sm flex items-center gap-1.5 ${mensagem.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {mensagem.ok ? <Check size={14} /> : <AlertTriangle size={14} />} {mensagem.texto}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={salvar}
                  disabled={salvando || erros.length > 0}
                  className="flex items-center gap-1.5 rounded-lg bg-brand-olive text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
                >
                  <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar regras'}
                </button>
                <button
                  type="button"
                  onClick={() => (original ? abrir(vigencias.find((v) => v.vigenteDesde === original)) : emVigor && abrir(emVigor))}
                  className="text-sm text-zinc-600 px-3 py-2"
                >
                  Descartar alterações
                </button>
                {original && (isAdmin || original > mesAtual) && (
                  <button type="button" onClick={excluir} disabled={salvando} className="ml-auto flex items-center gap-1.5 text-sm text-rose-600 px-3 py-2">
                    <Trash2 size={14} /> Excluir vigência
                  </button>
                )}
              </div>
            </div>
          )}
          {travado && mensagem && <p className={`text-sm ${mensagem.ok ? 'text-emerald-700' : 'text-rose-700'}`}>{mensagem.texto}</p>}
        </div>
      )}
    </div>
  )
}
