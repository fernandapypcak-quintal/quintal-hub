'use client'

// app/hub/caixa-forecast/ClientApp.tsx
// Painel de Caixa & Forecast — realizado e projeção 2026.
// O painel é o HTML original (mesmo visual, abas e exportações), servido por
// /api/caixa-forecast/painel com permissão checada no servidor. Aqui só fica a topbar do HUB.

import { useState } from 'react'
import Link from 'next/link'

const SRC = '/api/caixa-forecast/painel'

export default function CaixaForecastClientApp() {
  const [versao, setVersao] = useState(0)
  const [carregando, setCarregando] = useState(true)

  const recarregar = () => { setCarregando(true); setVersao(v => v + 1) }

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-surface-base">
      {/* Topbar HUB */}
      <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
        <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
          ← Voltar ao HUB
        </Link>
        <span className="text-zinc-700 text-xs">|</span>
        <span className="text-xs text-zinc-500">Painel de Caixa &amp; Forecast</span>
        <div className="ml-auto flex items-center gap-3">
          <button onClick={recarregar} className="text-xs text-zinc-400 hover:text-white transition-colors" title="Recarregar dados">
            ↻ Atualizar
          </button>
          <a href={SRC} target="_blank" rel="noopener" className="text-xs text-zinc-400 hover:text-white transition-colors" title="Abrir em tela cheia (melhor pra imprimir)">
            ⤢ Tela cheia
          </a>
        </div>
      </div>

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {carregando && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#EEF6DC', color: '#5E7038', fontSize: 13, fontFamily: 'inherit', zIndex: 1 }}>
            Carregando painel…
          </div>
        )}
        <iframe
          key={versao}
          src={`${SRC}?v=${versao}`}
          title="Painel de Caixa & Forecast"
          onLoad={() => setCarregando(false)}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#EEF6DC' }}
        />
      </div>
    </div>
  )
}
