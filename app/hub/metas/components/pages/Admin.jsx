// app/hub/metas/components/pages/Admin.jsx
'use client'

import { useState } from 'react'
import { UNITS } from '@/lib/units'
import { useMetasData } from '../../hooks/useMetasData'

const INDICADORES = [
  { key: 'cmv', label: 'CMV' },
  { key: 'custo_folha', label: 'Custo Folha' },
  { key: 'custo_freela', label: 'Custo Freela' },
  { key: 'nps', label: 'NPS' },
  { key: 'bandas_custo_artista', label: 'Bandas — Custo Artista' },
  { key: 'bandas_arrecadacao', label: 'Bandas — Arrecadação' },
]

export default function Admin() {
  const { anoMes, salvarIndicador } = useMetasData()
  const [unidade, setUnidade] = useState(UNITS[0].id)
  const [indicador, setIndicador] = useState('cmv')
  const [meta, setMeta] = useState('')
  const [real, setReal] = useState('')
  const [trimestreCongelado, setTrimestreCongelado] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setSalvando(true)
    setMensagem(null)
    try {
      await salvarIndicador({
        mes_ref: anoMes,
        unidade,
        indicador,
        meta: meta === '' ? null : Number(meta),
        real: real === '' ? null : Number(real),
        trimestre_congelado: trimestreCongelado || null,
      })
      setMensagem('Salvo ✓')
      setMeta('')
      setReal('')
    } catch (err) {
      setMensagem('Erro ao salvar — tenta de novo')
      console.error(err)
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="p-6 md:p-8 max-w-md">
      <h1 className="text-xl font-semibold text-brand-black mb-1">Metas — Input Manual</h1>
      <p className="text-xs text-zinc-400 mb-6 font-mono">{anoMes}</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm text-zinc-500 mb-1">Unidade</label>
          <select
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2 text-sm"
          >
            {UNITS.filter((u) => u.id !== 'holding').map((u) => (
              <option key={u.id} value={u.id}>{u.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-zinc-500 mb-1">Indicador</label>
          <select
            value={indicador}
            onChange={(e) => setIndicador(e.target.value)}
            className="w-full rounded-md border border-surface-border px-3 py-2 text-sm"
          >
            {INDICADORES.map((i) => (
              <option key={i.key} value={i.key}>{i.label}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Meta</label>
            <input
              type="number" step="any" value={meta}
              onChange={(e) => setMeta(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Real</label>
            <input
              type="number" step="any" value={real}
              onChange={(e) => setReal(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        {['cmv', 'custo_folha', 'custo_freela'].includes(indicador) && (
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Trimestre congelado (opcional, ex: 2026-Q3)</label>
            <input
              type="text" value={trimestreCongelado}
              onChange={(e) => setTrimestreCongelado(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono"
            />
          </div>
        )}

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
