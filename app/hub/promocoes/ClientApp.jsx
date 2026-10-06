'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import VisaoGeral from './components/pages/VisaoGeral'
import PorCasa from './components/pages/PorCasa'
import Pacotes from './components/pages/Pacotes'
import PorPromocao from './components/pages/PorPromocao'
import AnaliseDiaria from './components/pages/AnaliseDiaria'
import Conferencia from './components/pages/Conferencia'
import SimuladorPromocoesClientApp from '../simulador-promocoes/ClientApp'
import { usePromocoesData } from './data/usePromocoesData'
import { Carregando, Aviso, mesLabel } from './components/ui'

const PAGES = {
  visao: VisaoGeral,
  casas: PorCasa,
  pacotes: Pacotes,
  promocoes: PorPromocao,
  diaria: AnaliseDiaria,
  conferencia: Conferencia,
}

const selectStyle = {
  padding: '5px 10px', borderRadius: 8, border: 'none',
  fontSize: 12, background: 'rgba(255,255,255,0.15)',
  color: '#fff', cursor: 'pointer',
}
const opt = { color: '#0D0F14' }

export default function PromocoesClientApp({ allowedLojas = '*' }) {
  const [activePage, setActivePage] = useState('visao')

  const [filtros, setFiltros] = useState({ mes: '', unidade: '', categoria: '' })
  const set = (k, v) => setFiltros((f) => ({ ...f, [k]: v }))
  // Carrega só o mês escolhido (+ o anterior, pra comparação)
  const { dados, loading, erro, avisoFaturamento } = usePromocoesData(filtros.mes)

  const podeVerTodas = allowedLojas === '*'
  const unidades = dados?.unidades || []
  const meses = useMemo(() => [...(dados?.meses || [])].reverse(), [dados])

  // Defaults quando os dados chegam: mês mais recente; unidade fixa p/ quem só vê uma
  useEffect(() => {
    if (!dados) return
    setFiltros((f) => ({
      ...f,
      mes: f.mes && dados.meses.includes(f.mes) ? f.mes : dados.meses[dados.meses.length - 1] || '',
      unidade: !podeVerTodas && !f.unidade && unidades.length === 1 ? unidades[0].id : f.unidade,
    }))
  }, [dados])

  const Page = PAGES[activePage]
  const semFiltros = activePage === 'simulador'

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <div className="hidden lg:flex">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar HUB */}
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">Promoções</span>
        </div>

        {/* Header verde */}
        <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🔥</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Promoções</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Quintal do Espeto · faturamento, CMV e peso das promoções</div>
            </div>
          </div>

          {!semFiltros && dados && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <select value={filtros.mes} onChange={(e) => set('mes', e.target.value)} style={selectStyle}>
                {meses.map((m) => (
                  <option key={m} value={m} style={opt}>{mesLabel(m)}{m === dados.ultimoFechado?.slice(0, 7) ? ' (parcial)' : ''}</option>
                ))}
              </select>
              {activePage !== 'casas' && (
                <select value={filtros.unidade} onChange={(e) => set('unidade', e.target.value)} style={selectStyle}>
                  {(podeVerTodas || unidades.length > 1) && <option value="" style={opt}>{podeVerTodas ? 'Rede (todas)' : 'Minhas casas'}</option>}
                  {unidades.map((u) => <option key={u.id} value={u.id} style={opt}>{u.label}</option>)}
                </select>
              )}
            </div>
          )}
        </div>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {semFiltros ? (
            <SimuladorPromocoesClientApp dados={dados} mostrarBarraVoltar={false} />
          ) : loading || (dados && filtros.mes && dados.mesCarregado !== filtros.mes) ? (
            <Carregando />
          ) : erro ? (
            <div className="p-6"><Aviso tom="red">Erro ao carregar promoções: {erro}</Aviso></div>
          ) : !dados?.meses?.length ? (
            <div className="p-6 text-sm text-zinc-400">Nenhum dado de promoções ainda.</div>
          ) : filtros.mes ? (
            <>
              {avisoFaturamento && <div className="px-4 lg:px-6 pt-4"><Aviso>{avisoFaturamento}</Aviso></div>}
              <Page dados={dados} filtros={filtros} />
            </>
          ) : null}
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav activePage={activePage} onPageChange={setActivePage} />
      </div>
    </div>
  )
}
