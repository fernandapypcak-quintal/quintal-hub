// app/hub/faturamento/components/pages/MetasEditor.jsx
// Tela "Metas" do Faturamento — quem tem a permissão 'faturamento-metas'
// (admin do hub) preenche a meta de cada casa por mês, separada em salão e
// delivery. Ao salvar, grava NA PLANILHA do Google (a planilha continua sendo
// a fonte de verdade) via /api/faturamento/metas → QuintalFaturamentoMetas.gs.
// Total = salão + delivery, gravado na coluna "Meta" que o resto já usa.

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Save, Copy, AlertTriangle, Check, RefreshCw } from 'lucide-react'
import { UNITS } from '@/lib/units'
import { useMetas } from '../../hooks/useMetas'

const CASAS = UNITS.filter((u) => u.zigLabel).map((u) => ({ id: u.id, label: u.label, loja: u.zigLabel }))
const NOMES_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro']

const pad = (n) => String(n).padStart(2, '0')
function mesAtual() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`
}
function mesAnterior(am) {
  const [a, m] = am.split('-').map(Number)
  return m === 1 ? `${a - 1}-12` : `${a}-${pad(m - 1)}`
}
function nomeMes(am) {
  const [a, m] = am.split('-').map(Number)
  return `${NOMES_MES[m - 1]} de ${a}`
}

// "1.234.567,89" / "1234567.89" / "1234567" → número
function lerValor(txt) {
  const s = String(txt ?? '').trim().replace(/[R$\s]/g, '')
  if (!s) return null
  // vírgula = decimal (padrão BR). Sem vírgula, "980.000" ou "1.250.000" = milhar.
  const normal = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s
  const n = Number(normal)
  return Number.isFinite(n) ? n : NaN
}
const fmtBR = (n) => (n == null || Number.isNaN(n) ? '' : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
const fmtR = (n) => (n == null || Number.isNaN(n) ? '—' : 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 }))

function CampoValor({ valor, onChange, invalido }) {
  return (
    <input
      inputMode="decimal"
      value={valor}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => {
        const n = lerValor(valor)
        if (n != null && !Number.isNaN(n)) onChange(fmtBR(n))
      }}
      placeholder="0,00"
      className={`w-full rounded-lg border px-2.5 py-1.5 text-sm text-right tabular-nums bg-white ${
        invalido ? 'border-rose-400 bg-rose-50' : 'border-surface-border'
      }`}
    />
  )
}

export default function MetasEditor() {
  const { reloadFromSheets, savePeriodMetas, metas: metasCsv } = useMetas()
  const [anoMes, setAnoMes] = useState(mesAtual())
  const ano = anoMes.slice(0, 4)

  const [doAno, setDoAno] = useState([]) // linhas vindas da planilha (ano selecionado + anterior p/ janeiro)
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState(null)
  const [naoConfigurado, setNaoConfigurado] = useState(false)
  const [form, setForm] = useState({}) // loja -> { salao: '...', delivery: '...' }
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState(null)

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErroCarga(null)
    try {
      const anos = anoMes.endsWith('-01') ? [String(Number(ano) - 1), ano] : [ano]
      const respostas = await Promise.all(anos.map((a) => fetch(`/api/faturamento/metas?ano=${a}`, { cache: 'no-store' }).then((r) => r.json())))
      const comErro = respostas.find((r) => r.erro)
      if (comErro) {
        setNaoConfigurado(!!comErro.naoConfigurado)
        throw new Error(comErro.erro)
      }
      setNaoConfigurado(false)
      setDoAno(respostas.flatMap((r) => r.metas || []))
    } catch (e) {
      setErroCarga(e.message)
      setDoAno([])
    } finally {
      setCarregando(false)
    }
  }, [ano, anoMes])

  useEffect(() => { carregar() }, [carregar])

  // linha da planilha (ou, se a planilha não respondeu, o total vindo do CSV)
  const linhaDe = useCallback(
    (am, loja) => {
      const l = doAno.find((x) => x.Ano_Mes === am && x.Loja === loja)
      if (l) return l
      const total = metasCsv?.[am]?.[loja]
      return total != null ? { Ano_Mes: am, Loja: loja, Meta: total, Meta_Salao: null, Meta_Delivery: null } : null
    },
    [doAno, metasCsv]
  )

  // preenche o formulário quando muda o mês ou chegam os dados
  useEffect(() => {
    const novo = {}
    CASAS.forEach((c) => {
      const l = linhaDe(anoMes, c.loja)
      novo[c.loja] = {
        salao: l?.Meta_Salao != null ? fmtBR(l.Meta_Salao) : '',
        delivery: l?.Meta_Delivery != null ? fmtBR(l.Meta_Delivery) : '',
      }
    })
    setForm(novo)
    setMsg(null)
  }, [anoMes, linhaDe])

  function copiarMesAnterior() {
    const ant = mesAnterior(anoMes)
    const novo = {}
    let achou = 0
    CASAS.forEach((c) => {
      const l = linhaDe(ant, c.loja)
      if (l?.Meta_Salao != null || l?.Meta_Delivery != null) achou++
      novo[c.loja] = {
        salao: l?.Meta_Salao != null ? fmtBR(l.Meta_Salao) : form[c.loja]?.salao || '',
        delivery: l?.Meta_Delivery != null ? fmtBR(l.Meta_Delivery) : form[c.loja]?.delivery || '',
      }
    })
    setForm(novo)
    setMsg(
      achou
        ? { ok: true, texto: `Copiado de ${nomeMes(ant)}. Ajuste o que precisar e salve.` }
        : { ok: false, texto: `${nomeMes(ant)} não tem meta separada por salão/delivery para copiar.` }
    )
  }

  const linhas = useMemo(
    () =>
      CASAS.map((c) => {
        const f = form[c.loja] || { salao: '', delivery: '' }
        const s = lerValor(f.salao)
        const d = lerValor(f.delivery)
        const atual = linhaDe(anoMes, c.loja)
        const ant = linhaDe(mesAnterior(anoMes), c.loja)
        return {
          ...c,
          f,
          salao: s,
          delivery: d,
          total: (s && !Number.isNaN(s) ? s : 0) + (d && !Number.isNaN(d) ? d : 0),
          salvoTotal: atual?.Meta ?? null,
          semDivisao: atual && atual.Meta != null && atual.Meta_Salao == null && atual.Meta_Delivery == null,
          anterior: ant?.Meta ?? null,
          invalido: Number.isNaN(s) || Number.isNaN(d) || (s ?? 0) < 0 || (d ?? 0) < 0,
          vazio: s == null && d == null,
        }
      }),
    [form, linhaDe, anoMes]
  )

  const totalGeral = linhas.reduce((t, l) => t + l.total, 0)
  const totalSalao = linhas.reduce((t, l) => t + (l.salao && !Number.isNaN(l.salao) ? l.salao : 0), 0)
  const totalDelivery = linhas.reduce((t, l) => t + (l.delivery && !Number.isNaN(l.delivery) ? l.delivery : 0), 0)
  const temInvalido = linhas.some((l) => l.invalido)
  const preenchidas = linhas.filter((l) => !l.vazio)
  const ultima = doAno
    .filter((x) => x.Ano_Mes === anoMes && x.Atualizado_Em)
    .sort((a, b) => String(b.Atualizado_Em).localeCompare(String(a.Atualizado_Em)))[0]

  async function salvar() {
    if (temInvalido || !preenchidas.length) return
    setSalvando(true)
    setMsg(null)
    try {
      const metas = preenchidas.map((l) => ({ loja: l.loja, salao: l.salao || 0, delivery: l.delivery || 0 }))
      const res = await fetch('/api/faturamento/metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anoMes, metas }),
      }).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)

      // Atualiza o dashboard na hora (a planilha publicada leva alguns minutos)
      const porLoja = { ...(metasCsv?.[anoMes] || {}) }
      metas.forEach((m) => { porLoja[m.loja] = m.salao + m.delivery })
      savePeriodMetas(anoMes, porLoja)

      await carregar()
      setTimeout(() => reloadFromSheets(), 1500)
      setMsg({ ok: true, texto: `Metas de ${nomeMes(anoMes)} salvas na planilha (${res.gravadas} casas).` })
    } catch (e) {
      setMsg({ ok: false, texto: e.message })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500 max-w-2xl">
            Preencha a meta de cada casa, separada em salão e delivery. Ao salvar, os valores vão para a planilha de metas
            (o total entra na coluna <b>Meta</b>, como hoje) e todos os dashboards passam a usar.
          </p>
          {ultima && (
            <p className="text-xs text-zinc-400 mt-1">
              Última alteração deste mês: {ultima.Atualizado_Por || '—'} em {ultima.Atualizado_Em}
            </p>
          )}
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-[11px] font-medium text-zinc-500 mb-1">Mês</label>
            <input
              type="month"
              value={anoMes}
              onChange={(e) => e.target.value && setAnoMes(e.target.value)}
              className="rounded-lg border border-surface-border px-3 py-1.5 text-sm bg-white"
            />
          </div>
          <button
            type="button"
            onClick={carregar}
            title="Recarregar da planilha"
            className="h-[34px] px-2.5 rounded-lg border border-surface-border bg-white text-zinc-500 hover:text-brand-black"
          >
            <RefreshCw size={15} className={carregando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {erroCarga && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" />
          <div>
            {naoConfigurado ? (
              <>
                <b>A gravação ainda não está ligada.</b> Falta instalar o script <code>QuintalFaturamentoMetas.gs</code> na planilha e
                configurar a Vercel. Enquanto isso, a tela mostra os totais atuais, mas não salva.
              </>
            ) : (
              <>Não consegui ler a planilha agora ({erroCarga}). Mostrando os totais já carregados no dashboard.</>
            )}
          </div>
        </div>
      )}

      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 border-b border-surface-border bg-surface-muted/50">
                <th className="px-4 py-2.5 font-medium">Casa</th>
                <th className="px-2 py-2.5 font-medium w-40 text-right">Salão (R$)</th>
                <th className="px-2 py-2.5 font-medium w-40 text-right">Delivery (R$)</th>
                <th className="px-4 py-2.5 font-medium w-36 text-right">Total</th>
                <th className="px-4 py-2.5 font-medium w-36 text-right">Mês anterior</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.loja} className="border-b border-surface-border last:border-0">
                  <td className="px-4 py-2">
                    <div className="font-medium text-brand-black">{l.label}</div>
                    {l.semDivisao && (
                      <div className="text-[11px] text-amber-700">Hoje: {fmtR(l.salvoTotal)} no total, sem divisão salão/delivery</div>
                    )}
                  </td>
                  <td className="px-2 py-2">
                    <CampoValor
                      valor={l.f.salao}
                      invalido={Number.isNaN(l.salao) || (l.salao ?? 0) < 0}
                      onChange={(v) => setForm((f) => ({ ...f, [l.loja]: { ...f[l.loja], salao: v } }))}
                    />
                  </td>
                  <td className="px-2 py-2">
                    <CampoValor
                      valor={l.f.delivery}
                      invalido={Number.isNaN(l.delivery) || (l.delivery ?? 0) < 0}
                      onChange={(v) => setForm((f) => ({ ...f, [l.loja]: { ...f[l.loja], delivery: v } }))}
                    />
                  </td>
                  <td className="px-4 py-2 text-right tabular-nums font-semibold text-brand-black">{l.vazio ? '—' : fmtR(l.total)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-400">{fmtR(l.anterior)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-surface-muted/50 font-semibold text-brand-black">
                <td className="px-4 py-2.5">Total da rede</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{fmtR(totalSalao)}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{fmtR(totalDelivery)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums">{fmtR(totalGeral)}</td>
                <td className="px-4 py-2.5 text-right tabular-nums text-zinc-400">
                  {fmtR(linhas.reduce((t, l) => t + (l.anterior || 0), 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {msg && (
        <p className={`flex items-center gap-1.5 text-sm ${msg.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
          {msg.ok ? <Check size={15} /> : <AlertTriangle size={15} />} {msg.texto}
        </p>
      )}
      {temInvalido && <p className="text-sm text-rose-700">Tem valor inválido (em vermelho). Use só números, ex.: 1.250.000,00</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={salvar}
          disabled={salvando || temInvalido || !preenchidas.length || naoConfigurado}
          className="flex items-center gap-1.5 rounded-lg bg-brand-olive text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        >
          <Save size={15} /> {salvando ? 'Salvando na planilha…' : `Salvar metas de ${nomeMes(anoMes)}`}
        </button>
        <button
          type="button"
          onClick={copiarMesAnterior}
          className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-white text-sm px-3 py-2 text-zinc-700 hover:bg-surface-muted"
        >
          <Copy size={14} /> Copiar do mês anterior
        </button>
        <span className="text-xs text-zinc-400">Casas em branco não são alteradas na planilha.</span>
      </div>
    </div>
  )
}
