import { useState, useEffect } from 'react';
import { useCMV } from '../../hooks/useCMV';
import { loadDeliveryData } from '../../data/loaderDelivery';

const pct = v => `${((v||0)*100).toFixed(1)}%`;
const brl = v => `R$ ${(v||0).toFixed(2)}`;

export default function DeliveryVariacao() {
  const { produtos, histComp, filtroSemana } = useCMV();
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

  // Variação de componentes para produtos de delivery
  const skusDelivery = new Set(dados.porProduto.map(r => r.skuZig));
  const variacaoComp = histComp.filter(r => {
    const prod = produtos.find(p => p.codPa === r.codPa);
    return prod && skusDelivery.has(prod.skuZig);
  });

  const semanas  = [...new Set(variacaoComp.map(r => r.semanaISO))].sort();
  const semAtual = semanas.at(-1) ?? '';
  const semAnt   = semanas.at(-2) ?? '';

  const variacoes = variacaoComp
    .filter(r => r.semanaISO === semAtual)
    .map(r => {
      const ant = variacaoComp.find(h => h.semanaISO === semAnt && h.codPa === r.codPa && h.codComponente === r.codComponente);
      return { ...r, custoAnt: ant?.custoUnit ?? r.custoUnit, delta: ant ? r.custoUnit - ant.custoUnit : 0 };
    })
    .filter(r => Math.abs(r.delta) > 0.01)
    .sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta));

  return (
    <div className="p-5 space-y-4">
      {variacoes.length === 0 ? (
        <div className="bg-white border border-surface-border rounded-xl p-8 text-center">
          <p className="text-sm text-zinc-400 mb-1">
            {semanas.length < 2
              ? 'Grave pelo menos 2 snapshots para ver a variação de ingredientes.'
              : 'Nenhuma variação de custo detectada nos ingredientes do delivery.'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-surface-border">
            <p className="font-semibold text-brand-black text-sm">Variação de ingredientes — produtos delivery</p>
            <p className="text-xs text-zinc-400 mt-0.5">{semAnt.replace('2026-','')} → {semAtual.replace('2026-','')} · {variacoes.length} ingredientes variaram</p>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 bg-white border-b border-surface-border">
                <tr>
                  {['Produto','Ingrediente','Custo Ant.','Custo Atual','Δ','Part. no Custo'].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right first:text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variacoes.map((r,i)=>{
                  const subiu = r.delta > 0;
                  return (
                    <tr key={i} className={`border-b border-surface-border hover:bg-surface-muted ${i%2===0?'':'bg-surface-base'}`}>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-brand-black text-[12px]">{r.nomePa}</p>
                        <p className="text-[10px] text-zinc-400">{r.subcategoria}</p>
                      </td>
                      <td className="px-4 py-2.5 text-zinc-700">{r.descComponente}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{brl(r.custoAnt)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${subiu?'text-brand-crimson':'text-brand-olive'}`}>{brl(r.custoUnit)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-bold ${subiu?'text-brand-crimson':'text-brand-olive'}`}>
                        {subiu?'+':''}{brl(r.delta)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-zinc-500">
                        {pct(r.participacaoPct)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
