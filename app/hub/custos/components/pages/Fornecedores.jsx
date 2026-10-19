import React, { useMemo, useState } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { fmtK, mesISOLabel } from '../../utils.js'
import { COR, num, Painel, Kpi, GradeKpis, NomeBU, Abas, Busca, Tabela, SemDadosNF, botaoSecundario } from '../ui/nf.jsx'

// v27 — Fornecedores: prazo real de pagamento (entrada da nota → baixa),
// faixa de variação e prazo combinado (coluna Prazo_Acordado da planilha).

const ESCALA = 60   // dias mostrados na régua de prazo

function situacao(p) {
  if (!p || p.mediana === null || p.nfs_pagas < 3) return { id: 'sem', txt: 'Pouco histórico', cor: COR.fraco }
  if (p.acordado !== null && Math.abs(p.mediana - p.acordado) > 5) return { id: 'fora', txt: p.mediana > p.acordado ? `Pagando ${p.mediana - p.acordado}d depois do combinado` : `Pagando ${p.acordado - p.mediana}d antes do combinado`, cor: COR.alerta }
  if (p.p75 - p.p25 > 15) return { id: 'irregular', txt: 'Prazo irregular', cor: '#7A5A00' }
  return { id: 'estavel', txt: 'Estável', cor: COR.verde }
}

function ReguaPrazo({ p, cor }) {
  if (!p || p.mediana === null) return <span style={{ color: COR.fraco, fontSize: 12 }}>—</span>
  const x = d => `${Math.min(100, Math.max(0, (d / ESCALA) * 100))}%`
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div aria-hidden="true" style={{ position: 'relative', width: 140, height: 14, flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 6, left: 0, right: 0, height: 2, background: '#EEEDE6', borderRadius: 1 }} />
        <div style={{ position: 'absolute', top: 4, left: x(p.p25), width: `calc(${x(p.p75)} - ${x(p.p25)})`, minWidth: 3, height: 6, background: cor, opacity: 0.35, borderRadius: 3 }} />
        <div style={{ position: 'absolute', top: 2, left: x(p.mediana), width: 10, height: 10, marginLeft: -5, borderRadius: '50%', background: cor }} />
        {p.acordado !== null && <div title="combinado" style={{ position: 'absolute', top: 0, left: x(p.acordado), width: 2, height: 14, marginLeft: -1, background: COR.texto }} />}
      </div>
      <span style={{ ...num, fontSize: 13 }}>{p.mediana}d</span>
      <span style={{ ...num, fontSize: 11, color: COR.suave }}>{p.p25}–{p.p75}d</span>
    </div>
  )
}

export default function Fornecedores() {
  const { nfResumo, corBU, grupoBU, mesNF, buFiltro } = useFinanceiro()
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState('todos')
  const [ordem, setOrdem] = useState('mes')
  const [limite, setLimite] = useState(100)

  const base = useMemo(() => {
    if (!nfResumo) return []
    const doMes = {}, doAno = {}
    nfResumo.fornecedores.forEach(f => {
      const k = f.cod_for || f.fornecedor
      if (f.mes === mesNF) { doMes[k] = doMes[k] || { valor: 0, qtd: 0 }; doMes[k].valor += f.valor; doMes[k].qtd += f.qtd }
      if (f.mes.substring(0, 4) === mesNF.substring(0, 4)) doAno[k] = (doAno[k] || 0) + f.valor
    })
    return nfResumo.prazos.map(p => {
      const k = p.cod_for || p.fornecedor
      return { ...p, chave: k, valorMes: doMes[k] ? doMes[k].valor : 0, qtdMes: doMes[k] ? doMes[k].qtd : 0, valorAno: doAno[k] || 0, sit: situacao(p) }
    }).filter(p => p.valorAno > 0 || p.valorMes > 0)
  }, [nfResumo, mesNF])

  if (!nfResumo) return <SemDadosNF />

  const porBU = base.filter(p => buFiltro === 'Todas' ? grupoBU(p.bu) !== 'Fora dos totais' : p.bu === buFiltro)
  const comHist = porBU.filter(p => p.sit.id !== 'sem')
  const pesoTot = comHist.reduce((s, p) => s + p.valorAno, 0)
  const prazoMedio = pesoTot ? Math.round(comHist.reduce((s, p) => s + p.mediana * p.valorAno, 0) / pesoTot) : null
  const estaveis = comHist.filter(p => p.sit.id === 'estavel')
  const pctEstavelValor = pesoTot ? Math.round(estaveis.reduce((s, p) => s + p.valorAno, 0) / pesoTot * 100) : 0
  const combinados = porBU.filter(p => p.acordado !== null)
  const fora = porBU.filter(p => p.sit.id === 'fora')

  const b = busca.trim().toUpperCase()
  const ordenar = { mes: (x, y) => y.valorMes - x.valorMes || y.valorAno - x.valorAno, ano: (x, y) => y.valorAno - x.valorAno, prazo: (x, y) => (y.mediana ?? -1) - (x.mediana ?? -1) }
  const linhas = porBU
    .filter(p => filtro === 'todos' || (filtro === 'mes' ? p.valorMes > 0 : p.sit.id === filtro))
    .filter(p => !b || p.fornecedor.toUpperCase().includes(b) || p.cod_for === b)
    .sort(ordenar[ordem])
  const label = mesISOLabel(mesNF)

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, width: '100%', boxSizing: 'border-box' }}>
      <GradeKpis>
        <Kpi rotulo="Prazo médio real" valor={prazoMedio === null ? '—' : `${prazoMedio} dias`} detalhe="da entrada da nota ao pagamento, ponderado pelo valor do ano" />
        <Kpi rotulo="Pagos num prazo estável" valor={`${pctEstavelValor}%`} detalhe={`do valor do ano · ${estaveis.length} fornecedores`} />
        <Kpi rotulo="Com prazo combinado" valor={combinados.length.toLocaleString('pt-BR')} detalhe="preencha Prazo_Acordado na aba Prazo_Fornecedor" />
        <Kpi alerta={fora.length > 0} rotulo="Fora do combinado" valor={fora.length.toLocaleString('pt-BR')} detalhe="mediana real a mais de 5 dias do combinado" />
      </GradeKpis>

      <Painel titulo={`Fornecedores${buFiltro !== 'Todas' ? ` de ${buFiltro}` : ''}`}
        extra={<span style={{ display: 'inline-flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>● mediana</span><span>▬ metade dos pagamentos cai nessa faixa</span><span>│ combinado</span>
        </span>}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Abas ativa={filtro} onChange={f => { setFiltro(f); setLimite(100) }} abas={[
            { id: 'todos', label: 'Todos', qtd: porBU.length },
            { id: 'mes', label: `Com nota em ${label}`, qtd: porBU.filter(p => p.valorMes > 0).length },
            { id: 'fora', label: 'Fora do combinado', qtd: fora.length },
            { id: 'irregular', label: 'Prazo irregular', qtd: porBU.filter(p => p.sit.id === 'irregular').length },
          ]} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={ordem} onChange={e => setOrdem(e.target.value)} aria-label="Ordenar" style={{ ...botaoSecundario, padding: '7px 10px' }}>
              <option value="mes">Maior valor em {label}</option>
              <option value="ano">Maior valor no ano</option>
              <option value="prazo">Maior prazo</option>
            </select>
            <Busca valor={busca} onChange={v => { setBusca(v); setLimite(100) }} />
          </div>
        </div>
        <Tabela linhas={linhas.slice(0, limite)} chave={l => l.chave} minWidth={940} vazio="Nenhum fornecedor nesse filtro." colunas={[
          { id: 'fornecedor', label: 'Fornecedor', render: l => <div><div style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div><div style={{ fontSize: 11, color: COR.suave }}>cód. {l.cod_for || '—'} · {l.nfs_pagas} notas pagas</div></div> },
          { id: 'bu', label: 'BU', render: l => <NomeBU bu={l.bu} cor={corBU(l.bu)} /> },
          { id: 'valorMes', label: `Notas em ${label}`, direita: true, mono: true, render: l => l.valorMes ? <div>{fmtK(l.valorMes)}<div style={{ fontSize: 11, color: COR.suave }}>{l.qtdMes} notas</div></div> : '—' },
          { id: 'valorAno', label: 'No ano', direita: true, mono: true, render: l => fmtK(l.valorAno) },
          { id: 'prazo', label: 'Prazo real', render: l => <ReguaPrazo p={l} cor={corBU(l.bu)} /> },
          { id: 'acordado', label: 'Combinado', direita: true, mono: true, render: l => l.acordado === null ? '—' : `${l.acordado}d` },
          { id: 'sit', label: 'Situação', render: l => <span style={{ fontSize: 12, color: l.sit.cor, fontWeight: l.sit.id === 'fora' ? 600 : 400 }}>{l.sit.txt}</span> },
        ]} />
        {linhas.length > limite && (
          <div style={{ marginTop: 12 }}>
            <button onClick={() => setLimite(l => l + 200)} style={botaoSecundario}>Mostrar mais {Math.min(200, linhas.length - limite)} de {linhas.length - limite}</button>
          </div>
        )}
      </Painel>
    </div>
  )
}
