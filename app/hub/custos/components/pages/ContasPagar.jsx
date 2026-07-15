import React, { useState, useMemo } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import Header from '../layout/Header.jsx'
import StatusBadge from '../ui/StatusBadge.jsx'
import PainelDetalhe from '../ui/PainelDetalhe.jsx'
import { fmt, fmtData, diasAteVencimento } from '../../utils.js'
import { Search, AlertTriangle, Clock, CheckCircle } from 'lucide-react'

const MONO = { fontFamily: "'DM Mono', monospace" }

const TH = ({ children, right }) => (
  <th style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: '#0D0D0D', padding: '10px 14px', textAlign: right ? 'right' : 'left', whiteSpace: 'nowrap' }}>
    {children}
  </th>
)

function SummaryCard({ icon: Icon, label, valor, color, bg, onClick, ativo }) {
  return (
    <div onClick={onClick} style={{ background: ativo ? '#0D0D0D' : '#fff', border: `1px solid ${ativo ? '#0D0D0D' : '#E8E8E2'}`, borderRadius: 8, padding: '14px 18px', cursor: onClick ? 'pointer' : 'default', transition: 'all 0.12s', display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 36, height: 36, borderRadius: 8, background: ativo ? '#1a1a1a' : bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={16} color={ativo ? '#fff' : color} />
      </div>
      <div>
        <div style={{ fontSize: 10.5, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: ativo ? '#888' : '#8A8A7A', marginBottom: 3 }}>{label}</div>
        <div style={{ ...MONO, fontSize: 18, fontWeight: 700, color: ativo ? '#fff' : '#0D0D0D' }}>{valor}</div>
      </div>
    </div>
  )
}

export default function ContasPagar() {
  const { contasFiltradas } = useFinanceiro()
  const [busca,          setBusca]          = useState('')
  const [statusFiltro,   setStatusFiltro]   = useState('todos')
  const [catFiltro,      setCatFiltro]      = useState('todas')
  const [contaSelecionada, setContaSelecionada] = useState(null)
  const [sortKey,  setSortKey]  = useState('vencimento')
  const [sortDir,  setSortDir]  = useState('asc')

  const hoje  = new Date(); hoje.setHours(0,0,0,0)
  const em7d  = new Date(hoje.getTime() + 7 * 86400000)

  // ── Resumos ────────────────────────────────────────────────
  const resumo = useMemo(() => {
    const vencido  = contasFiltradas.filter(c => c.status === 'vencido')
    const em7dias  = contasFiltradas.filter(c => {
      if (c.status !== 'pendente') return false
      const d = new Date(c.vencimento); return d >= hoje && d <= em7d
    })
    const pendente = contasFiltradas.filter(c => c.status === 'pendente')
    const pago     = contasFiltradas.filter(c => c.status === 'pago')
    return {
      vencido:  { qtd: vencido.length,  total: vencido.reduce((s,c)  => s+c.valor, 0) },
      em7dias:  { qtd: em7dias.length,  total: em7dias.reduce((s,c)  => s+c.valor, 0) },
      pendente: { qtd: pendente.length, total: pendente.reduce((s,c) => s+c.valor, 0) },
      pago:     { qtd: pago.length,     total: pago.reduce((s,c)     => s+c.valor, 0) },
    }
  }, [contasFiltradas])

  const categorias = useMemo(() => {
    const set = new Set(contasFiltradas.map(c => c.categoria))
    return ['todas', ...Array.from(set).sort()]
  }, [contasFiltradas])

  // ── Dados filtrados ────────────────────────────────────────
  const dados = useMemo(() => {
    let r = contasFiltradas
    if (busca)               r = r.filter(c => [c.nome, c.fornecedor, c.categoria, c.centro].some(f => f.toLowerCase().includes(busca.toLowerCase())))
    if (statusFiltro !== 'todos') {
      if (statusFiltro === 'em7dias') {
        r = r.filter(c => {
          if (c.status !== 'pendente') return false
          const d = new Date(c.vencimento); return d >= hoje && d <= em7d
        })
      } else {
        r = r.filter(c => c.status === statusFiltro)
      }
    }
    if (catFiltro !== 'todas') r = r.filter(c => c.categoria === catFiltro)

    return [...r].sort((a, b) => {
      let va = a[sortKey], vb = b[sortKey]
      if (sortKey === 'valor') { va = Number(va); vb = Number(vb) }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [contasFiltradas, busca, statusFiltro, catFiltro, sortKey, sortDir])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const THSort = ({ children, k, right }) => (
    <th onClick={() => toggleSort(k)} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#fff', background: '#0D0D0D', padding: '10px 14px', textAlign: right ? 'right' : 'left', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
      {children} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div>
      <Header title="Contas a Pagar" />
      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* ── Cards de resumo / filtro rápido ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
          <SummaryCard icon={AlertTriangle} label="Vencido"       valor={fmt(resumo.vencido.total)}  color="#8C1414" bg="#F5DCDC" onClick={() => setStatusFiltro(statusFiltro === 'vencido'  ? 'todos' : 'vencido')}  ativo={statusFiltro === 'vencido'} />
          <SummaryCard icon={Clock}         label="Vence em 7 dias" valor={fmt(resumo.em7dias.total)} color="#D9B504" bg="#FDF8DC" onClick={() => setStatusFiltro(statusFiltro === 'em7dias'  ? 'todos' : 'em7dias')}  ativo={statusFiltro === 'em7dias'} />
          <SummaryCard icon={Clock}         label="Pendente"      valor={fmt(resumo.pendente.total)} color="#D9B504" bg="#FDF8DC" onClick={() => setStatusFiltro(statusFiltro === 'pendente' ? 'todos' : 'pendente')} ativo={statusFiltro === 'pendente'} />
          <SummaryCard icon={CheckCircle}   label="Pago no mês"   valor={fmt(resumo.pago.total)}     color="#97A624" bg="#EEF5D5" onClick={() => setStatusFiltro(statusFiltro === 'pago'     ? 'todos' : 'pago')}     ativo={statusFiltro === 'pago'} />
        </div>

        {/* ── Barra de busca + filtro categoria ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#B0B0A0' }} />
            <input value={busca} onChange={e => setBusca(e.target.value)} placeholder="Buscar conta, fornecedor, unidade..."
              style={{ width: '100%', padding: '7px 10px 7px 32px', border: '1px solid #E8E8E2', borderRadius: 6, fontSize: 13, background: '#fff', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <select value={catFiltro} onChange={e => setCatFiltro(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #E8E8E2', borderRadius: 5, fontSize: 12, background: '#fff', cursor: 'pointer' }}>
            {categorias.map(c => <option key={c} value={c}>{c === 'todas' ? 'Todas categorias' : c}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#8A8A7A' }}>
            <span style={{ ...MONO, fontWeight: 600, color: '#0D0D0D' }}>{dados.length}</span> contas ·{' '}
            <span style={{ ...MONO, fontWeight: 600, color: '#0D0D0D' }}>{fmt(dados.reduce((s,c) => s+c.valor, 0))}</span>
          </div>
        </div>

        {/* ── Tabela ── */}
        <div style={{ background: '#fff', border: '1px solid #E8E8E2', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <TH>Status</TH>
                  <THSort k="nome">Nome</THSort>
                  <TH>Fornecedor</TH>
                  <TH>Unidade</TH>
                  <TH>Categoria</TH>
                  <THSort k="vencimento">Vencimento</THSort>
                  <THSort k="valor" right>Valor</THSort>
                  <TH>Prazo</TH>
                </tr>
              </thead>
              <tbody>
                {dados.map(c => {
                  const dias = diasAteVencimento(c.vencimento)
                  const vencido = c.status === 'vencido'
                  const urgente = !vencido && dias !== null && dias <= 7
                  const diasLabel = c.status === 'pago' ? '—'
                    : dias === null ? '—'
                    : vencido ? `${Math.abs(dias)}d atraso`
                    : dias === 0 ? 'hoje'
                    : `${dias}d`
                  const diasColor = c.status === 'pago' ? '#B0B0A0' : vencido ? '#8C1414' : urgente ? '#D9B504' : '#6A6A5A'

                  return (
                    <tr key={c.id} onClick={() => setContaSelecionada(c)}
                      style={{ cursor: 'pointer', background: vencido ? '#FFF8F8' : 'transparent' }}
                      onMouseEnter={e => e.currentTarget.style.background = vencido ? '#FFF0F0' : '#FAFAF8'}
                      onMouseLeave={e => e.currentTarget.style.background = vencido ? '#FFF8F8' : 'transparent'}>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8' }}>
                        <StatusBadge status={c.status} />
                      </td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8', fontSize: 13, fontWeight: 500, color: '#0D0D0D', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.nome}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8', fontSize: 12, color: '#6A6A5A', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.fornecedor}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8', fontSize: 12, color: '#6A6A5A', whiteSpace: 'nowrap' }}>{c.centro}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8', fontSize: 12, color: '#6A6A5A', whiteSpace: 'nowrap' }}>{c.categoria}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8', ...MONO, fontSize: 12 }}>{fmtData(c.vencimento)}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8', ...MONO, fontSize: 13, fontWeight: 700, textAlign: 'right' }}>{fmt(c.valor)}</td>
                      <td style={{ padding: '10px 14px', borderBottom: '1px solid #F0F0E8', ...MONO, fontSize: 12, fontWeight: 700, color: diasColor, whiteSpace: 'nowrap' }}>{diasLabel}</td>
                    </tr>
                  )
                })}
                {dados.length === 0 && (
                  <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#B0B0A0', fontSize: 13 }}>Nenhuma conta encontrada</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      <PainelDetalhe conta={contaSelecionada} onClose={() => setContaSelecionada(null)} />
    </div>
  )
}
