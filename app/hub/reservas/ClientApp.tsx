'use client'

// app/hub/reservas/ClientApp.tsx
// Reservas (Get In) — casca da página: cabeçalho, abas, filtros globais (origem e casa) e período.
// Abas por DATA DE CRIAÇÃO: Resumo, Operadores, Ocasiões e status (trabalho da central / meta).
// Abas por DATA DA RESERVA: Calendário e Por casa (movimento das casas).
// Dados via /api/reservas (Apps Script Reservas.gs) — ver utils.ts.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  type Filtros, type Grao, type Grupo, type Preset, GRUPOS, PRESETS, calcularPeriodo, dataCurta, hojeSP,
  limparCache, useConfig,
} from './utils'
import { Aviso, C, Spinner, pill } from './ui'
import Resumo from './abas/Resumo'
import Operadores from './abas/Operadores'
import OcasioesStatus from './abas/OcasioesStatus'
import Calendario from './abas/Calendario'
import PorCasa from './abas/PorCasa'

type Aba = 'resumo' | 'operadores' | 'ocasioes' | 'calendario' | 'casas'
const ABAS: { id: Aba; label: string; base: 'criacao' | 'reserva' }[] = [
  { id: 'resumo', label: 'Resumo', base: 'criacao' },
  { id: 'operadores', label: 'Operadores', base: 'criacao' },
  { id: 'ocasioes', label: 'Ocasiões e status', base: 'criacao' },
  { id: 'calendario', label: 'Calendário', base: 'reserva' },
  { id: 'casas', label: 'Por casa', base: 'reserva' },
]

export default function ReservasClientApp() {
  const [versao, setVersao] = useState(0)
  const { config, erro } = useConfig(versao)
  const [aba, setAba] = useState<Aba>('resumo')
  const [grupos, setGrupos] = useState<Grupo[]>(['time', 'online', 'corp'])
  const [unidades, setUnidades] = useState<string[]>([])
  const [preset, setPreset] = useState<Preset>('mes')
  const [cIni, setCIni] = useState('')
  const [cFim, setCFim] = useState('')
  const [grao, setGrao] = useState<Grao>('dia')

  const hoje = config?.hoje || hojeSP()
  const periodo = useMemo(() => calcularPeriodo(preset, hoje, cIni, cFim), [preset, hoje, cIni, cFim])
  const filtros: Filtros = useMemo(() => ({ grupos, unidades }), [grupos, unidades])
  const abaAtual = ABAS.find(a => a.id === aba) || ABAS[0]

  // Sempre fica pelo menos uma origem marcada
  const alternarGrupo = (g: Grupo) =>
    setGrupos(s => (s.includes(g) ? (s.length > 1 ? s.filter(x => x !== g) : s) : [...s, g]))
  const atualizar = () => { limparCache(); setVersao(v => v + 1) }

  const topo = (
    <div className="flex items-center gap-3 px-4 py-2 bg-brand-black border-b border-zinc-800">
      <Link href="/hub" className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 hover:text-white transition-colors">← Voltar ao HUB</Link>
      <span className="text-zinc-700 text-xs">|</span>
      <span className="text-xs text-zinc-500">Reservas</span>
    </div>
  )

  if (erro && !config) {
    return (
      <div style={{ minHeight: '100vh', background: C.fundo }}>{topo}
        <div style={{ maxWidth: 560, margin: '60px auto', padding: 20 }}><Aviso>Não foi possível abrir o painel: {erro}</Aviso></div>
      </div>
    )
  }
  if (!config) return <div style={{ minHeight: '100vh', background: C.fundo }}>{topo}<Spinner /></div>

  const at = config.atualizado
  return (
    <div style={{ minHeight: '100vh', background: C.fundo, display: 'flex', flexDirection: 'column' }}>
      {topo}

      <header style={{ background: '#fff', borderBottom: '1px solid #F0F0F0', padding: '14px 24px 0', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>Reservas</h1>
          <span style={{ fontSize: 12, color: C.suave }}>
            Get In · atualizado {at ? `${dataCurta(at.slice(0, 10))} às ${at.slice(11, 16)}` : '—'} · atualiza a cada hora
          </span>
          <button onClick={atualizar} style={{ ...pill(false), height: 26, fontSize: 12 }}>Recarregar</button>
        </div>

        {/* Filtros globais */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 11.5, color: C.suave, marginRight: 2 }}>Origem</span>
          {GRUPOS.map(g => {
            const on = grupos.includes(g.id)
            return (
              <button key={g.id} onClick={() => alternarGrupo(g.id)}
                style={{ ...pill(on), borderColor: on ? g.cor : '#E8E8E8', color: on ? g.cor : '#999' }}>
                {on ? '● ' : '○ '}{g.label}
              </button>
            )
          })}
          <span style={{ width: 1, height: 20, background: '#E8E8E8', margin: '0 6px' }} />
          <span style={{ fontSize: 11.5, color: C.suave, marginRight: 2 }}>Casa</span>
          <button onClick={() => setUnidades([])} style={pill(!unidades.length)}>Todas</button>
          {config.unidades.map(u => (
            <button key={u} style={pill(unidades.includes(u))}
              onClick={() => setUnidades(s => (s.includes(u) ? s.filter(x => x !== u) : [...s, u]))}>{u}</button>
          ))}
        </div>

        {/* Período: só nas abas por data de criação */}
        {abaAtual.base === 'criacao' ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontSize: 11.5, color: C.suave, marginRight: 2 }}>Criadas em</span>
            {PRESETS.map(p => <button key={p.id} style={pill(preset === p.id)} onClick={() => setPreset(p.id)}>{p.label}</button>)}
            {preset === 'custom' && (
              <>
                <input type="date" value={cIni || periodo.inicio} max={hoje} onChange={e => setCIni(e.target.value)} style={{ ...pill(true), padding: '0 8px' }} />
                <span style={{ color: C.suave }}>a</span>
                <input type="date" value={cFim || periodo.fim} max={hoje} onChange={e => setCFim(e.target.value)} style={{ ...pill(true), padding: '0 8px' }} />
              </>
            )}
            <span style={{ fontSize: 12, color: C.suave, marginLeft: 6 }}>{periodo.label} · comparado com {periodo.labelAnt}</span>
          </div>
        ) : (
          <div style={{ fontSize: 12, color: C.suave, marginBottom: 10 }}>
            Esta aba é por <b>data da reserva</b> (o dia em que o cliente vai à casa). O mês é escolhido dentro da aba.
          </div>
        )}

        <nav style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
          {ABAS.map(a => (
            <button key={a.id} onClick={() => setAba(a.id)}
              style={{
                padding: '10px 14px', border: 'none', background: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                borderBottom: `2px solid ${aba === a.id ? C.texto : 'transparent'}`,
                color: aba === a.id ? C.texto : C.suave, fontWeight: aba === a.id ? 600 : 400, whiteSpace: 'nowrap',
              }}>
              {a.label}
            </button>
          ))}
        </nav>
      </header>

      <main key={versao} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1440, width: '100%', margin: '0 auto' }}>
        {erro && <Aviso>{erro}</Aviso>}
        {aba === 'resumo' && <Resumo config={config} filtros={filtros} periodo={periodo} grao={grao} setGrao={setGrao} hoje={hoje} />}
        {aba === 'operadores' && <Operadores filtros={filtros} periodo={periodo} />}
        {aba === 'ocasioes' && <OcasioesStatus filtros={filtros} periodo={periodo} />}
        {aba === 'calendario' && <Calendario config={config} filtros={filtros} hoje={hoje} />}
        {aba === 'casas' && <PorCasa config={config} filtros={filtros} hoje={hoje} />}
        <div style={{ fontSize: 11.5, color: C.suave, lineHeight: 1.6 }}>
          <b>Time de reservas</b> = operadores da aba OPERADORES (contam na meta) · <b>Online</b> = app, link e Google, sem operador ·{' '}
          <b>Corporativo / outros</b> = demais operadores (eventos e não cadastrados) · <b>B2B</b> = origem Pipe ou ocasião corporativa.
        </div>
      </main>
    </div>
  )
}
