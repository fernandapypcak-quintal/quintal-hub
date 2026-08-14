// app/hub/bonus/components/pages/Admin.jsx
'use client'

import { useState, useMemo } from 'react'
import { INDICADORES_BONUS } from '@/lib/bonus/scoring'
import { useBonusData } from '../../hooks/useBonusData'

// Rótulos de Numerador/Denominador mudam de acordo com o indicador —
// é o que alimenta o acumulado real (soma numerador / soma denominador)
// no fechamento do semestre. Ver lib/bonus/scoring.ts.
const ROTULOS_VOLUME = {
  cmv: { numerador: 'Custo do mês (R$)', denominador: 'ROB do mês (R$)' },
  custo_pessoal: { numerador: 'Custo c/ Pessoal do mês (R$)', denominador: 'ROB do mês (R$)' },
  lol_margem: { numerador: 'LOL Líquido do mês (R$, com sinal)', denominador: 'ROB do mês (R$)' },
  nps: { numerador: 'Promotores − Detratores do mês', denominador: 'Total de respondentes do mês' },
}

export default function Admin() {
  const { anoMes, salvarIndicador } = useBonusData()
  const [indicador, setIndicador] = useState(INDICADORES_BONUS[0].key)
  const [meta, setMeta] = useState('')
  const [meta80, setMeta80] = useState('')
  const [meta60, setMeta60] = useState('')
  const [real, setReal] = useState('')
  const [numerador, setNumerador] = useState('')
  const [denominador, setDenominador] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  const rotulos = ROTULOS_VOLUME[indicador]
  const configAtual = INDICADORES_BONUS.find((i) => i.key === indicador)

  // Se Numerador e Denominador estiverem preenchidos e o Real não, sugere
  // o Real automaticamente (só como ajuda visual — ela pode sobrescrever).
  const realSugerido = useMemo(() => {
    if (numerador === '' || denominador === '' || Number(denominador) === 0) return null
    return (Number(numerador) / Number(denominador)) * 100
  }, [numerador, denominador])

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvando(true)
    setMensagem(null)
    try {
      await salvarIndicador({
        mes_ref: anoMes,
        indicador,
        meta: meta === '' ? null : Number(meta) / 100,
        meta_80: meta80 === '' ? null : Number(meta80) / 100,
        meta_60: meta60 === '' ? null : Number(meta60) / 100,
        real: real === '' ? (realSugerido != null ? realSugerido / 100 : null) : Number(real) / 100,
        numerador: numerador === '' ? null : Number(numerador),
        denominador: denominador === '' ? null : Number(denominador),
        observacao: observacao || null,
      })
      setMensagem('Salvo ✓')
      setMeta(''); setMeta80(''); setMeta60(''); setReal(''); setNumerador(''); setDenominador(''); setObservacao('')
    } catch (err) {
      setMensagem('Erro ao salvar — tenta de novo')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-md">
      <h1 className="text-xl font-semibold text-brand-black mb-1">Bônus — Input Manual</h1>
      <p className="text-xs text-zinc-400 mb-1 font-mono">{anoMes}</p>
      <p className="text-xs text-zinc-400 mb-6">Meta/Meta 80%/Meta 60%/Real em % (ex: 26,7 para 26,7%)</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-500 mb-1">Indicador</label>
          <select
            value={indicador}
            onChange={(e) => setIndicador(e.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2 text-sm"
          >
            {INDICADORES_BONUS.map((i) => (
              <option key={i.key} value={i.key}>{i.label} (peso {(i.peso * 100).toFixed(0)}%)</option>
            ))}
          </select>
          {configAtual && (
            <p className="text-xs text-zinc-400 mt-1.5">
              Precisamos: <span className="text-zinc-600">{configAtual.objetivo}</span> · Fonte: {configAtual.fonte}
            </p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Meta</label>
            <input
              type="number" step="any" value={meta}
              onChange={(e) => setMeta(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Meta 80%</label>
            <input
              type="number" step="any" value={meta80}
              onChange={(e) => setMeta80(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Meta 60%</label>
            <input
              type="number" step="any" value={meta60}
              onChange={(e) => setMeta60(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-500 mb-1">
            Real {realSugerido != null && real === '' && (
              <span className="text-zinc-400 font-mono">— sugerido: {realSugerido.toFixed(1)}%</span>
            )}
          </label>
          <input
            type="number" step="any" value={real}
            placeholder={realSugerido != null ? realSugerido.toFixed(1) : ''}
            onChange={(e) => setReal(e.target.value)}
            className="w-full rounded-md border border-brand-olive/40 bg-brand-olive/5 px-3 py-2 text-sm font-mono"
          />
        </div>

        <div className="rounded-md border border-surface-border p-3 bg-surface-muted/40">
          <p className="text-[11px] text-zinc-500 mb-2 font-medium">
            Numerador / Denominador — opcional, mas necessário pro acumulado real do semestre
            (sem isso, o fechamento cai pra média simples dos meses)
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{rotulos.numerador}</label>
              <input
                type="number" step="any" value={numerador}
                onChange={(e) => setNumerador(e.target.value)}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-500 mb-1">{rotulos.denominador}</label>
              <input
                type="number" step="any" value={denominador}
                onChange={(e) => setDenominador(e.target.value)}
                className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-500 mb-1">Observação (opcional)</label>
          <input
            type="text" value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2 text-sm"
          />
        </div>

        <button
          type="submit" disabled={salvando}
          className="rounded-md bg-brand-olive text-white text-sm font-semibold px-4 py-2 disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : 'Salvar'}
        </button>

        {mensagem && <p className="text-sm text-zinc-500">{mensagem}</p>}
      </form>
    </div>
  )
}
