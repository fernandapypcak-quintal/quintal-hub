'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Funil from './components/pages/Funil'
import Eventos from './components/pages/Eventos'
import Calendario from './components/pages/Calendario'
import Leads from './components/pages/Leads'
import Conversoes from './components/pages/Conversoes'
import PorLoja from './components/pages/PorLoja'
import TaxaConversao from './components/pages/TaxaConversao'
import { useVendedores } from './useComercial'
import { allowedNativeLabels } from '@/lib/units'

const TODAS_UNIDADES = [
  { id: '13', nome: 'Alto da Lapa' }, { id: '14', nome: 'Moema Carinás' },
  { id: '15', nome: 'Moema Pavão' },  { id: '16', nome: 'Perdizes' },
  { id: '28', nome: 'Santana' },      { id: '72', nome: 'Santo André' },
  { id: '17', nome: 'Tatuapé' },      { id: '18', nome: 'Vila Madalena' },
  { id: '19', nome: 'Vila Mariana' }, { id: '78', nome: 'Chácara Sto. Antônio' },
]

const PAGES: Record<string, React.ComponentType<any>> = {
  funil:      Funil,
  eventos:    Eventos,
  calendario: Calendario,
  leads:      Leads,
  conversoes: Conversoes,
  por_loja:   PorLoja,
  taxa:       TaxaConversao,
}

const currentYear = new Date().getFullYear()
const ANOS = [String(currentYear), String(currentYear - 1), String(currentYear - 2), '']

const selectStyle = {
  padding: '5px 10px', borderRadius: 8, border: 'none',
  fontSize: 12, background: 'rgba(255,255,255,0.15)',
  color: '#fff', cursor: 'pointer',
}

export default function ComercialClientApp({ allowedLojas = '*' }: { allowedLojas?: string[] | '*' }) {
  const idsPermitidos = allowedNativeLabels(allowedLojas as any, 'comercialId')
  const UNIDADES = idsPermitidos === '*' ? TODAS_UNIDADES : TODAS_UNIDADES.filter(u => idsPermitidos.includes(u.id))
  const podeVerTodas = allowedLojas === '*'

  const [activePage, setActivePage] = useState('funil')
  const [filtros, setFiltros] = useState({
    status:   '' as '' | 'open' | 'won' | 'lost',
    unidade:  podeVerTodas ? '' : (UNIDADES[0]?.id ?? ''),
    ano:      String(currentYear),
    mes:      '',
    vendedor: '',
  })

  const vendedores = useVendedores()
  const Page = PAGES[activePage] || Funil

  function set(key: string, val: string) {
    setFiltros(f => ({ ...f, [key]: val }))
  }

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
          <span className="text-xs text-zinc-500">Comercial</span>
        </div>

        {/* Header verde */}
        <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤝</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Comercial B2B</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>Quintal do Espeto · Eventos corporativos</div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <select value={filtros.ano}      onChange={e => set('ano', e.target.value)}      style={selectStyle}>
              {ANOS.map(a => <option key={a} value={a} style={{ color: '#0D0F14' }}>{a || 'Todos os anos'}</option>)}
            </select>
            <select value={filtros.mes}      onChange={e => set('mes', e.target.value)}      style={selectStyle}>
              <option value="" style={{ color: '#0D0F14' }}>Todos os meses</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m,i) => (
                <option key={m} value={m} style={{ color: '#0D0F14' }}>
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]}
                </option>
              ))}
            </select>
            <select value={filtros.status}   onChange={e => set('status', e.target.value)}   style={selectStyle}>
              <option value="" style={{ color: '#0D0F14' }}>Todos os status</option>
              <option value="open"  style={{ color: '#0D0F14' }}>Em aberto</option>
              <option value="won"   style={{ color: '#0D0F14' }}>Ganhos</option>
              <option value="lost"  style={{ color: '#0D0F14' }}>Perdidos</option>
            </select>
            <select value={filtros.unidade}  onChange={e => set('unidade', e.target.value)}  style={selectStyle}>
              {podeVerTodas && <option value="" style={{ color: '#0D0F14' }}>Todas as unidades</option>}
              {UNIDADES.map(u => <option key={u.id} value={u.id} style={{ color: '#0D0F14' }}>{u.nome}</option>)}
            </select>
            {vendedores.length > 0 && (
              <select value={filtros.vendedor} onChange={e => set('vendedor', e.target.value)} style={selectStyle}>
                <option value="" style={{ color: '#0D0F14' }}>Todos os vendedores</option>
                {vendedores.map(v => <option key={v} value={v} style={{ color: '#0D0F14' }}>{v}</option>)}
              </select>
            )}
          </div>
        </div>

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Page filtros={filtros} />
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav activePage={activePage} onPageChange={setActivePage} />
      </div>
    </div>
  )
}
