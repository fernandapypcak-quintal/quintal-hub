'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { UNITS, type UnitId } from '@/lib/units'
import { FILIAL_PAGAMENTO, periodoAtual, type TipoFolha } from '@/lib/gorjeta-config'
import {
  compute, aplicarDescontoAdiantamento, construirHistoricoEntry, cpfDigits,
  type Ativo, type Presenca, type HistoricoEntry, type ComputeResult,
} from '@/lib/gorjeta-engine'
import { parseAtivosXlsx, parsePresencaXlsx } from '@/lib/gorjeta-import'
import { useGorjeta } from './hooks/useGorjeta'

const MONO = { fontFamily: "'DM Mono', monospace" }
const UNIDADES_GORJETA = UNITS.filter(u => u.id !== 'holding')

function brl(v: number | undefined | null): string {
  return (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function Card({ label, valor, sub, accent }: { label: string; valor: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: '#fff', border: `1px solid ${accent ? '#97A624' : '#EBEBEB'}`, borderRadius: 10,
      padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      <span style={{ fontSize: 10.5, fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999' }}>{label}</span>
      <div style={{ ...MONO, fontSize: 21, fontWeight: 600, color: '#111' }}>{valor}</div>
      {sub && <div style={{ fontSize: 11.5, color: '#999' }}>{sub}</div>}
    </div>
  )
}

export default function GorjetaClientApp({
  allowedLojas, usuario, isAdmin,
}: { allowedLojas: UnitId[] | '*'; usuario: string; isAdmin: boolean }) {
  const unidadesPermitidas = useMemo(
    () => allowedLojas === '*' ? UNIDADES_GORJETA : UNIDADES_GORJETA.filter(u => allowedLojas.includes(u.id)),
    [allowedLojas]
  )

  const [unitId, setUnitId] = useState<UnitId | ''>(unidadesPermitidas[0]?.id ?? '')
  const periodoPadrao = useMemo(() => periodoAtual(), [])
  const [tipoFolha, setTipoFolha] = useState<TipoFolha>(periodoPadrao.tipo)
  const [inicio, setInicio] = useState(periodoPadrao.inicio)
  const [fim, setFim] = useState(periodoPadrao.fim)

  const { porUnidade, carregar } = useGorjeta()
  const estado = unitId ? porUnidade[unitId] : undefined

  const [ativos, setAtivos] = useState<Ativo[]>([])
  const [pres, setPres] = useState<Presenca>({})
  const [presImported, setPresImported] = useState(false)
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [erroImport, setErroImport] = useState<string | null>(null)

  // Histórico só em memória por enquanto (persistência em Supabase é a
  // próxima fatia) — dura a sessão da página, some ao recarregar.
  const [historicoPorUnidade, setHistoricoPorUnidade] = useState<Record<string, HistoricoEntry[]>>({})

  const ativosFileRef = useRef<HTMLInputElement>(null)
  const presFileRef = useRef<HTMLInputElement>(null)

  // Carrega automaticamente ao trocar de unidade ou período
  useEffect(() => {
    if (!unitId) return
    carregar(unitId, inicio, fim).catch(() => {})
    setAtivos([]); setPres({}); setPresImported(false); setMensagem(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitId, inicio, fim])

  const zig = estado?.zig ?? []
  const rank = estado?.rank ?? []

  const C: ComputeResult | null = useMemo(() => {
    if (!ativos.length && !zig.length) return null
    const base = compute(ativos, zig, rank, pres, presImported)
    const historico = unitId ? (historicoPorUnidade[unitId] ?? []) : []
    const ultimoAdiantamento = historico.find(h => h.tipo === 'adiantamento') ?? null
    return aplicarDescontoAdiantamento(base, tipoFolha, ultimoAdiantamento)
  }, [ativos, zig, rank, pres, presImported, tipoFolha, historicoPorUnidade, unitId])

  async function onImportAtivos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !unitId) return
    setErroImport(null)
    try {
      const filial = FILIAL_PAGAMENTO[unitId]
      const { ativos: novos, totalNoArquivo, funcoesNaoReconhecidas } = await parseAtivosXlsx(file, filial)
      setAtivos(novos)
      let msg = `✓ ${novos.length} colaborador(es) desta unidade (de ${totalNoArquivo} no arquivo todo).`
      if (funcoesNaoReconhecidas.length) msg += ` ⚠️ Funções não reconhecidas (0 pontos): ${funcoesNaoReconhecidas.join(' · ')}.`
      setMensagem(msg)
    } catch (err: any) { setErroImport(err.message) }
    e.target.value = ''
  }

  async function onImportPres(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setErroImport(null)
    try {
      const zigDatesBR = new Set(zig.map(z => z.data))
      const { pres: novaPres, ativosNovos, diasCasados, diasNoArquivo } = await parsePresencaXlsx(file, ativos, zigDatesBR)
      setPres(novaPres)
      setPresImported(true)
      if (ativosNovos.length) setAtivos(prev => [...prev, ...ativosNovos])
      let msg = `✓ Presença importada. Dias casados com a Gorjeta: ${diasCasados} de ${diasNoArquivo}.`
      if (ativosNovos.length) msg += ` ${ativosNovos.length} colaborador(es) novo(s) criado(s) a partir do nome.`
      if (diasCasados < diasNoArquivo) msg += ' ⚠️ Algumas datas do arquivo não existem na Gorjeta carregada.'
      setMensagem(msg)
    } catch (err: any) { setErroImport(err.message) }
    e.target.value = ''
  }

  function fecharQuinzena() {
    if (!C || !unitId) return
    if (!confirm(`Fechar a folha ${tipoFolha === 'mensal' ? 'Mensal' : 'Adiantamento'} de ${inicio} a ${fim}?`)) return
    const entry = construirHistoricoEntry(C, tipoFolha, `${inicio} a ${fim}`, usuario)
    setHistoricoPorUnidade(prev => {
      const atual = prev[unitId] ?? []
      const novo = [entry, ...atual].slice(0, 4)
      return { ...prev, [unitId]: novo }
    })
    setMensagem(`✓ Quinzena fechada (em memória — ainda não persistido no banco). Distribuído: ${brl(entry.distribuido)}.`)
  }

  function exportarPagamento() {
    if (!C || !unitId) return
    const filial = FILIAL_PAGAMENTO[unitId]
    const verba = C.tipoFolha === 'mensal' ? 139 : 169
    const nomeAba = C.tipoFolha === 'mensal' ? 'IMP_GORJ_M' : 'IMP_ADI'
    const colGorj = C.tipoFolha === 'mensal' ? 'GORJETA MENSAL' : 'GORJETA ADI'
    const aoa: (string | number)[][] = [['Filial', 'Matricula', 'VERBA', colGorj]]
    Object.values(C.res).forEach(r => {
      const val = C.tipoFolha === 'mensal' && r.pagarLiquido != null ? r.pagarLiquido : r.pagar
      if (val > 0.005) aoa.push([filial, r.mat, verba, Number(val.toFixed(2))])
    })
    if (aoa.length === 1) { alert('Nenhum valor a pagar para exportar.'); return }
    const ws = XLSX.utils.aoa_to_sheet(aoa)
    ws['!cols'] = [{ wch: 6.71 }, { wch: 8.43 }, { wch: 3.71 }, { wch: 12.71 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, nomeAba)
    const hoje = new Date()
    const stamp = `${String(hoje.getDate()).padStart(2, '0')}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${hoje.getFullYear()}`
    XLSX.writeFile(wb, `${nomeAba}_Filial_${filial}_${stamp}.xlsx`)
  }

  const unidadeAtual = UNIDADES_GORJETA.find(u => u.id === unitId)
  const rows = C ? Object.values(C.res).sort((a, b) => (b.pagar + b.ferias + b.resc) - (a.pagar + a.ferias + a.resc)) : []
  const semMatch = C ? Object.values(ativos).filter(a => /^GARCOM|^GARCONETE/i.test(a.funcao) && !C.matched.some(m => m.a.mat === a.mat)) : []

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '24px 20px 60px', fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Gorjeta — {unidadeAtual?.label ?? 'selecione a unidade'}</h1>
      <div style={{ fontSize: 13, color: '#777', marginBottom: 18 }}>
        Distribuição de gorjeta (33% retenção / 67% distribuído) — Adiantamento (25→10) e Mensal (11→24)
      </div>

      {/* Seletores */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 18 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#666' }}>
          Unidade
          <select value={unitId} onChange={e => setUnitId(e.target.value as UnitId)}
            style={{ height: 34, padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13.5 }}>
            {unidadesPermitidas.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#666' }}>
          Folha
          <select value={tipoFolha} onChange={e => setTipoFolha(e.target.value as TipoFolha)}
            style={{ height: 34, padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13.5 }}>
            <option value="adiantamento">Adiantamento (25→10)</option>
            <option value="mensal">Mensal (11→24)</option>
          </select>
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#666' }}>
          Início
          <input type="date" value={inicio} onChange={e => setInicio(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13.5 }} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12, color: '#666' }}>
          Fim
          <input type="date" value={fim} onChange={e => setFim(e.target.value)}
            style={{ height: 34, padding: '0 10px', border: '1px solid #E0E0E0', borderRadius: 8, fontSize: 13.5 }} />
        </label>
        <button onClick={() => unitId && carregar(unitId, inicio, fim)}
          style={{ height: 34, padding: '0 16px', background: '#97A624', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          🔄 Atualizar da Zig
        </button>
      </div>

      {estado?.loading && <div style={{ fontSize: 13, color: '#999', marginBottom: 12 }}>Carregando Gorjeta e Ranking da Zig...</div>}
      {estado?.erro && <div style={{ fontSize: 13, color: '#B91C1C', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>⚠️ {estado.erro}</div>}

      {/* Importações */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ flex: '1 1 260px', border: '1px dashed #D8D8D2', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Ativos (ATIVOS_GERAL)</div>
          <div style={{ fontSize: 11.5, color: '#888', marginBottom: 8 }}>Filtra sozinho pela Filial desta unidade ({FILIAL_PAGAMENTO[unitId as UnitId] || '—'}).</div>
          <input ref={ativosFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImportAtivos} />
        </div>
        <div style={{ flex: '1 1 260px', border: '1px dashed #D8D8D2', borderRadius: 10, padding: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Presença (Ponto TOTVS)</div>
          <div style={{ fontSize: 11.5, color: '#888', marginBottom: 8 }}>Pivot Nome × Data — casa por nome com os Ativos.</div>
          <input ref={presFileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImportPres} />
        </div>
      </div>

      {mensagem && <div style={{ fontSize: 12.5, color: '#166534', background: '#F0FDF4', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>{mensagem}</div>}
      {erroImport && <div style={{ fontSize: 12.5, color: '#B91C1C', background: '#FEF2F2', padding: '8px 12px', borderRadius: 8, marginBottom: 12 }}>⚠️ {erroImport}</div>}

      {C && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 20 }}>
            <Card label="Gorjeta bruta" valor={brl(C.brutoTot)} sub={`${C.days} dias`} />
            <Card label="Retenção casa · 33%" valor={brl(C.retidoTot)} />
            <Card label="A distribuir · 67%" valor={brl(C.distribTot)} />
            <Card label="Bolo Salão" valor={brl(C.poolSalaoTot)} sub={`${(C.pctSalao * 100).toFixed(1)}% · ${C.ptsSalao} pts`} />
            <Card label="Bolo Retaguarda" valor={brl(C.poolRetagTot)} sub={`${(C.pctRetag * 100).toFixed(1)}% · ${C.ptsRetag} pts`} />
            {C.sobra > 0.005 && <Card label="Sobra (não distribuída)" valor={brl(C.sobra)} sub="dias sem ninguém presente" />}
            {C.tipoFolha === 'mensal' && (
              <>
                <Card label="Já pago no Adiantamento" valor={brl(Object.values(C.res).reduce((s, r) => s + (r.descontoAdiant || 0), 0))}
                  sub={C.adiantRef ? C.adiantRef.label : 'nenhum Adiantamento fechado ainda'} />
                <Card accent label="Líquido a pagar · Mensal" valor={brl(Object.values(C.res).reduce((s, r) => s + (r.pagarLiquido ?? r.pagar), 0))}
                  sub="apurado do mês − já pago no Adiantamento" />
              </>
            )}
          </div>

          {semMatch.length > 0 && (
            <div style={{ fontSize: 12.5, color: '#92400E', background: '#FFFBEB', padding: '8px 12px', borderRadius: 8, marginBottom: 14 }}>
              ⚠️ {semMatch.length} garçom(ns) não casaram com o Ranking (nem por CPF, nem por nome): {semMatch.map(a => a.nome.split(' ').slice(0, 2).join(' ')).join(' · ')}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button onClick={fecharQuinzena}
              style={{ padding: '8px 16px', background: '#0D0D0D', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ✓ Fechar quinzena
            </button>
            <button onClick={exportarPagamento}
              style={{ padding: '8px 16px', background: '#fff', color: '#0D0D0D', border: '1px solid #D8D8D2', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              ⬇️ Planilha de pagamento (.xlsx)
            </button>
          </div>

          <div style={{ background: '#fff', border: '1px solid #EBEBEB', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#FAFAF8', textAlign: 'left' }}>
                  <th style={{ padding: '8px 12px' }}>Colaborador</th>
                  <th style={{ padding: '8px 12px' }}>Função</th>
                  <th style={{ padding: '8px 12px' }}>Setor</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>A pagar</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Férias</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Rescisão</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.mat} style={{ borderTop: '1px solid #F2F2ED' }}>
                    <td style={{ padding: '7px 12px' }}>{r.nome}{r.hasR ? ' 🔴' : ''}</td>
                    <td style={{ padding: '7px 12px', color: '#888', fontSize: 12 }}>{r.funcao}</td>
                    <td style={{ padding: '7px 12px' }}>{r.setor}</td>
                    <td style={{ ...MONO, padding: '7px 12px', textAlign: 'right' }}>
                      {brl(r.pagar)}
                      {C.tipoFolha === 'mensal' && r.pagarLiquido != null && (
                        <div style={{ fontSize: 10.5, color: '#999' }}>líq. {brl(r.pagarLiquido)}</div>
                      )}
                    </td>
                    <td style={{ ...MONO, padding: '7px 12px', textAlign: 'right', color: '#B45309' }}>{r.ferias > 0 ? brl(r.ferias) : '—'}</td>
                    <td style={{ ...MONO, padding: '7px 12px', textAlign: 'right', color: '#B91C1C' }}>{r.resc > 0 ? brl(r.resc) : '—'}</td>
                    <td style={{ ...MONO, padding: '7px 12px', textAlign: 'right', fontWeight: 600 }}>{brl(r.pagar + r.ferias + r.resc)}</td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={7} style={{ padding: 24, textAlign: 'center', color: '#999' }}>Importe os Ativos para ver o relatório.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {!C && !estado?.loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13.5 }}>
          Selecione a unidade e importe os Ativos para começar.
        </div>
      )}
    </div>
  )
}
