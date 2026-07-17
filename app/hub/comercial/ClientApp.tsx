'use client'

import { useState } from 'react'
import Link from 'next/link'
import Sidebar from './components/layout/Sidebar'
import BottomNav from './components/layout/BottomNav'
import Funil from './components/pages/Funil'
import Eventos from './components/pages/Eventos'
import Calendario from './components/pages/Calendario'
import Leads from './components/pages/Leads'
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
}

const currentYear = new Date().getFullYear()
const ANOS = [String(currentYear), String(currentYear - 1), String(currentYear - 2), '']

export default function ComercialClientApp({ allowedLojas = '*' }: { allowedLojas?: string[] | '*' }) {
  const idsPermitidos = allowedNativeLabels(allowedLojas as any, 'comercialId')
  const UNIDADES = idsPermitidos === '*' ? TODAS_UNIDADES : TODAS_UNIDADES.filter(u => idsPermitidos.includes(u.id))
  // O Apps Script do Pipedrive agrega/pagina por unidade e não sabe de
  // permissão — então "todas as unidades" só é seguro oferecer pra quem
  // realmente enxerga a rede toda. Acesso parcial escolhe uma unidade
  // específica de cada vez.
  const podeVerTodas = allowedLojas === '*'
  const [activePage, setActivePage] = useState('funil')
  const [filtros, setFiltros] = useState({
    status: '' as '' | 'open' | 'won' | 'lost',
    unidade: podeVerTodas ? '' : (UNIDADES[0]?.id ?? ''),
    ano: String(currentYear),
    mes: '',
  })

  const Page = PAGES[activePage] || Funil

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      {/* Sidebar desktop */}
      <div className="hidden lg:flex">
        <Sidebar activePage={activePage} onPageChange={setActivePage} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Barra topo — padrão HUB */}
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">Comercial</span>
        </div>

        {/* Header verde */}
        <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🤝</div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.3px', lineHeight: 1.2 }}>Comercial B2B</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>Quintal do Espeto · Eventos corporativos</div>
            </div>
          </div>

          {/* Filtros */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={filtros.ano} onChange={e => setFiltros(f => ({ ...f, ano: e.target.value }))}
              style={{ padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
              {ANOS.map(a => <option key={a} value={a} style={{ color: '#0D0F14' }}>{a || 'Todos os anos'}</option>)}
            </select>
            <select value={filtros.mes} onChange={e => setFiltros(f => ({ ...f, mes: e.target.value }))}
              style={{ padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
              <option value="" style={{ color: '#0D0F14' }}>Todos os meses</option>
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map((m, i) => (
                <option key={m} value={m} style={{ color: '#0D0F14' }}>
                  {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][i]}
                </option>
              ))}
            </select>
            <select value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value as any }))}
              style={{ padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
              <option value="" style={{ color: '#0D0F14' }}>Todos os status</option>
              <option value="open" style={{ color: '#0D0F14' }}>Em aberto</option>
              <option value="won" style={{ color: '#0D0F14' }}>Ganhos</option>
              <option value="lost" style={{ color: '#0D0F14' }}>Perdidos</option>
            </select>
            <select value={filtros.unidade} onChange={e => setFiltros(f => ({ ...f, unidade: e.target.value }))}
              style={{ padding: '5px 10px', borderRadius: 8, border: 'none', fontSize: 12, background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer' }}>
              {podeVerTodas && <option value="" style={{ color: '#0D0F14' }}>Todas as unidades</option>}
              {UNIDADES.map(u => <option key={u.id} value={u.id} style={{ color: '#0D0F14' }}>{u.nome}</option>)}
            </select>
          </div>
        </div>

        {/* Conteúdo */}
        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          <Page filtros={filtros} />
        </main>
      </div>

      {/* Bottom nav mobile */}
      <div className="lg:hidden">
        <BottomNav activePage={activePage} onPageChange={setActivePage} />
      </div>
    </div>
  )
}
