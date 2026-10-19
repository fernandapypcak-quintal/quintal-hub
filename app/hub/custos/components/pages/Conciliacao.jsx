import React, { useState } from 'react'
import { useFinanceiro } from '../../hooks/useFinanceiro.jsx'
import { loadConciliacao } from '../../data/loader.js'
import { fmt, fmtData, mesISOLabel } from '../../utils.js'
import { COR, Painel, NomeBU, Abas, Busca, Tabela, Carregando, Erro, SemDadosNF, useCarga } from '../ui/nf.jsx'

// v27 — Conciliação: tudo que precisa de alguém olhando.

const AJUDA = {
  vencidas:    'Notas cuja previsão de pagamento já passou e nenhum pagamento arquivado casou com elas. Confira se foram pagas e ainda não entraram na aba Baixas.',
  sembaixa:    'Notas com mais de 30 dias de atraso na previsão e nenhum pagamento casado. Normalmente foram pagas com outro número ou num boleto que agrupa várias notas. Elas ficam fora do "A pagar".',
  divergencia: 'Notas pagas com valor diferente do valor da nota (mais de 2%), ou pagas só em parte. Pode ser juros, desconto, frete ou parcela que ainda falta.',
  semnf:       'Pagamentos que não casaram com nenhuma nota. Folha, impostos, aluguel e tarifas são esperados aqui; o que importa é a BU estar certa.',
  conflito:    'Fornecedores em que você fixou a BU da nota (Origem = Manual) e o pagamento está classificado em outra BU.',
}

export default function Conciliacao() {
  const { nfResumo, mesNF, buFiltro, corBU } = useFinanceiro()
  const [aba, setAba] = useState('vencidas')
  const [busca, setBusca] = useState('')
  const [esconderFora, setEsconderFora] = useState(true)
  const c = useCarga(() => loadConciliacao(mesNF), [mesNF])

  if (!nfResumo) return <SemDadosNF />

  const b = busca.trim().toUpperCase()
  const okBU = x => buFiltro === 'Todas' || x.bu === buFiltro
  const okBusca = x => !b || String(x.fornecedor || '').toUpperCase().includes(b) || String(x.documento || '').includes(b)
  const d = c.dados || { nf_vencidas: [], nf_sem_baixa: [], divergencias: [], conflitos_bu: [], pago_sem_nf: [] }
  const listas = {
    vencidas:    d.nf_vencidas.filter(okBU).filter(okBusca),
    sembaixa:    d.nf_sem_baixa.filter(okBU).filter(okBusca),
    divergencia: d.divergencias.filter(okBU).filter(okBusca),
    semnf:       d.pago_sem_nf.filter(okBU).filter(okBusca).filter(x => !esconderFora || x.grupo !== 'Fora dos totais'),
    conflito:    d.conflitos_bu.filter(okBusca),
  }
  const soma = (arr, k) => arr.reduce((s, x) => s + (Number(x[k]) || 0), 0)

  const colFornecedorNF = { id: 'fornecedor', label: 'Fornecedor', render: l => <div><div style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div><div style={{ fontSize: 11, color: COR.suave }}>NF {l.documento} · {l.unidade}</div></div> }
  const colBU = { id: 'bu', label: 'BU', render: l => <NomeBU bu={l.bu} cor={corBU(l.bu)} /> }
  const colEntrada = { id: 'dt_dig', label: 'Entrada', mono: true, render: l => fmtData(l.dt_dig) }

  const colunas = {
    vencidas: [colFornecedorNF, colBU, colEntrada,
      { id: 'prev', label: 'Previsão', mono: true, render: l => fmtData(l.prev_pagto), estilo: () => ({ color: COR.alerta }) },
      { id: 'residual', label: 'Em aberto', direita: true, mono: true, render: l => fmt(Number(l.residual) || 0) }],
    sembaixa: [colFornecedorNF, colBU, colEntrada,
      { id: 'prev', label: 'Previsão era', mono: true, render: l => fmtData(l.prev_pagto) },
      { id: 'valor', label: 'Valor da nota', direita: true, mono: true, render: l => fmt(l.valor) }],
    divergencia: [colFornecedorNF, colBU,
      { id: 'valor', label: 'Nota', direita: true, mono: true, render: l => fmt(l.valor) },
      { id: 'valor_pago', label: 'Pago', direita: true, mono: true, render: l => fmt(l.valor_pago) },
      { id: 'obs', label: 'O que aconteceu', render: l => <span style={{ fontSize: 12 }}>{l.obs}</span> }],
    semnf: [
      { id: 'dt_baixa', label: 'Pago em', mono: true, render: l => fmtData(l.dt_baixa) },
      { id: 'fornecedor', label: 'Fornecedor', render: l => <div><div style={{ maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={l.fornecedor}>{l.fornecedor}</div><div style={{ fontSize: 11, color: COR.suave }}>{l.descricao} · {l.loja}</div></div> },
      { id: 'tp', label: 'Título', render: l => l.tp_titulo || '—' },
      colBU,
      { id: 'valor', label: 'Valor', direita: true, mono: true, render: l => fmt(l.valor) }],
    conflito: [colFornecedorNF,
      { id: 'valor', label: 'Valor', direita: true, mono: true, render: l => fmt(l.valor) },
      { id: 'conflito_bu', label: 'Conflito', render: l => <span style={{ fontSize: 12 }}>{l.conflito_bu}</span> }],
  }
  const campoTotal = { vencidas: 'residual', sembaixa: 'valor', divergencia: 'valor', semnf: 'valor', conflito: 'valor' }
  const atual = listas[aba]

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 1400, width: '100%', boxSizing: 'border-box' }}>
      <Painel titulo={mesNF ? `Para conferir: notas que entraram e pagamentos de ${mesISOLabel(mesNF)}` : 'Para conferir: todos os meses'}
        extra={atual.length ? `${atual.length.toLocaleString('pt-BR')} itens · ${fmt(soma(atual, campoTotal[aba]))}` : ''}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <Abas ativa={aba} onChange={setAba} abas={[
            { id: 'vencidas', label: 'Previsão passou', qtd: listas.vencidas.length },
            { id: 'sembaixa', label: 'Sem pagamento localizado', qtd: listas.sembaixa.length },
            { id: 'divergencia', label: 'Valor diferente', qtd: listas.divergencia.length },
            { id: 'semnf', label: 'Pago sem nota', qtd: listas.semnf.length },
            { id: 'conflito', label: 'BU em conflito', qtd: listas.conflito.length },
          ]} />
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {aba === 'semnf' && (
              <label style={{ fontSize: 12, color: COR.suave, display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer' }}>
                <input type="checkbox" checked={esconderFora} onChange={e => setEsconderFora(e.target.checked)} />
                Esconder impostos, tarifas e intercompany
              </label>
            )}
            <Busca valor={busca} onChange={setBusca} placeholder="Buscar fornecedor ou número" />
          </div>
        </div>
        <p style={{ fontSize: 12, color: COR.suave, margin: '0 0 12px', maxWidth: 760, lineHeight: 1.5 }}>{AJUDA[aba]}</p>
        {c.carregando ? <Carregando texto="Montando a conciliação…" />
          : c.erro ? <Erro texto={c.erro} onTentar={c.tentarDeNovo} />
          : <>
              <Tabela linhas={atual.slice(0, 300)} colunas={colunas[aba]} minWidth={820} vazio="Nada para conferir aqui." chave={(l, i) => (l.chave_nf || l.fornecedor) + i} />
              {atual.length > 300 && <div style={{ fontSize: 11, color: COR.suave, marginTop: 8 }}>Mostrando os 300 maiores. Use a busca ou o filtro de BU pra achar os outros.</div>}
            </>}
      </Painel>
    </div>
  )
}
