// app/hub/_componentes/MetasFaixasEditor.tsx
// Editor de METAS MENSAIS EM 3 FAIXAS (e desafio opcional), usado pelas telas
// "Metas" do Comercial (R$) e de Reservas (nº de reservas). Mostra os 12 meses
// do ano, grava só os meses alterados via `endpoint` (que escreve na planilha
// pelo Apps Script QuintalFaturamentoMetas.gs, alvo comercial/reservas).

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

type LinhaPlanilha = {
  mes: string
  faixa1: number | null; faixa2: number | null; faixa3: number | null
  desafio?: number | null
  Atualizado_Por?: string; Atualizado_Em?: string
}
type Campos = { faixa1: string; faixa2: string; faixa3: string; desafio: string }
type Chave = keyof Campos

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const FAIXAS: Chave[] = ['faixa1', 'faixa2', 'faixa3']

// "1.250.000,50" / "1250000.5" / "980.000" → número
export function lerValor(txt: string): number | null {
  const s = String(txt ?? '').trim().replace(/[R$\s]/g, '')
  if (!s) return null
  const normal = s.includes(',')
    ? s.replace(/\./g, '').replace(',', '.')
    : /^\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, '') : s
  const n = Number(normal)
  return Number.isFinite(n) ? n : NaN
}

export default function MetasFaixasEditor({
  titulo,
  descricao,
  endpoint,
  formato,
  comDesafio = false,
  onSalvo,
}: {
  titulo: string
  descricao: React.ReactNode
  /** rota do hub: GET ?ano=AAAA e POST { metas } */
  endpoint: string
  /** 'moeda' = R$ com centavos · 'quantidade' = número inteiro */
  formato: 'moeda' | 'quantidade'
  comDesafio?: boolean
  onSalvo?: () => void
}) {
  const moeda = formato === 'moeda'
  const fmt = (n: number | null | undefined) =>
    n == null || Number.isNaN(n) ? '' : n.toLocaleString('pt-BR', moeda ? { minimumFractionDigits: 2, maximumFractionDigits: 2 } : { maximumFractionDigits: 0 })
  const unidade = moeda ? '(R$)' : '(reservas)'

  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [linhas, setLinhas] = useState<LinhaPlanilha[]>([])
  const [form, setForm] = useState<Record<string, Campos>>({})
  const [carregando, setCarregando] = useState(true)
  const [erroCarga, setErroCarga] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null)

  const mesesDoAno = useMemo(() => MESES.map((nome, i) => ({ nome, chave: `${ano}-${String(i + 1).padStart(2, '0')}` })), [ano])
  const colunas: Chave[] = comDesafio ? [...FAIXAS, 'desafio'] : FAIXAS

  const carregar = useCallback(async () => {
    setCarregando(true)
    setErroCarga(null)
    try {
      const res = await fetch(`${endpoint}?ano=${ano}`, { cache: 'no-store' }).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      setLinhas(res.metas || [])
    } catch (e: any) {
      setErroCarga(e.message)
      setLinhas([])
    } finally {
      setCarregando(false)
    }
  }, [ano, endpoint])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    const novo: Record<string, Campos> = {}
    mesesDoAno.forEach(({ chave }) => {
      const l = linhas.find((x) => x.mes === chave)
      novo[chave] = { faixa1: fmt(l?.faixa1), faixa2: fmt(l?.faixa2), faixa3: fmt(l?.faixa3), desafio: fmt(l?.desafio) }
    })
    setForm(novo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, mesesDoAno])

  const estado = useMemo(() => {
    const salvos = linhas.map((l) => l.faixa1).filter((v): v is number => !!v && v > 0).sort((a, b) => a - b)
    const mediana = salvos.length ? salvos[Math.floor(salvos.length / 2)] : null
    return mesesDoAno.map(({ nome, chave }) => {
      const f = form[chave] || { faixa1: '', faixa2: '', faixa3: '', desafio: '' }
      const v = FAIXAS.map((k) => lerValor(f[k]))
      const desafio = comDesafio ? lerValor(f.desafio) : null
      const salvo = linhas.find((x) => x.mes === chave)
      const vazio = v.every((x) => x == null) && desafio == null
      const alterado = !vazio && (
        FAIXAS.some((k, i) => (salvo?.[k] ?? null) !== v[i]) ||
        (comDesafio && (salvo?.desafio ?? null) !== desafio)
      )
      let erro: string | null = null
      if (!vazio) {
        if (v.some((x) => x == null)) erro = 'Preencha as 3 faixas'
        else if (v.some((x) => Number.isNaN(x) || (x as number) <= 0) || Number.isNaN(desafio)) erro = 'Valor inválido'
        else if (!((v[0] as number) <= (v[1] as number) && (v[1] as number) <= (v[2] as number))) erro = 'As faixas precisam ser crescentes'
        else if (desafio != null && desafio < (v[2] as number)) erro = 'O desafio precisa ser maior que a Faixa 3'
      }
      const foraDoPadrao = !erro && !vazio && mediana != null && (v[0] as number) > mediana * 3
      return { nome, chave, salvo, alterado, erro, foraDoPadrao, valores: v, desafio }
    })
  }, [form, linhas, mesesDoAno, comDesafio])

  const paraSalvar = estado.filter((e) => e.alterado && !e.erro)
  const temErro = estado.some((e) => e.alterado && e.erro)

  async function salvar() {
    if (!paraSalvar.length || temErro) return
    setSalvando(true)
    setMsg(null)
    try {
      const metas = paraSalvar.map((e) => ({
        mes: e.chave, faixa1: e.valores[0], faixa2: e.valores[1], faixa3: e.valores[2],
        ...(comDesafio ? { desafio: e.desafio } : {}),
      }))
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metas }),
      }).then((r) => r.json())
      if (res.erro) throw new Error(res.erro)
      await carregar()
      onSalvo?.()
      setMsg({ ok: true, texto: `Salvo na planilha: ${paraSalvar.map((e) => e.nome.toLowerCase()).join(', ')}.` })
    } catch (e: any) {
      setMsg({ ok: false, texto: e.message })
    } finally {
      setSalvando(false)
    }
  }

  const input = (chave: string, k: Chave, invalido: boolean) => (
    <input
      inputMode="decimal"
      value={form[chave]?.[k] ?? ''}
      placeholder="—"
      onChange={(ev) => setForm((f) => ({ ...f, [chave]: { ...f[chave], [k]: ev.target.value } }))}
      onBlur={() => {
        const n = lerValor(form[chave]?.[k] ?? '')
        if (n != null && !Number.isNaN(n)) setForm((f) => ({ ...f, [chave]: { ...f[chave], [k]: fmt(n) } }))
      }}
      style={{
        width: '100%', padding: '6px 10px', borderRadius: 8, fontSize: 13, textAlign: 'right',
        fontVariantNumeric: 'tabular-nums', border: `1px solid ${invalido ? '#F87171' : '#E2E2E2'}`,
        background: invalido ? '#FEF2F2' : '#fff',
      }}
    />
  )

  const resumo = (l: LinhaPlanilha) =>
    moeda
      ? `Faixa 3 R$ ${((l.faixa3 || 0) / 1e6).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} mi`
      : `Faixa 3: ${fmt(l.faixa3)} reservas`

  const anoAtual = new Date().getFullYear()
  const card: React.CSSProperties = { background: '#fff', border: '1px solid #EBEBEB', borderRadius: 12 }
  const rotulo: Record<Chave, string> = { faixa1: 'Faixa 1', faixa2: 'Faixa 2', faixa3: 'Faixa 3', desafio: 'Desafio' }

  return (
    <div style={{ padding: 20, maxWidth: comDesafio ? 1100 : 980 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#0D0F14' }}>{titulo}</div>
          <div style={{ fontSize: 12.5, color: '#888', marginTop: 4, maxWidth: 660 }}>{descricao}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select value={ano} onChange={(e) => setAno(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E2E2', fontSize: 13 }}>
            {[anoAtual - 1, anoAtual, anoAtual + 1].map((a) => <option key={a} value={String(a)}>{a}</option>)}
          </select>
          <button onClick={carregar} title="Recarregar da planilha" style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #E2E2E2', background: '#fff', fontSize: 13, cursor: 'pointer' }}>
            {carregando ? '…' : '↻'}
          </button>
        </div>
      </div>

      {erroCarga && (
        <div style={{ ...card, background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E', padding: 12, fontSize: 13, marginBottom: 12 }}>
          Não consegui ler a planilha agora: {erroCarga}
        </div>
      )}

      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', minWidth: comDesafio ? 780 : 640, borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#FAFAF8', color: '#888', fontSize: 11.5, textAlign: 'left' }}>
              <th style={{ padding: '9px 14px', fontWeight: 600 }}>Mês</th>
              {colunas.map((k) => (
                <th key={k} style={{ padding: '9px 8px', fontWeight: 600, textAlign: 'right', width: moeda ? 170 : 130 }}>
                  {rotulo[k]} {k === 'desafio' ? '(opcional)' : unidade}
                </th>
              ))}
              <th style={{ padding: '9px 14px', fontWeight: 600, width: 200 }}></th>
            </tr>
          </thead>
          <tbody>
            {estado.map((e) => (
              <tr key={e.chave} style={{ borderTop: '1px solid #F3F3F3', background: e.alterado ? '#F7FAEE' : undefined }}>
                <td style={{ padding: '7px 14px', fontWeight: 500, color: '#1a1a1a' }}>{e.nome}</td>
                {colunas.map((k) => <td key={k} style={{ padding: '6px 8px' }}>{input(e.chave, k, !!e.erro && e.alterado)}</td>)}
                <td style={{ padding: '7px 14px', fontSize: 11.5, lineHeight: 1.35 }}>
                  {e.erro && e.alterado ? (
                    <span style={{ color: '#B91C1C' }}>{e.erro}</span>
                  ) : e.foraDoPadrao ? (
                    <span style={{ color: '#B45309' }}>⚠ Bem acima dos outros meses: confira se não sobrou um zero</span>
                  ) : e.alterado ? (
                    <span style={{ color: '#4F6B14' }}>alterado, falta salvar</span>
                  ) : e.salvo?.Atualizado_Em ? (
                    <span style={{ color: '#aaa' }}>{e.salvo.Atualizado_Por?.split('@')[0]} · {e.salvo.Atualizado_Em}</span>
                  ) : e.salvo ? (
                    <span style={{ color: '#aaa' }}>na planilha · {resumo(e.salvo)}</span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {msg && <div style={{ marginTop: 12, fontSize: 13, color: msg.ok ? '#3B6D11' : '#B91C1C' }}>{msg.ok ? '✓ ' : '⚠ '}{msg.texto}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
        <button
          onClick={salvar}
          disabled={salvando || !paraSalvar.length || temErro}
          style={{
            padding: '9px 16px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 600, color: '#fff',
            background: '#97A624', cursor: 'pointer', opacity: salvando || !paraSalvar.length || temErro ? 0.5 : 1,
          }}
        >
          {salvando ? 'Salvando na planilha…' : paraSalvar.length ? `Salvar ${paraSalvar.length} ${paraSalvar.length === 1 ? 'mês' : 'meses'}` : 'Nada para salvar'}
        </button>
        <span style={{ fontSize: 12, color: '#999' }}>
          Só os meses alterados (em verde) são gravados.{moeda ? ' Aceita 1.250.000,00.' : ''}
        </span>
      </div>
    </div>
  )
}
