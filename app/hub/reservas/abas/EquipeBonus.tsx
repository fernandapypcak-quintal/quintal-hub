// app/hub/reservas/abas/EquipeBonus.tsx
// Aba "Equipe e bônus" — edita, sem abrir a planilha, as abas OPERADORES,
// METAS_SEMANAIS e ESCALA da planilha de Reservas (via /api/reservas/cadastros).
// Nomes de operadora vêm de uma lista (o cadastro), então não tem erro de digitação.
// Regras de validação: lib/reservas-cadastros.ts.

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { COLUNAS, dataIso, mapaOperadores, semAcento, validarTabela, type TabelaReservas } from '@/lib/reservas-cadastros'

type Tipo = 'texto' | 'data' | 'mes' | 'numero' | 'operador' | 'operadorOuTodas' | 'dias'
type Coluna = { titulo: string; tipo: Tipo; largura: number; ajuda?: string }

const SPEC: Record<TabelaReservas, { titulo: string; descricao: string; colunas: Coluna[]; novo: () => string[] }> = {
  reservas_operadores: {
    titulo: 'Operadoras do time',
    descricao:
      'Quem é do time de reservas (conta na meta). Saída preenchida = deixa de contar a partir do dia seguinte. Apelidos = outros jeitos que o nome aparece na Get In, separados por ponto e vírgula.',
    colunas: [
      { titulo: 'Nome', tipo: 'texto', largura: 160 },
      { titulo: 'Time', tipo: 'texto', largura: 120 },
      { titulo: 'Início', tipo: 'data', largura: 150, ajuda: 'vazio = desde sempre' },
      { titulo: 'Saída', tipo: 'data', largura: 150, ajuda: 'vazio = ativa' },
      { titulo: 'Apelidos na Get In', tipo: 'texto', largura: 220 },
    ],
    novo: () => ['', 'Reservas', '', '', ''],
  },
  reservas_metas_semanais: {
    titulo: 'Metas semanais (bônus)',
    descricao:
      'Meta base de reservas por semana e as faixas em % da base. Vale a partir da data de início até existir uma linha mais nova. Sem operadora = meta geral do time.',
    colunas: [
      { titulo: 'Vale a partir de', tipo: 'data', largura: 150 },
      { titulo: 'Operadora', tipo: 'operadorOuTodas', largura: 160 },
      { titulo: 'Meta base', tipo: 'numero', largura: 100 },
      { titulo: 'Faixa 1 %', tipo: 'numero', largura: 90 },
      { titulo: 'Faixa 2 %', tipo: 'numero', largura: 90 },
      { titulo: 'Faixa 3 %', tipo: 'numero', largura: 90 },
    ],
    novo: () => ['', '', '', '100', '120', '140'],
  },
  reservas_escala: {
    titulo: 'Escala',
    descricao:
      'Dias de trabalho de cada operadora em cada semana do mês (contam na meta semanal). Sem escala, vale a semana do calendário.',
    colunas: [
      { titulo: 'Mês', tipo: 'mes', largura: 150 },
      { titulo: 'Semana', tipo: 'numero', largura: 80 },
      { titulo: 'Operadora', tipo: 'operador', largura: 160 },
      { titulo: 'Dias (ex.: 15-16-19-20-21)', tipo: 'dias', largura: 230 },
    ],
    novo: () => ['', '', '', ''],
  },
}

const inputBase: React.CSSProperties = { width: '100%', padding: '5px 8px', borderRadius: 7, fontSize: 12.5, border: '1px solid #E2E2E2', background: '#fff', fontFamily: 'inherit' }
const btn: React.CSSProperties = { padding: '6px 12px', borderRadius: 8, border: '1px solid #E2E2E2', background: '#fff', fontSize: 12.5, cursor: 'pointer' }

function Celula({ col, valor, onChange, nomes, invalido, oficialDe }: { col: Coluna; valor: string; onChange: (v: string) => void; nomes: string[]; invalido: boolean; oficialDe: (v: string) => string | undefined }) {
  const st = { ...inputBase, ...(invalido ? { borderColor: '#F87171', background: '#FEF2F2' } : {}) }
  if (col.tipo === 'data') return <input type="date" style={st} value={dataIso(valor) || ''} onChange={(e) => onChange(e.target.value)} />
  if (col.tipo === 'mes') return <input type="month" style={st} value={/^\d{4}-\d{2}$/.test(valor) ? valor : ''} onChange={(e) => onChange(e.target.value)} />
  if (col.tipo === 'numero') return <input inputMode="numeric" style={{ ...st, textAlign: 'right' }} value={valor} onChange={(e) => onChange(e.target.value)} />
  if (col.tipo === 'operador' || col.tipo === 'operadorOuTodas') {
    const fora = valor && !nomes.includes(valor)
    return (
      <select style={st} value={valor} onChange={(e) => onChange(e.target.value)}>
        <option value="">{col.tipo === 'operadorOuTodas' ? 'Todas (meta geral)' : 'Escolha…'}</option>
        {fora && <option value={valor}>{oficialDe(valor) ? `${valor} → será salvo como ${oficialDe(valor)}` : `${valor} (fora do cadastro)`}</option>}
        {nomes.map((n) => <option key={n} value={n}>{n}</option>)}
      </select>
    )
  }
  return <input style={st} value={valor} onChange={(e) => onChange(e.target.value)} />
}

function Tabela({
  tabela, operadores, onCarregado, onGravado, filtroMes,
}: {
  tabela: TabelaReservas
  operadores: string[][] | null
  /** chamado sempre que a tabela é lida da planilha (ex.: alimentar a lista de operadoras) */
  onCarregado?: (linhas: string[][]) => void
  /** chamado depois de gravar na planilha */
  onGravado?: () => void
  filtroMes?: string
}) {
  // refs: callbacks do pai podem mudar a cada render sem disparar nova leitura
  const aoCarregar = useRef(onCarregado)
  const aoGravar = useRef(onGravado)
  aoCarregar.current = onCarregado
  aoGravar.current = onGravado
  const spec = SPEC[tabela]
  const [linhas, setLinhas] = useState<string[][] | null>(null)
  const [original, setOriginal] = useState<string>('')
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const carregar = useCallback(async () => {
    setErroCarga(null)
    try {
      const res = await fetch(`/api/reservas/cadastros?tabela=${tabela}`, { cache: 'no-store' }).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      const ls: string[][] = (res.linhas || []).map((l: string[]) => COLUNAS[tabela].map((_, k) => String(l[k] ?? '')))
      // datas da planilha (DD/MM/AAAA) já no formato do campo
      const norm = validarTabela(tabela, ls).linhas
      setLinhas(norm)
      setOriginal(JSON.stringify(norm))
      aoCarregar.current?.(norm)
    } catch (e: any) {
      setErroCarga(e.message)
    }
  }, [tabela])

  useEffect(() => { carregar() }, [carregar])

  const nomes = useMemo(() => (operadores || []).map((l) => l[0]).filter(Boolean).sort((a, b) => a.localeCompare(b, 'pt-BR')), [operadores])
  const mapa = useMemo(() => (operadores ? mapaOperadores(operadores) : undefined), [operadores])
  const oficialDe = useCallback((v: string) => mapa?.get(semAcento(v)), [mapa])
  const validacao = useMemo(() => (linhas ? validarTabela(tabela, linhas, tabela === 'reservas_operadores' ? undefined : mapa) : null), [linhas, tabela, mapa])
  const errosPorLinha = useMemo(() => {
    const m = new Map<number, string[]>()
    validacao?.erros.forEach((e) => m.set(e.linha, [...(m.get(e.linha) || []), e.msg]))
    return m
  }, [validacao])
  const alterado = linhas != null && JSON.stringify(linhas) !== original

  const visiveis = useMemo(
    () => (linhas || []).map((l, i) => ({ l, i })).filter(({ l }) => !filtroMes || tabela !== 'reservas_escala' || l[0] === filtroMes || !l[0]),
    [linhas, filtroMes, tabela]
  )

  const set = (i: number, k: number, v: string) => setLinhas((ls) => (ls ? ls.map((l, j) => (j === i ? l.map((x, kk) => (kk === k ? v : x)) : l)) : ls))
  const novo = () => {
    const n = spec.novo()
    if (tabela === 'reservas_escala' && filtroMes) n[0] = filtroMes
    setLinhas((ls) => [...(ls || []), n])
  }

  async function salvar() {
    if (!linhas || !validacao || validacao.erros.length) return
    setSalvando(true)
    setMsg(null)
    try {
      const res = await fetch('/api/reservas/cadastros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tabela, linhas: validacao.linhas }),
      }).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      await carregar()
      aoGravar.current?.()
      setMsg({ ok: true, texto: `Salvo na planilha (${res.gravadas} linhas). Uma cópia da versão anterior ficou guardada na aba oculta _hub_backup.` })
    } catch (e: any) {
      setMsg({ ok: false, texto: e.message })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <section style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0D0F14' }}>{spec.titulo}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 3, maxWidth: 720 }}>{spec.descricao}</div>
        </div>
        <button style={btn} onClick={carregar} title="Recarregar da planilha">↻</button>
      </div>

      {erroCarga && <div style={{ fontSize: 12.5, color: '#92400E', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: 10, marginBottom: 10 }}>Não consegui ler a planilha: {erroCarga}</div>}
      {!linhas && !erroCarga && <div style={{ fontSize: 12.5, color: '#999' }}>Carregando…</div>}

      {linhas && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: '6px 4px', fontSize: 12.5 }}>
            <thead>
              <tr>
                {spec.colunas.map((c) => (
                  <th key={c.titulo} style={{ textAlign: 'left', fontWeight: 600, color: '#888', fontSize: 11.5, minWidth: c.largura }}>
                    {c.titulo}{c.ajuda && <span style={{ fontWeight: 400, color: '#bbb' }}> · {c.ajuda}</span>}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {visiveis.map(({ l, i }) => {
                const errs = errosPorLinha.get(i)
                return (
                  <tr key={i}>
                    {spec.colunas.map((c, k) => (
                      <td key={k}><Celula col={c} valor={l[k]} nomes={nomes} invalido={!!errs} oficialDe={oficialDe} onChange={(v) => set(i, k, v)} /></td>
                    ))}
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button style={{ ...btn, padding: '4px 8px' }} title="Duplicar linha" onClick={() => setLinhas((ls) => (ls ? [...ls.slice(0, i + 1), [...l], ...ls.slice(i + 1)] : ls))}>⧉</button>{' '}
                      <button style={{ ...btn, padding: '4px 8px', color: '#B91C1C' }} title="Remover linha" onClick={() => setLinhas((ls) => (ls ? ls.filter((_, j) => j !== i) : ls))}>✕</button>
                      {errs && <span style={{ color: '#B91C1C', fontSize: 11.5, marginLeft: 8 }}>{errs.join(' · ')}</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {tabela === 'reservas_escala' && filtroMes && visiveis.length === 0 && (
            <div style={{ fontSize: 12.5, color: '#999', padding: '6px 6px 0' }}>Nenhuma escala neste mês ainda.</div>
          )}
        </div>
      )}

      {msg && <div style={{ marginTop: 10, fontSize: 12.5, color: msg.ok ? '#3B6D11' : '#B91C1C' }}>{msg.ok ? '✓ ' : '⚠ '}{msg.texto}</div>}

      {linhas && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button style={btn} onClick={novo}>+ Adicionar linha</button>
          <button
            onClick={salvar}
            disabled={salvando || !alterado || !!validacao?.erros.length}
            style={{ ...btn, border: 'none', background: '#97A624', color: '#fff', fontWeight: 600, opacity: salvando || !alterado || validacao?.erros.length ? 0.5 : 1 }}
          >
            {salvando ? 'Salvando…' : 'Salvar na planilha'}
          </button>
          {alterado && <button style={btn} onClick={() => setLinhas(JSON.parse(original))}>Desfazer alterações</button>}
          {alterado && !validacao?.erros.length && <span style={{ fontSize: 12, color: '#4F6B14' }}>alterado, falta salvar</span>}
        </div>
      )}
    </section>
  )
}

export default function EquipeBonus({ hoje }: { hoje: string }) {
  const [operadores, setOperadores] = useState<string[][] | null>(null)
  const [mesEscala, setMesEscala] = useState((hoje || '').slice(0, 7))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12.5, color: '#666', lineHeight: 1.5, maxWidth: 900 }}>
        Tudo aqui é gravado direto na planilha <b>Comercial e Marketing - Reservas B2C</b> (abas OPERADORES, METAS_SEMANAIS e ESCALA),
        como se fosse editado lá. Mudanças no cadastro de operadoras entram nas reservas recentes na próxima atualização automática
        (de hora em hora; os últimos 60 dias são revistos todo dia de manhã). Para ver as outras abas com os dados novos, use o botão ↻ do topo.
      </div>
      <Tabela tabela="reservas_operadores" operadores={operadores} onCarregado={setOperadores} />
      <Tabela tabela="reservas_metas_semanais" operadores={operadores} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#666' }}>
        Escala do mês:
        <input type="month" value={mesEscala} onChange={(e) => e.target.value && setMesEscala(e.target.value)} style={{ ...inputBase, width: 170 }} />
      </div>
      <Tabela tabela="reservas_escala" operadores={operadores} filtroMes={mesEscala} />
    </div>
  )
}
