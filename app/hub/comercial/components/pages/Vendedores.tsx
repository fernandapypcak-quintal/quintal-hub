'use client'

import { useState } from 'react'
import { useVendedoresResumo, useFunilProdutividade } from '../../useComercial'

function fmtBRLCompacto(v: number) {
  if (!v && v !== 0) return '—'
  if (Math.abs(v) >= 1000000) return 'R$ ' + (v/1000000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'M'
  if (Math.abs(v) >= 1000) return 'R$ ' + (v/1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + 'k'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 1 })
}
function hojeYm() { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth()+1).padStart(2,'0')}` }

function corPapel(papel: string) {
  if (papel === 'SDR') return '#185FA5'
  if (papel === 'Closer') return '#3B6D11'
  if (papel === 'Sem vendedor') return '#a32d2d'
  return '#9a9c9f'
}

function CardVendedor({ v }: { v: any }) {
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${corPapel(v.papel)}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 700 }}>{v.nome}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: corPapel(v.papel)+'20', color: corPapel(v.papel) }}>{v.papel}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <div><div style={{ fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>Leads</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{v.leads}</div></div>
        <div><div style={{ fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>Taxa conv.</div><div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'DM Mono, monospace' }}>{v.taxaConversao}%</div></div>
        <div><div style={{ fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>Fech. (fechamento)</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#185FA5' }}>{fmtBRLCompacto(v.receitaFechamento)}</div></div>
        <div><div style={{ fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>Fat. (competência)</div><div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRLCompacto(v.receitaCompetencia)}</div></div>
      </div>
      <div style={{ marginTop: 10, paddingTop: 10, borderTop: '0.5px solid #F0F0EC' }}>
        <div style={{ fontSize: 9, color: '#9a9c9f', textTransform: 'uppercase' }}>Comissão do mês</div>
        <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#7d5ac9' }}>{fmtBRLCompacto(v.comissao)}</div>
      </div>
    </div>
  )
}

function GraficoSerie({ titulo, serie, cor }: { titulo: string; serie: { label: string; valor: number; qtd?: number }[]; cor: string }) {
  const max = Math.max(...serie.map(s => s.valor), 1)
  return (
    <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 18 }}>{titulo}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 180, overflowX: 'auto', paddingBottom: 8 }}>
        {serie.map(s => (
          <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 56, flex: '1 0 56px' }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: cor, fontFamily: 'DM Mono, monospace' }}>{fmtBRLCompacto(s.valor)}</span>
            <div style={{ width: '100%', maxWidth: 34, height: `${Math.max((s.valor/max)*130,3)}px`, background: cor, borderRadius: '4px 4px 0 0' }} />
            <span style={{ fontSize: 10, color: '#9a9c9f' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function PainelFunilProdutividade({ filtros }: { filtros: any }) {
  const { dados, loading, erro } = useFunilProdutividade(filtros)
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null)

  if (loading) return <div style={{ padding: 30, textAlign: 'center', color: '#9a9c9f' }}>Carregando funil...</div>
  if (erro || !dados) return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>

  const { historico, funilDetalhado } = dados
  const maxHist = Math.max(...historico.map(h => Math.max(h.qualificacao, h.fechamento)), 1)
  const maxFunil = Math.max(...funilDetalhado.map(f => f.count), 1)

  const mesAtivo = (mesSelecionado && historico.some(h => h.periodo === mesSelecionado)) ? mesSelecionado : (historico[historico.length-1]?.periodo || null)
  const linhaAtiva = historico.find(h => h.periodo === mesAtivo)
  const maxOndeFicou = Math.max(...(linhaAtiva?.ondeFicou.map(f => f.count) || [1]), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Funil de Produtividade — histórico mensal</div>
        <div style={{ fontSize: 11, color: '#9a9c9f', marginBottom: 18 }}>Por safra de lead (mês de criação) — Fechamento conta todo lead que EM ALGUM MOMENTO chegou numa etapa de negociação/fechamento (mesmo que hoje já tenha ganho ou sido perdido); Qualificação é quem nunca saiu do estágio inicial. Clique num mês pra ver o detalhe de onde cada lead parou.</div>
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
                  <div style={{ width: 20, height: `${Math.max((h.qualificacao/maxHist)*120,3)}px`, background: h.periodo===mesAtivo ? '#8a7405' : '#D9B504', border: h.periodo===mesAtivo ? '2px solid #5a4b03' : 'none', borderRadius: '3px 3px 0 0' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#185FA5', fontFamily: 'DM Mono, monospace' }}>{h.fechamento}</span>
                  <div style={{ width: 20, height: `${Math.max((h.fechamento/maxHist)*120,3)}px`, background: h.periodo===mesAtivo ? '#0d3b66' : '#185FA5', border: h.periodo===mesAtivo ? '2px solid #072238' : 'none', borderRadius: '3px 3px 0 0' }} />
                </div>
              </div>
              <span style={{ fontSize: 10, color: h.periodo===mesAtivo ? '#0D0F14' : '#9a9c9f', fontWeight: h.periodo===mesAtivo ? 700 : 400 }}>{h.label}</span>
            </div>
          ))}
        </div>

        {/* Onde ficou — detalhe por etapa do mês selecionado */}
        <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #E8E8E2' }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Onde parou {linhaAtiva ? `· ${linhaAtiva.label}` : ''} <span style={{ fontWeight: 400, color: '#9a9c9f', fontSize: 11 }}>(etapa mais avançada que cada lead da safra alcançou)</span></div>
          {(!linhaAtiva || linhaAtiva.ondeFicou.length === 0) && <div style={{ fontSize: 12, color: '#9a9c9f' }}>Sem dado de etapa pra esse mês.</div>}
          {linhaAtiva?.ondeFicou.map(f => (
            <div key={f.etapa} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#5a5c5f', width: 140, textAlign: 'right', flexShrink: 0 }}>{f.etapa}</div>
              <div style={{ flex: 1, height: 22, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', width: `${Math.max((f.count/maxOndeFicou)*100,5)}%`,
                  background: f.grupo === 'qualificacao' ? '#D9B504' : f.grupo === 'fechamento' ? '#185FA5' : '#9a9c9f',
                  borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace',
                }}>{f.count}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: 20 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Funil aberto agora — por etapa</div>
        {funilDetalhado.map(f => (
          <div key={f.etapa} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <div style={{ fontSize: 11, color: '#5a5c5f', width: 130, textAlign: 'right', flexShrink: 0 }}>{f.etapa}</div>
            <div style={{ flex: 1, height: 22, background: '#F5F5F2', borderRadius: 5, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${Math.max((f.count/maxFunil)*100,5)}%`,
                background: f.grupo === 'qualificacao' ? '#D9B504' : f.grupo === 'fechamento' ? '#185FA5' : '#9a9c9f',
                borderRadius: 5, display: 'flex', alignItems: 'center', paddingLeft: 8, fontSize: 11, fontWeight: 700, color: '#fff', fontFamily: 'DM Mono, monospace',
              }}>{f.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Vendedores({ filtros }: { filtros: any }) {
  const mesFiltro = filtros?.mes ? `${filtros.ano}-${String(filtros.mes).padStart(2,'0')}` : hojeYm()
  const { dados, loading, erro } = useVendedoresResumo(filtros, mesFiltro)

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#9a9c9f' }}>Carregando...</div>
  if (erro || !dados) return <div style={{ padding: 20, background: '#fdeaea', borderRadius: 10, color: '#a32d2d', fontSize: 13 }}>Erro: {erro}</div>

  const { vendedores, forecast, pipelineAbertoPorCloser, semSdr, comissaoTotal } = dados
  const sdrs    = vendedores.filter(v => v.papel === 'SDR')
  const closers = vendedores.filter(v => v.papel === 'Closer')
  const outros  = vendedores.filter(v => v.papel !== 'SDR' && v.papel !== 'Closer')

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* ── Comissão total do mês ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #185FA5' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Comissão SDR (total)</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#185FA5' }}>{fmtBRLCompacto(comissaoTotal.sdr)}</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #3B6D11' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Comissão Closer (total)</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#3B6D11' }}>{fmtBRLCompacto(comissaoTotal.closer)}</div>
        </div>
        <div style={{ background: '#fff', border: '0.5px solid #E8E8E2', borderRadius: 14, padding: '14px 16px', borderTop: '3px solid #7d5ac9' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#9a9c9f', textTransform: 'uppercase' }}>Comissão total do mês</div>
          <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'DM Mono, monospace', color: '#7d5ac9' }}>{fmtBRLCompacto(comissaoTotal.sdr + comissaoTotal.closer)}</div>
        </div>
      </div>
      <div style={{ fontSize: 11, color: '#9a9c9f', marginTop: -12 }}>
        Modelo: com SDR + Closer, 17,5% do valor fechado pra cada um. Closer que fecha direto (sem SDR detectado) fica com os 35% inteiros.
      </div>
      <div style={{ background: '#fffbe6', border: '0.5px solid #f0e0a0', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#8a7405' }}>
        <strong>{semSdr.qtd}</strong> deals já com dono Closer nunca passaram por um SDR detectado (fechamento desses no mês: {fmtBRLCompacto(semSdr.receitaFechamento)}). Vale olhar com desconfiança: só conta a partir de quando começamos a rastrear isso — deal antigo que já tinha virado Closer antes disso aparece aqui mesmo tendo tido SDR.
      </div>

      {/* ── Visão por vendedor ─────────────────────────────── */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>SDRs</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
          {sdrs.length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f' }}>Nenhum SDR com atividade nesse período.</div>}
          {sdrs.map(v => <CardVendedor key={v.nome} v={v} />)}
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Closers</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 20 }}>
          {closers.length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f' }}>Nenhum Closer com atividade nesse período.</div>}
          {closers.map(v => <CardVendedor key={v.nome} v={v} />)}
        </div>

        {outros.length > 0 && (
          <>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Outros / não classificados</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
              {outros.map(v => <CardVendedor key={v.nome} v={v} />)}
            </div>
          </>
        )}
      </div>

      {/* ── Forecast ───────────────────────────────────────── */}
      <GraficoSerie titulo="Forecast — pipeline aberto por mês do evento (competência)" serie={forecast} cor="#7d5ac9" />

      {/* ── Pipeline aberto por Closer ─────────────────────── */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Pipeline aberto por Closer (próximos 12 meses, por competência)</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {Object.keys(pipelineAbertoPorCloser).length === 0 && <div style={{ fontSize: 12, color: '#9a9c9f' }}>Sem pipeline aberto atribuído a um Closer.</div>}
          {Object.entries(pipelineAbertoPorCloser).map(([nome, serie]) => (
            <GraficoSerie key={nome} titulo={nome} serie={serie} cor="#3B6D11" />
          ))}
        </div>
      </div>

      {/* ── Funil de Produtividade ─────────────────────────── */}
      <PainelFunilProdutividade filtros={filtros} />
    </div>
  )
}
