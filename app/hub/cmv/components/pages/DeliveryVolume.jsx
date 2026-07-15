import { useState, useEffect } from 'react';
import { useCMV } from '../../hooks/useCMV';
import { loadDeliveryData } from '../../data/loaderDelivery';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const brlK = v => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : `R$ ${(v||0).toFixed(0)}`;
const pct  = v => `${((v||0)*100).toFixed(1)}%`;
const CORES = ['#97A624','#D9B504','#8C1414','#2980b9','#e67e22','#9b59b6','#009e74'];

export default function DeliveryVolume() {
  const { produtos, filtroSemana } = useCMV();
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDeliveryData(produtos, filtroSemana)
      .then(d => { setDados(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [produtos, filtroSemana]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-brand-olive border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
    </div>
  );

  if (!dados || dados.porProduto.length === 0) return (
    <div className="p-5">
      <div className="bg-amber-50 border border-amber-100 rounded-xl px-5 py-4">
        <p className="text-sm font-semibold text-amber-800 mb-1">Sem dados de delivery</p>
        <p className="text-[13px] text-amber-700">Execute <strong>📦 Atualizar vendas ZIG</strong> pelo menu da planilha.</p>
      </div>
    </div>
  );

  const { porProduto, receitaTotal, custoTotal } = dados;
  const top10Receita = [...porProduto].sort((a,b)=>b.receitaTotal-a.receitaTotal).slice(0,10);
  const top10Custo   = [...porProduto].sort((a,b)=>b.custoTotal-a.custoTotal).slice(0,10);

  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Receita Total Delivery</p>
          <p className="text-[26px] font-bold text-brand-black">{brlK(receitaTotal)}</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Custo Total Delivery</p>
          <p className="text-[26px] font-bold text-brand-black">{brlK(custoTotal)}</p>
          <p className="text-[12px] text-zinc-400 mt-1">{pct(receitaTotal>0?custoTotal/receitaTotal:0)} do faturamento</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-surface-border rounded-xl">
          <div className="px-5 py-3.5 border-b border-surface-border">
            <p className="font-semibold text-brand-black text-sm">Top 10 — Maior Receita</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={top10Receita.map(r=>({nome:r.nomePa.length>18?r.nomePa.slice(0,18)+'…':r.nomePa, receita:parseFloat(r.receitaTotal.toFixed(0))}))}
                layout="vertical" margin={{top:4,right:16,left:0,bottom:0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false}/>
                <XAxis type="number" tick={{fontSize:10,fill:'#999'}} tickFormatter={v=>brlK(v)} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="nome" tick={{fontSize:10,fill:'#555'}} width={130} axisLine={false} tickLine={false}/>
                <Tooltip formatter={v=>[brlK(v),'Receita']} contentStyle={{background:'#fff',border:'1px solid #e8e8e2',borderRadius:8,fontSize:12}}/>
                <Bar dataKey="receita" radius={[0,4,4,0]} barSize={14}>
                  {top10Receita.map((_,i)=><Cell key={i} fill={CORES[i%CORES.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white border border-surface-border rounded-xl">
          <div className="px-5 py-3.5 border-b border-surface-border">
            <p className="font-semibold text-brand-black text-sm">Top 10 — Maior Impacto de Custo</p>
          </div>
          <div className="p-4 space-y-2.5 max-h-[280px] overflow-y-auto">
            {top10Custo.map((item,i)=>(
              <div key={item.skuZig} className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-zinc-400 w-4 shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-[12px] font-medium text-brand-black truncate">{item.nomePa}</span>
                    <span className="text-[11px] font-mono text-zinc-600 ml-2 shrink-0">{brlK(item.custoTotal)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-surface-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{width:`${(item.custoTotal/top10Custo[0].custoTotal*100).toFixed(0)}%`,background:CORES[i%CORES.length]}}/>
                    </div>
                    <span className={`text-[10px] font-mono shrink-0 ${item.cmvReal>1?'text-brand-crimson':item.cmvReal>=0.30?'text-amber-700':'text-brand-olive'}`}>
                      {pct(item.cmvReal)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
