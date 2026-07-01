import { useMemo } from 'react';
import { X, TrendingUp, TrendingDown } from 'lucide-react';
import { useCMV } from '../../hooks/useCMV';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const brl = v => `R$ ${(v||0).toFixed(2)}`;
const pct = v => `${((v||0)*100).toFixed(1)}%`;

const LIMITE_VARIACAO = 5; // % de variação para destacar

export default function PainelIngredientes({ produto, onClose }) {
  const { history = [], histIng = [] } = useCMV();
  if (!produto) return null;

  const status = produto.cmvPct >= 0.80 ? 'Crítico' : produto.cmvPct >= 0.35 ? 'Atenção' : 'OK';
  const statusBg = produto.cmvPct >= 0.80
    ? 'bg-red-50 text-brand-crimson border-red-200'
    : produto.cmvPct >= 0.35
    ? 'bg-amber-50 text-amber-700 border-amber-200'
    : 'bg-green-50 text-brand-olive border-green-200';

  const ingredientes = produto.ingredientes || [];

  // Busca variação de cada ingrediente no historico_ingredientes
  const variacaoInsumos = useMemo(() => {
    if (!histIng.length || !produto.codPa) return {};
    // Datas disponíveis para este produto
    const datas = [...new Set(
      histIng.filter(r => r.codPa === produto.codPa).map(r => r.data)
    )].sort();
    if (datas.length < 2) return {};

    const dataAtual = datas[datas.length - 1];
    const dataAnt   = datas[datas.length - 2];

    const ingAtual = {};
    const ingAnt   = {};
    histIng.filter(r => r.codPa === produto.codPa && r.data === dataAtual)
      .forEach(r => { ingAtual[r.codComponente] = r; });
    histIng.filter(r => r.codPa === produto.codPa && r.data === dataAnt)
      .forEach(r => { ingAnt[r.codComponente] = r; });

    const result = {};
    ingredientes.forEach(ing => {
      const cod  = ing.codComponente;
      const atual = ingAtual[cod];
      const ant   = ingAnt[cod];
      if (!atual || !ant) return;
      const delta    = atual.custoUnit - ant.custoUnit;
      const deltaPct = ant.custoUnit > 0 ? (delta / ant.custoUnit * 100) : 0;
      if (Math.abs(deltaPct) >= LIMITE_VARIACAO) {
        result[cod] = {
          custoAnt:   ant.custoUnit,
          custoAtual: atual.custoUnit,
          delta,
          deltaPct,
        };
      }
    });
    return result;
  }, [histIng, ingredientes, produto.codPa]);

  // Evolução do CMV do produto no historico
  const evolucaoCMV = useMemo(() => {
    if (!histIng.length || !produto.codPa) return [];
    // Agrupa por data e calcula custo total do produto
    const porData = {};
    histIng.filter(r => r.codPa === produto.codPa).forEach(r => {
      if (!porData[r.data]) porData[r.data] = 0;
      porData[r.data] += r.custoIngr || 0;
    });
    return Object.entries(porData)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([data, custo]) => ({
        data: data.slice(5), // MM-DD
        cmv:  produto.precoVenda > 0
          ? parseFloat((custo / produto.precoVenda * 100).toFixed(1))
          : 0,
      }));
  }, [histIng, produto.codPa, produto.precoVenda]);

  const temVariacao    = Object.keys(variacaoInsumos).length > 0;
  const temEvolucao    = evolucaoCMV.length >= 2;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose}/>
      <div className="fixed top-0 right-0 h-full w-full md:w-[520px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 py-5 border-b border-surface-border shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">
                {produto.categoria} · {produto.subcategoria}
              </p>
              <h2 className="text-[18px] font-bold text-brand-black leading-tight">{produto.nomePa}</h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-muted shrink-0">
              <X size={16} className="text-zinc-400"/>
            </button>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Preço venda</p>
              <p className="text-[16px] font-bold text-brand-black">{brl(produto.precoVenda)}</p>
            </div>
            <div className="bg-surface-base rounded-lg p-3">
              <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">Custo total</p>
              <p className="text-[16px] font-bold text-brand-black">{brl(produto.custoIngr)}</p>
            </div>
            <div className={`rounded-lg p-3 border ${statusBg}`}>
              <p className="text-[10px] font-semibold uppercase tracking-wide mb-1 opacity-70">CMV atual</p>
              <div className="flex items-center gap-1.5">
                <p className="text-[18px] font-bold leading-none">{pct(produto.cmvPct)}</p>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-white/60">{status}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 mt-3 text-[12px]">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400">Margem:</span>
              <span className={`font-semibold ${produto.margemContribPct>=0.65?'text-brand-olive':'text-amber-700'}`}>
                {pct(produto.margemContribPct)}
              </span>
            </div>
            {produto.cmvPct > 0.30 && (
              <div className="flex items-center gap-1.5">
                <span className="text-zinc-400">Preço sugerido (30%):</span>
                <span className="font-semibold text-brand-olive">{brl(produto.precoSugerido)}</span>
              </div>
            )}
          </div>

          {/* Alerta de insumos variados */}
          {temVariacao && (
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex items-center gap-2">
              <TrendingUp size={13} className="text-amber-600 shrink-0"/>
              <p className="text-[11px] text-amber-700 font-medium">
                {Object.keys(variacaoInsumos).length} ingrediente{Object.keys(variacaoInsumos).length > 1 ? 's' : ''} com variação de custo acima de {LIMITE_VARIACAO}%
              </p>
            </div>
          )}
        </div>

        {/* Conteúdo scrollável */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-4 space-y-5">

            {/* Gráfico de evolução do CMV */}
            {temEvolucao && (
              <div>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                  Evolução do CMV
                </p>
                <div className="bg-surface-base rounded-xl p-3">
                  <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={evolucaoCMV} margin={{top:4,right:8,left:-20,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false}/>
                      <XAxis dataKey="data" tick={{fontSize:10,fill:'#999'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#999'}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/>
                      <Tooltip formatter={v=>[`${v}%`,'CMV']} contentStyle={{background:'#fff',border:'1px solid #e8e8e2',borderRadius:8,fontSize:11}}/>
                      <ReferenceLine y={30} stroke="#97A624" strokeDasharray="4 2" strokeWidth={1}/>
                      <Line type="monotone" dataKey="cmv" stroke="#8C1414" strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-[10px] text-zinc-300 text-right mt-1">linha verde = meta 30%</p>
                </div>
              </div>
            )}

            {/* Ingredientes */}
            <div>
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-3">
                Composição — {ingredientes.length} ingrediente{ingredientes.length !== 1 ? 's' : ''}
              </p>

              {ingredientes.length === 0 ? (
                <p className="text-sm text-zinc-400 text-center py-6">Nenhum ingrediente encontrado.</p>
              ) : (
                <div className="space-y-2">
                  {ingredientes
                    .sort((a, b) => b.custoIngr - a.custoIngr)
                    .map((ing, i) => {
                      const share   = produto.custoIngr > 0 ? ing.custoIngr / produto.custoIngr : 0;
                      const variou  = variacaoInsumos[ing.codComponente];
                      const subiu   = variou && variou.delta > 0;
                      const caiu    = variou && variou.delta < 0;

                      return (
                        <div key={i} className={`rounded-xl p-3.5 border transition-colors
                          ${variou
                            ? subiu
                              ? 'bg-red-50 border-red-200'
                              : 'bg-green-50 border-green-200'
                            : 'bg-surface-base border-transparent'}`}>

                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-1.5 flex-1 min-w-0">
                              {variou && (
                                subiu
                                  ? <TrendingUp size={12} className="text-brand-crimson shrink-0"/>
                                  : <TrendingDown size={12} className="text-brand-olive shrink-0"/>
                              )}
                              <p className="text-[13px] font-medium text-brand-black leading-tight truncate">
                                {ing.descComponente || ing.codComponente}
                              </p>
                            </div>
                            <div className="text-right ml-3 shrink-0">
                              <p className="text-[14px] font-mono font-semibold text-brand-black">{brl(ing.custoIngr)}</p>
                              {variou && (
                                <div className={`text-[11px] font-semibold mt-0.5 ${subiu?'text-brand-crimson':'text-brand-olive'}`}>
                                  {subiu?'↑':'↓'} {brl(variou.custoAnt)} → {brl(variou.custoAtual)}
                                  <span className="ml-1 opacity-70">({variou.deltaPct > 0 ? '+' : ''}{variou.deltaPct.toFixed(1)}%)</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden mb-2">
                            <div className={`h-full rounded-full ${variou ? (subiu ? 'bg-brand-crimson' : 'bg-brand-olive') : 'bg-brand-olive'}`}
                              style={{ width: `${(share * 100).toFixed(0)}%` }}/>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-zinc-400">
                            <span>{ing.qtd} {ing.und} × {brl(ing.custoUnit)}/un</span>
                            <span className="font-semibold text-zinc-600">{(share * 100).toFixed(1)}% do custo</span>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Total */}
            <div className="bg-brand-black rounded-xl p-3.5 flex items-center justify-between">
              <p className="text-[13px] font-semibold text-white">Total</p>
              <div className="text-right">
                <p className="text-[16px] font-bold text-white">{brl(produto.custoIngr)}</p>
                <p className="text-[11px] text-zinc-400">de {brl(produto.precoVenda)} vendidos</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
