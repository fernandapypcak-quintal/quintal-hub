// app/hub/metas/components/pages/Admin.jsx
'use client'

import { useState, useMemo, useEffect } from 'react'
import { UNITS } from '@/lib/units'
import { useMetasData } from '../../hooks/useMetasData'
import { chavesManuais } from '@/lib/metas/config'

export default function Admin() {
  const { anoMes, vigencia, salvarIndicador } = useMetasData()
  const opcoes = useMemo(() => chavesManuais(vigencia), [vigencia])
  const [unidade, setUnidade] = useState(UNITS[0].id)
  const [indicador, setIndicador] = useState(opcoes[0]?.key ?? '')
  useEffect(() => {
    if (!opcoes.some((o) => o.key === indicador)) setIndicador(opcoes[0]?.key ?? '')
  }, [opcoes, indicador])
  const opcao = opcoes.find((o) => o.key === indicador)
  const cfg = vigencia.indicadores.find((i) => i.key === indicador)
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
            {opcoes.map((i) => (
              <option key={i.key} value={i.key}>{i.label}</option>
            ))}
          </select>
          {cfg && (
            <p className="text-xs text-zinc-500 mt-1.5 leading-snug">
              {cfg.descricao}
              {cfg.formato === 'pct' && ' Lance em fração: 32% = 0.32.'}
              {opcao && !opcao.lancaReal && ' O real vem automático; aqui só a meta.'}
              {cfg.meta.tipo === 'reducaoMesAnterior' && ' Se deixar a meta vazia, ela é calculada sozinha.'}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Meta</label>
            <input
              type="number" step="any" value={meta}
              disabled={opcao && !opcao.lancaMeta}
              onChange={(e) => setMeta(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono disabled:bg-surface-muted disabled:text-zinc-400"
            />
          </div>
          <div>
            <label className="block text-sm text-zinc-500 mb-1">Real</label>
            <input
              type="number" step="any" value={real}
              disabled={opcao && !opcao.lancaReal}
              onChange={(e) => setReal(e.target.value)}
              className="w-full rounded-md border border-surface-border px-3 py-2 text-sm font-mono disabled:bg-surface-muted disabled:text-zinc-400"
            />
          </div>
        </div>

        {cfg?.formato === 'pct' && (
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
