import React, { useEffect, useState } from 'react'

// v27 — peças compartilhadas das telas de notas (Por BU, A pagar,
// Fornecedores, Conciliação)

export const COR = {
  texto: '#0D0F14', suave: '#5a5c5f', fraco: '#9a9c9f',
  borda: '#E8E8E2', fundo: '#FAFAF8', verde: '#4F6B14', verdeClaro: '#f0f4e0',
  alerta: '#9A3C06', alertaFundo: '#FDF1E7', alertaBorda: '#F3CDB0',
}

export const num = { fontFamily: "'DM Mono', ui-monospace, monospace", fontVariantNumeric: 'tabular-nums' }

export function Painel({ titulo, extra, children, style }) {
  return (
    <section style={{ background: '#fff', border: `0.5px solid ${COR.borda}`, borderRadius: 12, padding: 18, minWidth: 0, ...style }}>
      {(titulo || extra) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
          {titulo && <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: COR.texto }}>{titulo}</h2>}
          {extra && <div style={{ fontSize: 12, color: COR.suave }}>{extra}</div>}
        </div>
      )}
      {children}
    </section>
  )
}

export function Kpi({ rotulo, valor, detalhe, alerta = false, onClick }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag onClick={onClick} style={{
      background: alerta ? COR.alertaFundo : '#fff',
      border: `0.5px solid ${alerta ? COR.alertaBorda : COR.borda}`,
      borderRadius: 12, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 6,
      textAlign: 'left', fontFamily: 'inherit', cursor: onClick ? 'pointer' : 'default', minWidth: 0,
    }}>
      <span style={{ fontSize: 12, color: alerta ? COR.alerta : COR.suave, fontWeight: 500 }}>{rotulo}</span>
      <span style={{ ...num, fontSize: 24, fontWeight: 500, color: alerta ? COR.alerta : COR.texto }}>{valor}</span>
      {detalhe && <span style={{ fontSize: 12, color: alerta ? '#7A3A12' : COR.suave, lineHeight: 1.4 }}>{detalhe}</span>}
    </Tag>
  )
}

export function GradeKpis({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>{children}</div>
}

const STATUS = {
  'Paga':                 { cor: '#4F6B14', fundo: '#EEF3DD' },
  'Em aberto':            { cor: '#2B4C7E', fundo: '#E6EDF7' },
  'Parcial':              { cor: '#7A5A00', fundo: '#FBF1D2' },
  'Vencida':              { cor: '#9A3C06', fundo: '#FDEBDD' },
  'Parcial vencida':      { cor: '#9A3C06', fundo: '#FDEBDD' },
  'Sem baixa localizada': { cor: '#5a5c5f', fundo: '#F0F0EC' },
}
export function ChipStatus({ status }) {
  const s = STATUS[status] || { cor: COR.suave, fundo: '#F0F0EC' }
  return <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 99, fontSize: 11, fontWeight: 500, color: s.cor, background: s.fundo, whiteSpace: 'nowrap' }}>{status || '—'}</span>
}

export function NomeBU({ bu, cor }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: cor, flexShrink: 0 }} />
      {bu}
    </span>
  )
}

export function Abas({ abas, ativa, onChange }) {
  return (
    <div role="tablist" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
      {abas.map(a => (
        <button key={a.id} role="tab" aria-selected={ativa === a.id} onClick={() => onChange(a.id)}
          style={{
            padding: '6px 12px', borderRadius: 99, border: `0.5px solid ${ativa === a.id ? '#6e7a1a' : COR.borda}`,
            background: ativa === a.id ? COR.verdeClaro : '#fff', color: ativa === a.id ? '#6e7a1a' : COR.suave,
            fontSize: 12, fontWeight: ativa === a.id ? 600 : 400, cursor: 'pointer', fontFamily: 'inherit',
          }}>
          {a.label}{a.qtd !== undefined && <span style={{ ...num, marginLeft: 6, opacity: 0.8 }}>{a.qtd}</span>}
        </button>
      ))}
    </div>
  )
}

export function Busca({ valor, onChange, placeholder = 'Buscar fornecedor' }) {
  return (
    <input type="search" value={valor} onChange={e => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}
      style={{ padding: '7px 12px', borderRadius: 8, border: `0.5px solid ${COR.borda}`, fontSize: 13, fontFamily: 'inherit', minWidth: 200, background: '#fff' }} />
  )
}

export function Vazio({ children }) {
  return <div style={{ padding: '28px 16px', textAlign: 'center', fontSize: 13, color: COR.suave, background: COR.fundo, borderRadius: 8 }}>{children}</div>
}

export function Carregando({ texto = 'Carregando…' }) {
  return <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: COR.suave }}>{texto}</div>
}

export function Erro({ texto, onTentar }) {
  return (
    <div style={{ padding: '16px', fontSize: 13, color: '#8C1414', background: '#FEF2F2', borderRadius: 8, display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
      <span>{texto}</span>
      {onTentar && <button onClick={onTentar} style={{ padding: '6px 12px', borderRadius: 8, border: '0.5px solid #8C1414', background: '#fff', color: '#8C1414', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Tentar de novo</button>}
    </div>
  )
}

// Quando o Apps Script ainda não devolve o resumo de NFs
export function SemDadosNF() {
  return (
    <div style={{ padding: 24 }}>
      <Vazio>
        Nenhuma nota fiscal carregada ainda. Importe o MTR090 na planilha (Menu → 📥 Importar NFs) e publique o Apps Script v27 como nova versão.
      </Vazio>
    </div>
  )
}

// Tabela com rolagem horizontal própria (a página nunca rola de lado)
export function Tabela({ colunas, linhas, chave, minWidth = 720, rodape, vazio = 'Nada por aqui.' }) {
  if (!linhas.length) return <Vazio>{vazio}</Vazio>
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', minWidth, borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>
            {colunas.map(c => (
              <th key={c.id} scope="col" style={{ textAlign: c.direita ? 'right' : 'left', fontWeight: 500, fontSize: 12, color: COR.suave, padding: '8px 10px', borderBottom: `0.5px solid ${COR.borda}`, whiteSpace: 'nowrap' }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={chave ? chave(l, i) : i} style={{ borderBottom: '0.5px solid #F0F0EC' }}>
              {colunas.map(c => (
                <td key={c.id} style={{ padding: '9px 10px', textAlign: c.direita ? 'right' : 'left', verticalAlign: 'top', color: COR.texto, ...(c.mono ? num : {}), ...(c.estilo ? c.estilo(l) : {}) }}>
                  {c.render ? c.render(l) : l[c.id]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {rodape && <tfoot>{rodape}</tfoot>}
      </table>
    </div>
  )
}

// Carrega algo sob demanda e refaz quando as dependências mudam
export function useCarga(fn, deps) {
  const [estado, setEstado] = useState({ carregando: true, erro: null, dados: null })
  const [tentativa, setTentativa] = useState(0)
  useEffect(() => {
    let vivo = true
    setEstado(e => ({ ...e, carregando: true, erro: null }))
    fn().then(d => { if (vivo) setEstado({ carregando: false, erro: null, dados: d }) })
        .catch(e => { if (vivo) setEstado({ carregando: false, erro: e.message || String(e), dados: null }) })
    return () => { vivo = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tentativa])
  return { ...estado, tentarDeNovo: () => setTentativa(t => t + 1) }
}

export const botaoSecundario = {
  padding: '6px 12px', borderRadius: 8, border: `0.5px solid ${COR.borda}`, background: '#fff',
  color: COR.texto, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
}
