import { useState } from 'react';
import { useCMV } from '../../hooks/useCMV';
import PainelIngredientes from '../ui/PainelIngredientes';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

const brlK = v => { const n = v||0; return n >= 1000 ? `R$ ${(n/1000).toFixed(1)}k` : `R$ ${n.toFixed(0)}`; };
const brl  = v => `R$ ${(v||0).toFixed(2)}`;
const pct  = v => `${((v||0)*100).toFixed(1)}%`;
const CORES = ['#97A624','#D9B504','#8C1414','#2980b9','#e67e22','#9b59b6'];

export default function Home({ onPageChange }) {
  const {
    kpis, evolucaoCMV, desperdicioByUnidade,
    produtos, margemPorCategoria, histComp, cmvPorContabil,
    totalBonificacoes, bonifPorConta,
    setFiltroCat, setFiltroLoja,
  } = useCMV();

  const [painelProduto, setPainelProduto] = useState(null);

  const criticos = produtos.filter(r => r.cmvPct >= 0.80);
  const cats     = margemPorCategoria.slice(0, 5).map(r => r.categoria);
  const grandTotalDesp = desperdicioByUnidade.reduce((s,r) => s + r.total, 0);

  // ── Alertas de tendência (briefing) ──────────────────────
  const alertas = [];

  if (kpis.deltaCMV > 0.02) {
    alertas.push({
      tipo:    'atencao',
      titulo:  `CMV subiu ${pct(kpis.deltaCMV)} vs semana anterior`,
      detalhe: `De ${pct(kpis.cmvAnt)} para ${pct(kpis.cmvAtual)} — tendência de alta`,
      acao:    'Ver variação →',
      onClick: () => onPageChange('variacao'),
    });
  }

  if (desperdicioByUnidade.length > 1) {
    const media = grandTotalDesp / desperdicioByUnidade.length;
    const pior  = desperdicioByUnidade[0];
    const acima = pior.total - media;
    if (acima > 500) {
      alertas.push({
        tipo:    'atencao',
        titulo:  `${pior.unidade} com desperdício acima da média`,
        detalhe: `${brlK(pior.total)} acumulado — ${brlK(acima)} acima da média`,
        acao:    'Ver detalhes →',
        onClick: () => { setFiltroLoja(pior.unidade); onPageChange('desperdicio'); },
      });
    }
  }

  const catsBaixaMargem = margemPorCategoria.filter(r => r.margemMedia < 0.60 && r.qtdProdutos > 3);
  catsBaixaMargem.slice(0, 1).forEach(cat => {
    alertas.push({
      tipo:    'atencao',
      titulo:  `${cat.categoria} com margem abaixo da meta`,
      detalhe: `Margem média ${pct(cat.margemMedia)} — meta é 65%`,
      acao:    'Revisar precificação →',
      onClick: () => { setFiltroCat(cat.categoria); onPageChange('rentabilidade'); },
    });
  });

  return (
    <div className="p-5 space-y-4">

      {/* ── KPIs ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div onClick={() => onPageChange('variacao')}
          className="bg-white border border-surface-border rounded-xl p-4 cursor-pointer hover:border-zinc-400 transition-colors">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">CMV Médio Teórico</p>
          <p className={`text-[28px] font-bold leading-none tracking-tight ${kpis.cmvAtual > 0.30 ? 'text-amber-700' : 'text-brand-olive'}`}>
            {pct(kpis.cmvAtual)}
          </p>
          <p className={`text-[12px] font-medium mt-1.5 ${kpis.deltaCMV > 0 ? 'text-brand-crimson' : 'text-brand-olive'}`}>
            {kpis.deltaCMV > 0 ? '↑' : '↓'} {pct(Math.abs(kpis.deltaCMV))} vs sem. ant.
          </p>
        </div>

        <div onClick={() => onPageChange('rentabilidade')}
          className="bg-white border border-surface-border rounded-xl p-4 cursor-pointer hover:border-zinc-400 transition-colors">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Margem Média</p>
          <p className={`text-[28px] font-bold leading-none tracking-tight ${kpis.margem >= 0.65 ? 'text-brand-olive' : 'text-amber-700'}`}>
            {pct(kpis.margem)}
          </p>
          <p className={`text-[12px] font-medium mt-1.5 ${kpis.margem >= 0.65 ? 'text-brand-olive' : 'text-amber-700'}`}>
            {kpis.margem >= 0.65 ? '✓ acima da meta 65%' : '↓ abaixo da meta 65%'}
          </p>
        </div>

        <div onClick={() => onPageChange('desperdicio')}
          className="bg-white border border-surface-border rounded-xl p-4 cursor-pointer hover:border-zinc-400 transition-colors">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Desperdício Acum.</p>
          <p className="text-[28px] font-bold leading-none tracking-tight text-brand-black">{brlK(kpis.totalDesp)}</p>
          <p className="text-[12px] text-zinc-400 mt-1.5">maior: {desperdicioByUnidade[0]?.unidade ?? '—'}</p>
        </div>

        {totalBonificacoes > 0 && (
          <div className="bg-white border border-[#97A624] rounded-xl p-4 cursor-default">
            <p className="text-[10.5px] font-semibold text-brand-olive uppercase tracking-wide mb-2">Bonificações</p>
            <p className="text-[28px] font-bold leading-none tracking-tight text-brand-olive">{brlK(totalBonificacoes)}</p>
            <p className="text-[12px] text-zinc-400 mt-1.5">
              CMV ajustado: <strong className="text-brand-olive">{(kpis.cmvAjustado * 100).toFixed(1)}%</strong>
              {' '}vs {(kpis.cmvAtual * 100).toFixed(1)}% sem bonif.
            </p>
          </div>
        )}

        <div onClick={() => onPageChange('rentabilidade')}
          className="bg-white border border-surface-border rounded-xl p-4 cursor-pointer hover:border-zinc-400 transition-colors">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Produtos Críticos</p>
          <p className={`text-[28px] font-bold leading-none tracking-tight ${kpis.criticos > 0 ? 'text-brand-crimson' : 'text-brand-olive'}`}>
            {kpis.criticos}
          </p>
          <p className="text-[12px] text-zinc-400 mt-1.5">{kpis.atencao} em atenção · {kpis.okCount} OK</p>
        </div>
      </div>

      {/* ── PRODUTOS CRÍTICOS ──────────────────────────────── */}
      {criticos.length > 0 && (
        <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-brand-black text-sm">CMV acima de 100% — prejuízo a cada venda</p>
              <p className="text-xs text-zinc-400 mt-0.5">clique no produto para ver a composição e ajustar</p>
            </div>
            <button onClick={() => onPageChange('rentabilidade')}
              className="text-[12px] text-brand-olive font-medium hover:underline shrink-0">
              Ver todos →
            </button>
          </div>
          <div className="divide-y divide-surface-border">
            {criticos.map(item => {
              const impacto = item.precoVenda > 0 ? item.custoIngr - item.precoVenda : 0;
              return (
                <div key={item.codPa}
                  onClick={() => setPainelProduto(item)}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-red-50 cursor-pointer transition-colors group">
                  {/* Badge CMV */}
                  <div className="shrink-0 w-16 text-center">
                    <p className="text-[18px] font-bold text-brand-crimson leading-none">{pct(item.cmvPct)}</p>
                    <p className="text-[9px] text-zinc-400 mt-0.5 uppercase tracking-wide">CMV</p>
                  </div>

                  {/* Info produto */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-brand-black">{item.nomePa}</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      {item.categoria} · {item.subcategoria}
                    </p>
                  </div>

                  {/* Impacto */}
                  <div className="text-right shrink-0">
                    <p className="text-[12px] text-zinc-500">prejuízo por unidade</p>
                    <p className="text-[15px] font-bold text-brand-crimson">{brl(impacto)}</p>
                  </div>

                  {/* Preço sugerido */}
                  <div className="text-right shrink-0 pl-4 border-l border-surface-border">
                    <p className="text-[11px] text-zinc-400">preço sugerido</p>
                    <p className="text-[14px] font-semibold text-brand-olive">{brl(item.precoSugerido)}</p>
                  </div>

                  <span className="text-zinc-300 group-hover:text-brand-olive transition-colors text-sm shrink-0">→</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALERTAS DE TENDÊNCIA ───────────────────────────── */}
      {alertas.length > 0 && (
        <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-border">
            <p className="font-semibold text-brand-black text-sm">Alertas da semana</p>
            <p className="text-xs text-zinc-400 mt-0.5">tendências que precisam de atenção</p>
          </div>
          <div className="divide-y divide-surface-border">
            {alertas.map((item, i) => (
              <div key={i} onClick={item.onClick}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-muted cursor-pointer transition-colors group">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center shrink-0">
                  <span className="text-sm">🟡</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-brand-black">{item.titulo}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{item.detalhe}</p>
                </div>
                <span className="text-[12px] font-medium text-brand-olive group-hover:underline shrink-0">
                  {item.acao}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── GRÁFICO + DESPERDÍCIO ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white border border-surface-border rounded-xl">
          <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-brand-black text-sm">Evolução do CMV</p>
              <p className="text-xs text-zinc-400 mt-0.5">por semana · meta 30%</p>
            </div>
            <button onClick={() => onPageChange('variacao')}
              className="text-[12px] text-brand-olive font-medium hover:underline">
              Detalhar →
            </button>
          </div>
          <div className="p-5">
            {evolucaoCMV.length > 0 ? (
              <ResponsiveContainer width="100%" height={190}>
                <LineChart data={evolucaoCMV} margin={{top:4,right:8,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false}/>
                  <XAxis dataKey="semana" tick={{fontSize:11,fill:'#999'}} axisLine={false} tickLine={false}/>
                  <YAxis domain={['auto','auto']} tick={{fontSize:11,fill:'#999'}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v,n)=>[`${Number(v).toFixed(1)}%`,n]}
                    contentStyle={{background:'#fff',border:'1px solid #e8e8e2',borderRadius:8,fontSize:12}}/>
                  <ReferenceLine y={30} stroke="#ccc" strokeDasharray="5 4" strokeWidth={1.5}/>
                  <Line type="monotone" dataKey="cmv" name="Geral" stroke="#0D0D0D" strokeWidth={2.5} dot={{fill:'#0D0D0D',r:3}} activeDot={{r:5}}/>
                  {cats.map((cat,i) => (
                    <Line key={cat} type="monotone" dataKey={cat} stroke={CORES[i%CORES.length]} strokeWidth={1.5} dot={false} activeDot={{r:4}}/>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[190px] flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm text-zinc-400">Histórico ainda não disponível</p>
                <p className="text-xs text-zinc-300">Grave o primeiro snapshot pelo menu da planilha</p>
              </div>
            )}
          </div>
        </div>

        {/* Top lojas desperdício */}
        <div className="bg-white border border-surface-border rounded-xl">
          <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
            <div>
              <p className="font-semibold text-brand-black text-sm">Desperdício por loja</p>
              <p className="text-xs text-zinc-400 mt-0.5">total: {brlK(grandTotalDesp)}</p>
            </div>
            <button onClick={() => onPageChange('desperdicio')}
              className="text-[12px] text-brand-olive font-medium hover:underline">Ver todas →</button>
          </div>
          <div className="p-4 space-y-3">
            {desperdicioByUnidade.slice(0, 5).map((row, i) => {
              const share = grandTotalDesp > 0 ? row.total / grandTotalDesp : 0;
              return (
                <div key={row.unidade}
                  onClick={() => { setFiltroLoja(row.unidade); onPageChange('desperdicio'); }}
                  className="cursor-pointer group">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[13px] font-medium text-brand-black group-hover:text-brand-olive transition-colors">
                      {row.unidade}
                    </span>
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-[10px] font-semibold text-brand-crimson bg-red-50 px-1.5 py-0.5 rounded-full">maior</span>}
                      <span className="text-[12px] font-mono font-semibold text-brand-black">{brlK(row.total)}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-surface-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{width:`${(share*100).toFixed(0)}%`, background: i===0?'#8C1414':i===1?'#D9B504':'#97A624'}}/>
                  </div>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{(share*100).toFixed(1)}% do total</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── MARGEM POR CATEGORIA ───────────────────────────── */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex items-center justify-between">
          <p className="font-semibold text-brand-black text-sm">Margem por categoria</p>
          <p className="text-xs text-zinc-400">clique para ver os produtos</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-0 divide-x divide-y divide-surface-border">
          {margemPorCategoria.map(r => (
            <div key={r.categoria}
              onClick={() => { setFiltroCat(r.categoria); onPageChange('rentabilidade'); }}
              className="p-4 cursor-pointer hover:bg-surface-muted transition-colors">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-2 truncate">{r.categoria}</p>
              <div className="flex items-end justify-between">
                <div>
                  <p className={`text-[20px] font-bold leading-none ${r.cmvMedio>=0.80?'text-brand-crimson':r.cmvMedio>=0.35?'text-amber-700':'text-brand-olive'}`}>
                    {pct(r.cmvMedio)}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">CMV médio</p>
                </div>
                <div className="text-right">
                  <p className={`text-[15px] font-semibold ${r.margemMedia>=0.65?'text-brand-olive':'text-amber-700'}`}>
                    {pct(r.margemMedia)}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-1">margem</p>
                </div>
              </div>
              {r.criticos > 0 && (
                <p className="text-[10px] text-brand-crimson font-semibold mt-2">⚠ {r.criticos} crítico{r.criticos>1?'s':''}</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Painel ingredientes */}
      {painelProduto && (
        <PainelIngredientes produto={painelProduto} histComp={histComp} onClose={() => setPainelProduto(null)}/>
      )}

    </div>
  );
}
