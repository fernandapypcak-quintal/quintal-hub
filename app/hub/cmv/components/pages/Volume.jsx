import { useCMV } from '../../hooks/useCMV';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const brl  = v => `R$ ${(v||0).toFixed(2)}`;
const brlK = v => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : `R$ ${(v||0).toFixed(0)}`;
const pct  = v => `${((v||0)*100).toFixed(1)}%`;
const CORES = ['#97A624','#D9B504','#8C1414','#2980b9','#e67e22','#9b59b6','#009e74'];

export default function Volume() {
  const { volumePorProduto, vendas: vendasFiltradas, totalBonificacoes, bonifPorConta, bonificacoes: bonificacoesFiltradas, kpis } = useCMV();

  const comVenda    = volumePorProduto.filter(r => r.temVenda);
  const semVenda    = volumePorProduto.filter(r => !r.temVenda);
  const receitaTotal = comVenda.reduce((s, r) => s + r.receitaReal, 0);
  const custoTotal   = comVenda.reduce((s, r) => s + r.custoTotal, 0);
  const cmvGeral     = receitaTotal > 0 ? custoTotal / receitaTotal : 0;
  const qtdTotal     = vendasFiltradas.reduce((s, r) => s + (r.count||0), 0);

  // Top 10 por receita para o gráfico
  const topReceita = [...comVenda]
    .sort((a, b) => b.receitaReal - a.receitaReal)
    .slice(0, 10);

  // Top produtos com maior impacto de custo
  const topCusto = [...comVenda]
    .sort((a, b) => b.custoTotal - a.custoTotal)
    .slice(0, 10);

  const temDados = comVenda.length > 0;
  const totalBonifProdutos = comVenda.reduce((s, r) => s + (r.bonif || 0), 0);
  const produtosComBonif   = comVenda.filter(r => r.bonif > 0);

  return (
    <div className="p-5 space-y-4">

      {!temDados && (
        <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">Aguardando dados de vendas da ZIG</p>
          <p className="text-[13px] text-amber-700">
            Os dados de volume aparecem aqui assim que o Apps Script buscar as vendas da semana.
            Verifique se o endpoint <code className="font-mono bg-amber-100 px-1 rounded">?tipo=vendas</code> está respondendo corretamente.
          </p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Receita no Período</p>
          <p className="text-[26px] font-bold text-brand-black leading-none">{brlK(receitaTotal)}</p>
          <p className="text-[12px] text-zinc-400 mt-1">{qtdTotal} itens vendidos</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Custo Total</p>
          <p className="text-[26px] font-bold text-brand-black leading-none">{brlK(custoTotal)}</p>
          <p className="text-[12px] text-zinc-400 mt-1">custo dos produtos vendidos</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">CMV Real</p>
          <p className={`text-[26px] font-bold leading-none ${cmvGeral > 0.30 ? 'text-brand-crimson' : 'text-brand-olive'}`}>
            {pct(cmvGeral)}
          </p>
          <p className={`text-[12px] mt-1 font-medium ${cmvGeral > 0.30 ? 'text-brand-crimson' : 'text-brand-olive'}`}>
            {cmvGeral > 0.30 ? `↑ ${pct(cmvGeral - 0.30)} acima da meta` : '✓ dentro da meta 30%'}
          </p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Produtos com Venda</p>
          <p className="text-[26px] font-bold text-brand-black leading-none">{comVenda.length}</p>
          <p className="text-[12px] text-zinc-400 mt-1">{semVenda.length} sem venda no período</p>
        </div>
      </div>

      {temDados && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top receita */}
          <div className="bg-white border border-surface-border rounded-xl">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <p className="font-semibold text-brand-black text-sm">Top 10 — Maior Receita</p>
              <p className="text-xs text-zinc-400 mt-0.5">produtos que mais geraram receita no período</p>
            </div>
            <div className="p-5">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={topReceita.map(r => ({ nome: r.nomePa.length > 18 ? r.nomePa.slice(0,18)+'…' : r.nomePa, receita: parseFloat(r.receitaReal.toFixed(0)), custo: parseFloat(r.custoTotal.toFixed(0)) }))}
                  layout="vertical" margin={{top:4,right:16,left:0,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:10,fill:'#999'}} tickFormatter={v=>brlK(v)} axisLine={false} tickLine={false}/>
                  <YAxis type="category" dataKey="nome" tick={{fontSize:10,fill:'#555'}} width={130} axisLine={false} tickLine={false}/>
                  <Tooltip formatter={(v,n) => [brlK(v), n === 'receita' ? 'Receita' : 'Custo']}
                    contentStyle={{background:'#fff',border:'1px solid #e8e8e2',borderRadius:8,fontSize:12}}/>
                  <Bar dataKey="receita" fill="#97A624" radius={[0,4,4,0]} barSize={12}/>
                  <Bar dataKey="custo"   fill="#e8e8e2" radius={[0,4,4,0]} barSize={8}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top custo */}
          <div className="bg-white border border-surface-border rounded-xl">
            <div className="px-5 py-3.5 border-b border-surface-border">
              <p className="font-semibold text-brand-black text-sm">Top 10 — Maior Impacto de Custo</p>
              <p className="text-xs text-zinc-400 mt-0.5">onde o custo mais pesa na operação</p>
            </div>
            <div className="p-4 space-y-2 max-h-[280px] overflow-y-auto">
              {topCusto.map((item, i) => (
                <div key={item.codPa} className="flex items-center gap-3">
                  <span className="text-[11px] font-mono text-zinc-400 w-4 shrink-0">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-0.5">
                      <span className="text-[12px] font-medium text-brand-black truncate">{item.nomePa}</span>
                      <span className="text-[11px] font-mono text-zinc-600 ml-2 shrink-0">{brlK(item.custoTotal)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full"
                          style={{width:`${(item.custoTotal/topCusto[0].custoTotal*100).toFixed(0)}%`, background: CORES[i%CORES.length]}}/>
                      </div>
                      <span className={`text-[10px] font-mono shrink-0 ${item.cmvReal>=0.80?'text-brand-crimson':item.cmvReal>=0.35?'text-amber-700':'text-brand-olive'}`}>
                        {pct(item.cmvReal)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabela completa */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-surface-border flex justify-between items-center flex-wrap gap-2">
          <p className="font-semibold text-brand-black text-sm">Todos os produtos — Volume × Receita × Custo</p>
          <div className="flex items-center gap-4">
            {totalBonifProdutos > 0 && (
              <span className="text-xs font-semibold text-brand-olive bg-[#F5F8E8] border border-[#C8D870] px-3 py-1 rounded-full">
                🎁 {produtosComBonif.length} produtos com bonificação · {brlK(totalBonifProdutos)} total
              </span>
            )}
            <p className="text-xs text-zinc-400">{comVenda.length} produtos com venda no período</p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 bg-white border-b border-surface-border">
              <tr>
                {['Produto','Categoria','Qtd Vendida','Receita','Custo Total','Bonificação','CMV Teórico','CMV Real','CMV c/ Bonif.','Margem'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right first:text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {volumePorProduto.map((item, i) => (
                <tr key={item.codPa} className={`border-b border-surface-border hover:bg-surface-muted
                  ${!item.temVenda ? 'opacity-40' : ''}
                  ${i%2===0 ? '' : 'bg-surface-base'}`}>
                  <td className="px-4 py-2.5 font-medium text-brand-black">{item.nomePa}</td>
                  <td className="px-4 py-2.5 text-zinc-500 text-[12px]">{item.subcategoria}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand-black">
                    {item.qtdVendida > 0 ? item.qtdVendida : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-600">
                    {item.receitaReal > 0 ? brlK(item.receitaReal) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-zinc-600">
                    {item.custoTotal > 0 ? brlK(item.custoTotal) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${item.cmvTeorico>1?'text-brand-crimson':item.cmvTeorico>=0.30?'text-amber-700':'text-brand-olive'}`}>
                    {pct(item.cmvTeorico)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-semibold ${item.temVenda ? (item.cmvReal>=0.80?'text-brand-crimson':item.cmvReal>=0.35?'text-amber-700':'text-brand-olive') : 'text-zinc-300'}`}>
                    {item.temVenda ? pct(item.cmvReal) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-brand-olive font-semibold">
                    {item.bonif > 0 ? brlK(item.bonif) : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-semibold text-brand-olive">
                    {item.bonif > 0 && item.temVenda ? pct(item.cmvAjustado) : '—'}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono ${item.temVenda ? (item.margem>=0.65?'text-brand-olive':'text-amber-700') : 'text-zinc-300'}`}>
                    {item.temVenda ? pct(item.margem) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── TABELA DE BONIFICAÇÕES ──────────────────────────── */}
      {bonificacoesFiltradas?.length > 0 && (
        <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-border flex justify-between items-center">
            <div>
              <p className="font-semibold text-brand-black text-sm">🎁 Bonificações do período</p>
              <p className="text-xs text-zinc-400 mt-0.5">
                {bonificacoesFiltradas.length} lançamentos · impacto direto no custo dos produtos
              </p>
            </div>
            <span className="text-xs font-semibold text-brand-olive bg-[#F5F8E8] border border-[#C8D870] px-3 py-1 rounded-full">
              Total: {brlK(totalBonificacoes)}
            </span>
          </div>
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-white border-b border-surface-border">
                <tr>
                  {['Semana','Produto','Categoria','Conta Contábil','Valor Bonificação'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...bonificacoesFiltradas]
                  .sort((a, b) => b.valor - a.valor)
                  .map((item, i) => (
                    <tr key={i} className={`border-b border-surface-border hover:bg-surface-muted ${i%2===0?'':'bg-surface-base'}`}>
                      <td className="px-4 py-2.5 text-zinc-400 font-mono text-[11px]">{item.semanaISO}</td>
                      <td className="px-4 py-2.5 font-medium text-brand-black">{item.produto || '—'}</td>
                      <td className="px-4 py-2.5 text-zinc-500 text-[12px]">{item.categoria || '—'}</td>
                      <td className="px-4 py-2.5 text-zinc-500 text-[12px]">{item.catContabil || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-brand-olive">
                        {brlK(item.valor)}
                      </td>
                    </tr>
                  ))}
              </tbody>
              <tfoot className="border-t-2 border-surface-border bg-surface-muted">
                <tr>
                  <td colSpan={4} className="px-4 py-2.5 font-bold text-brand-black text-[12px]">Total</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-brand-olive">{brlK(totalBonificacoes)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
