'use client'

import { useState, useEffect } from 'react'
import { useVendedoresResumo, useFunilProdutividade, VendedorResumo } from '../../useComercial'

const GAS_URL = '/api/pipedrive'

function fmtBRLCompacto(v: number) {
  if (!v && v !== 0) return '—'
  if (Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}
function fmtBRLExato(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) }
function hojeYm() { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}` }

function Info({ texto }: { texto: string }) {
  return <span title={texto} style={{ cursor: 'help', color: '#9a9c9f', fontSize: 11, marginLeft: 4, border: '1px solid #ccc', borderRadius: '50%', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>ⓘ</span>
}

function CardGeral({ label, value, cor, info }: { label: string; value: string; cor: string; info: string }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, padding: '12px 14px', borderTop: `3px solid ${cor}` }}>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', display: 'flex', alignItems: 'center' }}>{label}<Info texto={info} /></div>
      <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: cor, marginTop: 6 }}>{value}</div>
    </div>
  )
}

// ── Modal de drill-down: lista de negócios por trás de um número ──────
// campoData diz qual campo de data o ano/mes do filtro deve usar — sem
// isso, "leads criados" abriria negócios filtrados por data do EVENTO
// (competência), que é o padrão do endpoint genérico, e não bateria com o
// número clicado.
type Deal = {
  id: string; titulo: string; empresa: string; status: string; stage_nome: string
  valor: number; data_evento: string; add_time: string; won_time: string
  vendedor: string; sdr_detectado?: string
}
function ModalDeals({ titulo, params, onClose }: { titulo: string; params: Record<string,string>; onClose: () => void }) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  useEffect(() => { setPage(1) }, [JSON.stringify(params)])

  useEffect(() => {
    setLoading(true)
    const p = new URLSearchParams({ tipo: 'deals', limit: '500', page: String(page), ...params })
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(d => { setDeals(d.deals || []); setTotal(d.total || 0); setPages(d.pages || 1) })
      .finally(() => setLoading(false))
  }, [JSON.stringify(params), page])

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, padding: 20, width: '100%', maxWidth: 720, maxHeight: '80vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>{titulo} <span style={{ fontWeight: 400, color: '#9a9c9f', fontSize: 12 }}>({total})</span></span>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', fontSize: 18, cursor: 'pointer', color: '#9a9c9f' }}>×</button>
        </div>
        {total > 500 && <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 10 }}>Página {page} de {pages} — {total} negócios no total.</div>}
        {loading && <div style={{ padding: 20, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>}
        {!loading && deals.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#9a9c9f', fontSize: 13 }}>Nenhum negócio encontrado.</div>}
        {!loading && deals.map(d => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 0', borderBottom: '0.5px solid #F0F0EC', fontSize: 12 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, color: '#3a3c3f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.empresa || d.titulo}</div>
              <div style={{ color: '#9a9c9f', fontSize: 11 }}>{d.stage_nome} · {d.status} · criado: {d.add_time||'—'} · ganho: {d.won_time||'—'} · evento: {d.data_evento || '—'} · dono: {d.vendedor}</div>
            </div>
            <div style={{ flexShrink: 0, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(parseFloat(String(d.valor))||0)}</div>
          </div>
        ))}
        {pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <button disabled={page<=1} onClick={() => setPage(p=>p-1)} style={{ padding: '5px 12px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', cursor: page<=1?'not-allowed':'pointer', fontSize: 12, opacity: page<=1?0.4:1 }}>← anterior</button>
            <span style={{ fontSize: 12, color: '#9a9c9f', alignSelf: 'center' }}>{page}/{pages}</span>
            <button disabled={page>=pages} onClick={() => setPage(p=>p+1)} style={{ padding: '5px 12px', borderRadius: 8, border: '0.5px solid #E8E8E2', background: '#fff', cursor: page>=pages?'not-allowed':'pointer', fontSize: 12, opacity: page>=pages?0.4:1 }}>próxima →</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tabela de performance (SDR ou Closer) ──────────────────────────────
function TabelaPerformance({ vendedores, papelPrincipal, papelOutro, mesFiltro }: {
  vendedores: VendedorResumo[]; papelPrincipal: string; papelOutro: string
  mesFiltro: string
}) {
  const [drill, setDrill] = useState<{ titulo: string; params: Record<string,string> } | null>(null)
  const principais = vendedores.filter(v => v.papel === papelPrincipal)
  const outros = vendedores.filter(v => v.papel === papelOutro)
  const ehSdr = papelPrincipal === 'SDR'
  const ano = mesFiltro.split('-')[0], mes = mesFiltro.split('-')[1]

  function baseParams(nome: string) {
    const p: Record<string,string> = {}
    if (ehSdr) p.sdr = nome; else p.vendedor = nome
    return p
  }
  function abrirLeadsCriados(nome: string) {
    setDrill({ titulo: `${nome} — leads criados`, params: { ...baseParams(nome), ano, mes, campo_data: 'add_time' } })
  }
  function abrirConvertidos(nome: string) {
    setDrill({ titulo: `${nome} — convertidos (dos leads criados no mês)`, params: { ...baseParams(nome), ano, mes, campo_data: 'add_time', status: 'won' } })
  }
  function abrirGanhosNoMes(nome: string) {
    setDrill({ titulo: `${nome} — ganhos no mês`, params: { ...baseParams(nome), ano, mes, campo_data: 'won_time', status: 'won' } })
  }
  function abrirCompetencia(nome: string) {
    setDrill({ titulo: `${nome} — faturamento por competência`, params: { ...baseParams(nome), ano, mes, campo_data: 'data_evento', status: 'won' } })
  }

  const Celula = ({ onClick, children, cor, bold }: { onClick: () => void; children: React.ReactNode; cor?: string; bold?: boolean }) => (
    <td onClick={onClick} style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', cursor: 'pointer', color: cor, fontWeight: bold ? 700 : 400 }}
      onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
      onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
      {children}
    </td>
  )

  const Tabela = ({ lista, titulo }: { lista: VendedorResumo[]; titulo: string }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase', marginBottom: 8 }}>{titulo}</div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #E8E8E2' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px', color: '#9a9c9f' }}>Nome</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Leads criados</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Convertidos</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Taxa</th>
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Ganhos no mês</th>
              {!ehSdr && <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Fat. fechamento</th>}
              {!ehSdr && <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Fat. competência</th>}
              {!ehSdr && <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Com SDR</th>}
              {!ehSdr && <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Sem SDR</th>}
              <th style={{ textAlign: 'right', padding: '6px 8px', color: '#9a9c9f' }}>Comissão</th>
            </tr>
          </thead>
          <tbody>
            {lista.map(v => (
              <tr key={v.nome} style={{ borderBottom: '0.5px solid #F0F0EC' }}>
                <td style={{ padding: '7px 8px', fontWeight: 600, color: '#3a3c3f' }}>{v.nome}</td>
                <Celula onClick={() => abrirLeadsCriados(v.nome)}>{v.leadsCriados}</Celula>
                <Celula onClick={() => abrirConvertidos(v.nome)}>{v.convertidos}</Celula>
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: v.taxaConversao > 100 ? '#a32d2d' : '#3a3c3f', fontWeight: v.taxaConversao > 100 ? 700 : 400 }}>
                  {v.taxaConversao}%{v.taxaConversao > 100 ? ' ⚠' : ''}
                </td>
                <Celula onClick={() => abrirGanhosNoMes(v.nome)}>{v.ganhosNoMes}</Celula>
                {!ehSdr && <Celula onClick={() => abrirGanhosNoMes(v.nome)}>{fmtBRLCompacto(v.receitaFechamento)}</Celula>}
                {!ehSdr && <Celula onClick={() => abrirCompetencia(v.nome)}>{fmtBRLCompacto(v.receitaCompetencia)}</Celula>}
                {!ehSdr && <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRLCompacto(v.receitaFechamentoComSdr)}</td>}
                {!ehSdr && <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', color: '#8a7405' }}>{fmtBRLCompacto(v.receitaFechamentoSemSdr)}</td>}
                <td style={{ padding: '7px 8px', textAlign: 'right', fontFamily: 'DM Mono, monospace', fontWeight: 700, color: '#7d5ac9' }}>{fmtBRLCompacto(v.comissao)}</td>
              </tr>
            ))}
            {lista.length === 0 && <tr><td colSpan={ehSdr ? 5 : 9} style={{ padding: 14, textAlign: 'center', color: '#9a9c9f' }}>Sem atividade nesse período.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <div>
      <Tabela lista={principais} titulo={papelPrincipal === 'SDR' ? 'SDRs' : 'Closers'} />
      {outros.length > 0 && (
        <Tabela lista={outros} titulo="Outros / revisar atribuição — clique num número pra ver os negócios" />
      )}
      {drill && <ModalDeals titulo={drill.titulo} params={drill.params} onClose={() => setDrill(null)} />}
    </div>
  )
}

function GraficoSerie({ titulo, serie, cor }: { titulo: string; serie: { label: string; valor: number; qtd?: number; temDados?: boolean }[]; cor: string }) {
  const comDados = serie.filter(s => s.temDados !== false)
  const max = Math.max(...comDados.map(s => s.valor), 1)
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>{titulo}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, overflowX: 'auto', paddingBottom: 8 }}>
        {serie.map((s, i) => (
          <div key={s.label+i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 56, flex: '1 0 56px' }}>
            {s.temDados === false ? (
              <>
                <span style={{ fontSize: 9, color: '#c9ccd1' }}>sem negócios</span>
                <div style={{ width: '100%', maxWidth: 34, height: 3, background: '#F0F0EC', borderRadius: 2 }} />
              </>
            ) : (
              <>
                <span style={{ fontSize: 10, fontWeight: 700, color: cor, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(s.valor)}</span>
                <div style={{ width: '100%', maxWidth: 34, height: `${Math.max((s.valor/max)*130,3)}px`, background: cor, borderRadius: '4px 4px 0 0' }} />
              </>
            )}
            <span style={{ fontSize: 10, color: '#9a9c9f' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Leads diários (Total / por SDR) ────────────────────────────────
function PainelLeadsDiarios({ filtros, mesFiltro }: { filtros: any; mesFiltro: string }) {
  const [dados, setDados] = useState<any>(null)
  const [granularidade, setGranularidade] = useState<'diario'|'semanal'|'mensal'>('diario')
  const [visao, setVisao] = useState<'total'|'sdr'>('total')

  useEffect(() => {
    const p = new URLSearchParams({ tipo: 'taxa_conversao', mes_filtro: mesFiltro })
    if (filtros.unidade) p.set('unidade', filtros.unidade)
    fetch(`${GAS_URL}?${p}`).then(r => r.json()).then(d => { if (!d.erro) setDados(d) })
  }, [filtros.unidade, mesFiltro])

  if (!dados) return <div style={{ padding: 20, textAlign: 'center', color: '#9a9c9f' }}>Carregando leads diários...</div>

  const linhas = [...(dados[granularidade]||[])].reverse().slice(-16)
  const max = Math.max(...linhas.map((l:any) => l.leads), 1)

  const sdrsPresentes = Array.from(new Set(linhas.flatMap((l:any) => Object.keys(l.porSdr||{})))).filter(n => n !== 'Sem SDR').sort() as string[]
  const cores = ['#185FA5','#3B6D11','#D9B504','#7d5ac9','#a32d2d','#8a7405']

  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 14, fontWeight: 700 }}>Leads diários <Info texto="Data de criação do lead (add_time). 'Origem' ainda não é rastreado na base." /></span>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setVisao('total')} style={{ padding: '4px 10px', borderRadius: 20, border: '0.5px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: visao==='total'?'#0D0F14':'#fff', color: visao==='total'?'#97A624':'#5a5c5f', borderColor: visao==='total'?'#0D0F14':'#E8E8E2' }}>Total</button>
            <button onClick={() => setVisao('sdr')} style={{ padding: '4px 10px', borderRadius: 20, border: '0.5px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: visao==='sdr'?'#0D0F14':'#fff', color: visao==='sdr'?'#97A624':'#5a5c5f', borderColor: visao==='sdr'?'#0D0F14':'#E8E8E2' }}>Por SDR</button>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['diario','semanal','mensal'] as const).map(g => (
              <button key={g} onClick={() => setGranularidade(g)} style={{ padding: '4px 10px', borderRadius: 20, border: '0.5px solid', fontSize: 11, fontWeight: 600, cursor: 'pointer', background: granularidade===g?'#0D0F14':'#fff', color: granularidade===g?'#97A624':'#5a5c5f', borderColor: granularidade===g?'#0D0F14':'#E8E8E2' }}>{g}</button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 14 }}>Respeita o período selecionado no topo (add_time).</div>

      {visao === 'total' && (
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, overflowX: 'auto' }}>
          {linhas.map((l:any) => (
            <div key={l.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 40, flex: '1 0 40px' }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#185FA5', fontFamily: 'DM Mono, monospace' }}>{l.leads}</span>
              <div style={{ width: '100%', maxWidth: 26, height: `${Math.max((l.leads/max)*120,4)}px`, background: '#185FA5', borderRadius: '4px 4px 0 0' }} />
              <span style={{ fontSize: 9, color: '#9a9c9f' }}>{l.label}</span>
            </div>
          ))}
        </div>
      )}

      {visao === 'sdr' && (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12, fontSize: 10, color: '#5a5c5f' }}>
            {sdrsPresentes.map((n,i) => <span key={n} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: cores[i%cores.length], display: 'inline-block' }} />{n}</span>)}
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: '#9a9c9f', display: 'inline-block' }} />Sem SDR</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 160, overflowX: 'auto' }}>
            {linhas.map((l:any) => {
              const maxBarra = max
              return (
                <div key={l.periodo} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 40, flex: '1 0 40px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column-reverse', width: '100%', maxWidth: 26, height: 120, borderRadius: '4px 4px 0 0', overflow: 'hidden' }}>
                    {sdrsPresentes.map((n,i) => {
                      const v = (l.porSdr||{})[n] || 0
                      if (!v) return null
                      return <div key={n} title={`${n}: ${v}`} style={{ height: `${(v/maxBarra)*120}px`, background: cores[i%cores.length] }} />
                    })}
                    {(l.porSdr||{})['Sem SDR'] > 0 && <div title={`Sem SDR: ${(l.porSdr||{})['Sem SDR']}`} style={{ height: `${((l.porSdr||{})['Sem SDR']/maxBarra)*120}px`, background: '#9a9c9f' }} />}
                  </div>
                  <span style={{ fontSize: 9, color: '#9a9c9f' }}>{l.label}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

function PainelFunilProdutividade({ filtros, sdrFiltro }: { filtros: any; sdrFiltro: string }) {
  const { dados, loading, erro } = useFunilProdutividade(filtros, sdrFiltro || undefined)
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)

  if (loading) return <div style={{ padding: 30, textAlign: 'center', color: '#9a9c9f' }}>Carregando funil...</div>
  if (erro || !dados) return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!dados.historico || !dados.funilDetalhado) return (
    <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>
      Resposta do servidor incompleta — provavelmente o Apps Script precisa de uma nova versão do deployment.
    </div>
  )

  const { historico, funilDetalhado } = dados
  const maxHist = Math.max(...historico.map(h => Math.max(h.qualificacao, h.fechamento)), 1)
  const maxFunil = Math.max(...funilDetalhado.map(f => f.count), 1)
  const mesAtivo = (mesSelecionado && historico.some(h => h.periodo === mesSelecionado)) ? mesSelecionado : (historico[historico.length-1]?.periodo || null)
  const linhaAtiva = historico.find(h => h.periodo === mesAtivo)
  const ondeFicouAtivo = linhaAtiva?.ondeFicou || []
  const maxOndeFicou = Math.max(...(ondeFicouAtivo.map(f => f.count)), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Safra criada por mês — evolução observada até hoje</div>
        <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 18 }}>
          {(dados as any).rotulo || 'Não é histórico mensal de avanço — é o estado ATUAL de cada safra de leads.'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, fontSize: 11, color: '#5a5c5f' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#D9B504', display: 'inline-block' }} />Qualificação</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span style={{ width: 9, height: 9, borderRadius: 2, background: '#185FA5', display: 'inline-block' }} />Fechamento</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 200, overflowX: 'auto', paddingBottom: 8 }}>
          {historico.map(h => (
            <div key={h.periodo} onClick={() => setMesSelecionado(h.periodo)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 60, flex: '1 0 60px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 150 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#8a7405', fontFamily: 'DM Mono, monospace' }}>{h.qualificacao}</span>
                  <div style={{ width: 20, height: `${Math.max((h.qualificacao/maxHist)*120,3)}px`, background: h.periodo===mesAtivo?'#8a7405':'#D9B504', border: h.periodo===mesAtivo?'2px solid #5a4b03':'none', borderRadius: '3px 3px 0 0' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#185FA5', fontFamily: 'DM Mono, monospace' }}>{h.fechamento}</span>
                  <div style={{ width: 20, height: `${Math.max((h.fechamento/maxHist)*120,3)}px`, background: h.periodo===mesAtivo?'#0d3b66':'#185FA5', border: h.periodo===mesAtivo?'2px solid #072238':'none', borderRadius: '3px 3px 0 0' }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: h.periodo===mesAtivo?'#0D0F14':'#9a9c9f', fontWeight: h.periodo===mesAtivo?700:400 }}>{h.label}</span>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #E8E8E2' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Distribuição atual do pipeline {linhaAtiva ? `· safra de ${linhaAtiva.label}` : ''} <span style={{ fontWeight: 400, color: '#9a9c9f', fontSize: 11 }}>(etapa mais avançada que cada lead da safra alcançou até agora)</span></div>
          {ondeFicouAtivo.length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f' }}>Sem dado de etapa pra esse mês.</div>}
          {ondeFicouAtivo.map(f => (
            <div key={f.etapa} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#5a5c5f', width: 140, textAlign: 'right', flexShrink: 0 }}>{f.etapa}</div>
              <div style={{ flex: 1, height: 22, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.max((f.count/maxOndeFicou)*100,5)}%`, background: f.grupo==='qualificacao'?'#D9B504':f.grupo==='fechamento'?'#185FA5':'#9a9c9f', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{f.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Pipeline aberto agora — por etapa</div>
        {funilDetalhado.map(f => (
          <div key={f.etapa} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#5a5c5f', width: 130, textAlign: 'right', flexShrink: 0 }}>{f.etapa}</div>
            <div style={{ flex: 1, height: 22, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max((f.count/maxFunil)*100,5)}%`, background: f.grupo==='qualificacao'?'#D9B504':f.grupo==='fechamento'?'#185FA5':'#9a9c9f', borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace' }}>{f.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Vendedores({ filtros }: { filtros: any }) {
  const mesFiltro = filtros?.mes ? `${filtros.ano}-${String(filtros.mes).padStart(2,'0')}` : hojeYm()
  const [sdrFiltro, setSdrFiltro] = useState('')
  const [closerFiltro, setCloserFiltro] = useState('')
  const [closerPipeline, setCloserPipeline] = useState('')
  const [drillSemSdr, setDrillSemSdr] = useState<{ titulo: string; params: Record<string,string> } | null>(null)

  const filtrosComCloser = { ...filtros, vendedor: closerFiltro || filtros.vendedor }
  const { dados, loading, erro } = useVendedoresResumo(filtrosComCloser, mesFiltro, sdrFiltro)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro || !dados) return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>
  if (!dados.vendedores || !dados.forecast || !dados.totaisGerais) return (
    <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>
      Resposta do servidor incompleta — provavelmente o Apps Script precisa de uma nova versão do deployment.
    </div>
  )

  const { vendedores, forecast, pipelineAbertoPorCloser, totaisGerais, semSdrConfirmado, semSdrPendente, eventoRealizado, avisos } = dados

  const sdrNomes = Array.from(new Set(vendedores.filter(v => v.papel==='SDR').map(v => v.nome))).sort()
  const closerNomes = Array.from(new Set(vendedores.filter(v => v.papel==='Closer').map(v => v.nome))).sort()
  const closersComPipeline = Object.keys(pipelineAbertoPorCloser).sort()
  const closerSelecionadoPipeline = closerPipeline && pipelineAbertoPorCloser[closerPipeline] ? closerPipeline : closersComPipeline[0]

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

      <div style={{ background: '#fffbe6', border: '0.5px solid #f0e0a0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#8a7405' }}>
        <strong>Campos de data por seção:</strong> Leads/conversão de safra = criação do lead (add_time). Faturamento fechamento/ganhos no mês = won_time. Faturamento competência e comissão = mês de competência do evento (data_evento). Forecast/pipeline = mês do evento (data_evento) dos negócios ainda abertos. {!eventoRealizado && <strong> Mês de competência selecionado ainda não aconteceu — valores são de negócios já ganhos para um evento futuro.</strong>}
      </div>

      {/* Filtros locais SDR/Closer — agora conectados de verdade na busca, não só no front */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <select value={sdrFiltro} onChange={e => setSdrFiltro(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12 }}>
          <option value="">Todos os SDRs</option>
          {sdrNomes.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
        <select value={closerFiltro} onChange={e => setCloserFiltro(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12 }}>
          <option value="">Todos os Closers</option>
          {closerNomes.map(n => <option key={n} value={n}>{n}</option>)}
        </select>
      </div>

      {/* Visão geral — SEMPRE por deal único, nunca somando as linhas da tabela */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
        <CardGeral label="Leads criados" value={String(totaisGerais.leadsCriados)} cor="#185FA5" info="Negócios ÚNICOS com add_time no mês selecionado (não soma linhas de SDR+Closer)." />
        <CardGeral label="Ganhos" value={String(totaisGerais.ganhosNoMes)} cor="#3B6D11" info="Negócios ÚNICOS com status=won e won_time no mês selecionado." />
        <CardGeral label="Taxa conversão" value={totaisGerais.taxaConversao+'%'} cor="#185FA5" info="Dos leads (únicos) criados no mês, quantos hoje já são ganhos." />
        <CardGeral label="Fat. fechamento" value={fmtBRLCompacto(totaisGerais.receitaFechamento)} cor="#185FA5" info="Soma do valor dos negócios ganhos com won_time no mês." />
        <CardGeral label="Fat. competência" value={fmtBRLCompacto(totaisGerais.receitaCompetencia)} cor="#3B6D11" info="Soma do valor dos negócios ganhos cujo evento (data_evento) acontece no mês selecionado." />
        <CardGeral label="Pipeline aberto" value={fmtBRLCompacto(totaisGerais.pipelineAbertoValor)} cor="#7d5ac9" info="Soma do valor de TODOS os negócios ainda abertos (não só os próximos 12 meses do gráfico de forecast)." />
        <CardGeral label="Comissão" value={fmtBRLCompacto(totaisGerais.comissaoTotal)} cor="#7d5ac9" info="0,35% do faturamento de competência do mês, dividido conforme a regra SDR/Closer." />
      </div>

      {/* Performance: SDR e Closer */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Performance — SDRs</div>
        <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 10 }}>{avisos?.leadsCriados}</div>
        <TabelaPerformance vendedores={vendedores} papelPrincipal="SDR" papelOutro="Outro (SDR)" mesFiltro={mesFiltro} />
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Performance — Closers</div>
        <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 10 }}>{avisos?.closer}</div>
        <TabelaPerformance vendedores={vendedores} papelPrincipal="Closer" papelOutro="Outro (Closer)" mesFiltro={mesFiltro} />
      </div>

      {/* Sem SDR — agora exige verificação real (flow_verificado), não só a
          primeira etapa observada pelo sync */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        <div onClick={() => setDrillSemSdr({ titulo: 'Sem SDR confirmado (verificado via histórico real)', params: { ano: mesFiltro.split('-')[0], mes: mesFiltro.split('-')[1], campo_data: 'data_evento', status: 'won', sem_sdr: 'confirmado' } })}
          style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, padding: 16, borderTop: '3px solid #3B6D11', cursor: 'pointer' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Sem SDR confirmado</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3B6D11', fontFamily: 'DM Mono, monospace' }}>{semSdrConfirmado.qtd} deals</div>
          <div style={{ fontSize: 12, color: '#5a5c5f' }}>{fmtBRLExato(semSdrConfirmado.valor)} — verificado via histórico real do Pipedrive (não é suposição), comissão 0,35% integral à Closer</div>
        </div>
        <div onClick={() => setDrillSemSdr({ titulo: 'SDR não identificado / pendente', params: { ano: mesFiltro.split('-')[0], mes: mesFiltro.split('-')[1], campo_data: 'data_evento', status: 'won', sem_sdr: 'pendente' } })}
          style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, padding: 16, borderTop: '3px solid #D9B504', cursor: 'pointer' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>SDR não identificado / pendente</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#8a7405', fontFamily: 'DM Mono, monospace' }}>{semSdrPendente.qtd} deals</div>
          <div style={{ fontSize: 12, color: '#5a5c5f' }}>{fmtBRLExato(semSdrPendente.valor)} em comissão NÃO paga automaticamente — inclui deals ainda não verificados e deals que passaram por Qualificação mas o nome do SDR se perdeu</div>
        </div>
      </div>

      {/* Leads diários */}
      <PainelLeadsDiarios filtros={filtros} mesFiltro={mesFiltro} />

      {/* Forecast + Pipeline por Closer (seletor, não tudo de uma vez) */}
      <GraficoSerie titulo="Forecast — pipeline aberto por mês do evento (consolidado)" serie={forecast} cor="#7d5ac9" />
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 700 }}>Pipeline aberto por Closer</span>
          {closersComPipeline.length > 0 && (
            <select value={closerSelecionadoPipeline} onChange={e => setCloserPipeline(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: '0.5px solid #E8E8E2', fontSize: 12 }}>
              {closersComPipeline.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          )}
        </div>
        {closersComPipeline.length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f' }}>Sem pipeline aberto atribuído a um Closer.</div>}
        {closerSelecionadoPipeline && pipelineAbertoPorCloser[closerSelecionadoPipeline] && (
          <GraficoSerie titulo={closerSelecionadoPipeline} serie={pipelineAbertoPorCloser[closerSelecionadoPipeline]} cor="#3B6D11" />
        )}
      </div>

      {/* Funil de Produtividade */}
      <PainelFunilProdutividade filtros={filtrosComCloser} sdrFiltro={sdrFiltro} />

      {drillSemSdr && <ModalDeals titulo={drillSemSdr.titulo} params={drillSemSdr.params} onClose={() => setDrillSemSdr(null)} />}
    </div>
  )
}
