'use client'

// app/hub/reservas/ClientApp.tsx
// Reservas (Get In) — casca da página no mesmo layout do Comercial:
// sidebar (desktop) / bottom nav (mobile), topbar do HUB, header verde com os filtros.
// Abas por DATA DE CRIAÇÃO: Resumo, Operadores, Ocasiões e status (trabalho da central / meta).
// Abas por DATA DA RESERVA: Calendário e Por casa (movimento das casas).
// Dados via /api/reservas (Apps Script Reservas.gs) — ver utils.ts.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type Filtros, type Grao, type Grupo, type Preset, PRESETS, calcularPeriodo, dataCurta, hojeSP,
  limparCache, useConfig,
} from './utils'
import { Aviso, Spinner } from './ui'
import Resumo from './abas/Resumo'
import Operadores from './abas/Operadores'
import OcasioesStatus from './abas/OcasioesStatus'
import Calendario from './abas/Calendario'
import PorCasa from './abas/PorCasa'

type Aba = 'resumo' | 'operadores' | 'ocasioes' | 'calendario' | 'casas'
const ABAS: { id: Aba; icon: string; label: string; curto: string; base: 'criacao' | 'reserva' }[] = [
  { id: 'resumo', icon: '🏠', label: 'Resumo', curto: 'Resumo', base: 'criacao' },
  { id: 'operadores', icon: '🧑‍💼', label: 'Operadores', curto: 'Operad.', base: 'criacao' },
  { id: 'ocasioes', icon: '🎉', label: 'Ocasiões e status', curto: 'Ocasiões', base: 'criacao' },
  { id: 'calendario', icon: '📅', label: 'Calendário', curto: 'Agenda', base: 'reserva' },
  { id: 'casas', icon: '🏪', label: 'Por casa', curto: 'Casas', base: 'reserva' },
]

// Origem: combinações prontas dos 3 grupos
const ORIGENS: { id: string; label: string; grupos: Grupo[] }[] = [
  { id: 'todas', label: 'Todas as origens', grupos: ['time', 'online', 'corp'] },
  { id: 'time', label: 'Time de reservas', grupos: ['time'] },
  { id: 'central', label: 'Central (time + corporativo)', grupos: ['time', 'corp'] },
  { id: 'online', label: 'Online', grupos: ['online'] },
  { id: 'corp', label: 'Corporativo / outros', grupos: ['corp'] },
]

const selectStyle: React.CSSProperties = {
  padding: '5px 10px', borderRadius: 8, border: 'none',
  fontSize: 12, background: 'rgba(255,255,255,0.15)',
  color: '#fff', cursor: 'pointer', fontFamily: 'inherit',
}
const opt: React.CSSProperties = { color: '#0D0F14' }

function Sidebar({ aba, onAba }: { aba: Aba; onAba: (a: Aba) => void }) {
  return (
    <aside style={{ width: 220, background: '#fff', borderRight: '0.5px solid #E8E8E2', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '16px 18px', borderBottom: '0.5px solid #E8E8E2', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: '#0D0F14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: '#97A624', fontWeight: 700, fontFamily: 'monospace' }}>QE</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>Reservas</div>
          <div style={{ fontSize: 10, color: '#9a9c9f' }}>Get In · B2C</div>
        </div>
      </div>
      <nav style={{ padding: '12px 8px', flex: 1 }}>
        {ABAS.map((p, i) => (
          <div key={p.id}>
            {i === 3 && <div style={{ fontSize: 10, color: '#9a9c9f', padding: '12px 14px 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Por data da reserva</div>}
            {i === 0 && <div style={{ fontSize: 10, color: '#9a9c9f', padding: '0 14px 4px', textTransform: 'uppercase', letterSpacing: 0.5 }}>Por data de criação</div>}
            <button onClick={() => onAba(p.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 9,
                width: '100%', padding: '8px 14px', borderRadius: 7,
                border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', textAlign: 'left',
                background: aba === p.id ? '#f0f4e0' : 'transparent',
                color: aba === p.id ? '#6e7a1a' : '#5a5c5f',
                fontWeight: aba === p.id ? 500 : 400,
                marginBottom: 2,
              }}>
              <span>{p.icon}</span>{p.label}
            </button>
          </div>
        ))}
      </nav>
    </aside>
  )
}

function BottomNav({ aba, onAba }: { aba: Aba; onAba: (a: Aba) => void }) {
  return (
    <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff', borderTop: '0.5px solid #E8E8E2', display: 'flex', zIndex: 50 }}>
      {ABAS.map(p => (
        <button key={p.id} onClick={() => onAba(p.id)}
          style={{ flex: 1, padding: '10px 0', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, fontSize: 10, fontFamily: 'inherit', color: aba === p.id ? '#97A624' : '#9a9c9f', fontWeight: aba === p.id ? 600 : 400 }}>
          <span style={{ fontSize: 18 }}>{p.icon}</span>{p.curto}
        </button>
      ))}
    </nav>
  )
}

export default function ReservasClientApp() {
  const [versao, setVersao] = useState(0)
  const { config, erro } = useConfig(versao)
  const [aba, setAba] = useState<Aba>('resumo')
  const [origem, setOrigem] = useState('todas')
  const [unidade, setUnidade] = useState('')
  const [preset, setPreset] = useState<Preset>('mes')
  const [cIni, setCIni] = useState('')
  const [cFim, setCFim] = useState('')
  const [grao, setGrao] = useState<Grao>('dia')

  const hoje = config?.hoje || hojeSP()
  const periodo = useMemo(() => calcularPeriodo(preset, hoje, cIni, cFim), [preset, hoje, cIni, cFim])
  const filtros: Filtros = useMemo(() => ({
    grupos: (ORIGENS.find(o => o.id === origem) || ORIGENS[0]).grupos,
    unidades: unidade ? [unidade] : [],
  }), [origem, unidade])
  const abaAtual = ABAS.find(a => a.id === aba) || ABAS[0]
  const atualizar = () => { limparCache(); setVersao(v => v + 1) }
  const at = config?.atualizado || ''

  let conteudo: React.ReactNode
  if (erro && !config) conteudo = <div style={{ maxWidth: 560, margin: '40px auto', padding: 20 }}><Aviso>Não foi possível abrir o painel: {erro}</Aviso></div>
  else if (!config) conteudo = <Spinner />
  else conteudo = (
    <div key={versao} style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1440, margin: '0 auto' }}>
      {erro && <Aviso>{erro}</Aviso>}
      {aba === 'resumo' && <Resumo config={config} filtros={filtros} periodo={periodo} grao={grao} setGrao={setGrao} hoje={hoje} />}
      {aba === 'operadores' && <Operadores config={config} filtros={filtros} periodo={periodo} />}
      {aba === 'ocasioes' && <OcasioesStatus config={config} filtros={filtros} periodo={periodo} />}
      {aba === 'calendario' && <Calendario config={config} filtros={filtros} hoje={hoje} />}
      {aba === 'casas' && <PorCasa config={config} filtros={filtros} hoje={hoje} />}
      <div style={{ fontSize: 11.5, color: '#888', lineHeight: 1.6 }}>
        <b>Time de reservas</b> = operadores da aba OPERADORES (contam na meta) · <b>Online</b> = app, link e Google, sem operador ·{' '}
        <b>Corporativo / outros</b> = demais operadores (eventos e não cadastrados) · <b>B2B</b> = origem Pipe ou ocasião corporativa.
      </div>
    </div>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-surface-base">
      <div className="hidden lg:flex">
        <Sidebar aba={aba} onAba={setAba} />
      </div>

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar HUB */}
        <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
          <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">
            ← Voltar ao HUB
          </Link>
          <span className="text-zinc-700 text-xs">|</span>
          <span className="text-xs text-zinc-500">Reservas</span>
        </div>

        {/* Header verde */}
        <div style={{ background: 'linear-gradient(135deg, #4F6B14 0%, #97A624 100%)', borderBottom: '1px solid #3d5210', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📅</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Reservas · {abaAtual.label}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>
                Quintal do Espeto · Get In · {abaAtual.base === 'criacao' ? 'por data de criação' : 'por data da reserva'}
                {at ? ` · atualizado ${dataCurta(at.slice(0, 10))} às ${at.slice(11, 16)}` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            {abaAtual.base === 'criacao' && (
              <>
                <select value={preset} onChange={e => setPreset(e.target.value as Preset)} style={selectStyle}>
                  {PRESETS.map(p => <option key={p.id} value={p.id} style={opt}>{p.label}</option>)}
                </select>
                {preset === 'custom' && (
                  <>
                    <input type="date" value={cIni || periodo.inicio} max={hoje} onChange={e => setCIni(e.target.value)} style={{ ...selectStyle, colorScheme: 'dark' }} />
                    <input type="date" value={cFim || periodo.fim} max={hoje} onChange={e => setCFim(e.target.value)} style={{ ...selectStyle, colorScheme: 'dark' }} />
                  </>
                )}
              </>
            )}
            <select value={origem} onChange={e => setOrigem(e.target.value)} style={selectStyle}>
              {ORIGENS.map(o => <option key={o.id} value={o.id} style={opt}>{o.label}</option>)}
            </select>
            <select value={unidade} onChange={e => setUnidade(e.target.value)} style={selectStyle}>
              {(!config || !config.restrito || config.unidades.length > 1) && <option value="" style={opt}>Todas as unidades</option>}
              {(config?.unidades || []).map(u => <option key={u} value={u} style={opt}>{u}</option>)}
            </select>
            <button onClick={atualizar} title="Recarregar dados" style={{ ...selectStyle, padding: '5px 9px' }}>↻</button>
          </div>
        </div>

        {abaAtual.base === 'criacao' && config && (
          <div style={{ background: '#fff', borderBottom: '0.5px solid #E8E8E2', padding: '7px 20px', fontSize: 12, color: '#5a5c5f', flexShrink: 0 }}>
            Criadas de <b>{periodo.label}</b> · comparado com {periodo.labelAnt} e com {periodo.labelAno}
          </div>
        )}

        <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
          {conteudo}
        </main>
      </div>

      <div className="lg:hidden">
        <BottomNav aba={aba} onAba={setAba} />
      </div>
    </div>
  )
}
