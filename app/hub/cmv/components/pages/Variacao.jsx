import { useState, useMemo } from 'react';
import { useCMV } from '../../hooks/useCMV';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

const pct = v => `${((v||0)*100).toFixed(1)}%`;
const brl = v => `R$ ${(v||0).toFixed(4)}`;
const pp  = v => v > 0 ? `+${(v*100).toFixed(1)}pp` : `${(v*100).toFixed(1)}pp`;

function DeltaBadge({ delta }) {
  if (Math.abs(delta) < 0.001) return <span className="text-zinc-400 text-[11px]">—</span>;
  const up = delta > 0;
  return (
    <span className={`flex items-center gap-0.5 text-[12px] font-semibold ${up?'text-brand-crimson':'text-brand-olive'}`}>
      {up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
      {pp(delta)}
    </span>
  );
}

const CORES = {
  'Alimentos': '#8C1414',
  'Bebidas alcoólicas': '#2980b9',
  'Bebidas não alcoólicas': '#27ae60',
  'Delivery': '#e67e22',
};

export default function Variacao() {
  const { historico = [], loading } = useCMV();
  const [tab, setTab] = useState('diaria');

  // Datas disponíveis
  const datas = useMemo(() =>
    [...new Set(historico.map(r => r.data))].sort().reverse(),
  [historico]);

  const dataAtual = datas[0] ?? '';
  const dataAnt   = datas[1] ?? '';

  // ── Variação diária ────────────────────────────────────────
  const variacaoDiaria = useMemo(() => {
    if (!dataAtual || !dataAnt) return [];

    const atual = {};
    const ant   = {};

    historico.filter(r => r.data === dataAtual).forEach(r => { atual[r.codPa] = r; });
    historico.filter(r => r.data === dataAnt).forEach(r => { ant[r.codPa] = r; });

    return Object.entries(atual)
      .map(([codPa, a]) => {
        const b = ant[codPa];
        if (!b) return null;
        const deltaCMV   = a.cmvPct - b.cmvPct;
        const deltaCusto = a.custoIngr - b.custoIngr;
        if (Math.abs(deltaCMV) < 0.001) return null;
        return {
          codPa,
          nomePa:      a.nomePa,
          categoria:   a.categoria,
          catContabil: a.catContabil,
          cmvAnt:      b.cmvPct,
          cmvAtual:    a.cmvPct,
          deltaCMV,
          custoAnt:    b.custoIngr,
          custoAtual:  a.custoIngr,
          deltaCusto,
          precoVenda:  a.precoVenda,
        };
      })
      .filter(Boolean)
      .sort((a,b) => Math.abs(b.deltaCMV) - Math.abs(a.deltaCMV));
  }, [historico, dataAtual, dataAnt]);

  // ── Variação semanal ────────────────────────────────────────
  const graficoCMV = useMemo(() => {
    if (datas.length < 2) return [];
    // Agrupa por data e catContabil
    const porData = {};
    historico.filter(r => r.cardapio === 'Sim' && r.precoVenda > 0).forEach(r => {
      if (!porData[r.data]) porData[r.data] = {};
      const cc = r.catContabil || 'Outros';
      if (!porData[r.data][cc]) porData[r.data][cc] = { custos: 0, precos: 0 };
      porData[r.data][cc].custos += r.custoIngr;
      porData[r.data][cc].precos += r.precoVenda;
    });

    return Object.entries(porData)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([data, cats]) => {
        const ponto = { data: data.slice(5) }; // MM-DD
        Object.entries(cats).forEach(([cc, v]) => {
          ponto[cc] = parseFloat((v.precos > 0 ? v.custos/v.precos*100 : 0).toFixed(1));
        });
        return ponto;
      });
  }, [historico, datas]);

  const topVariacao = useMemo(() => {
    if (datas.length < 2) return [];
    const primeira = datas[datas.length - 1];
    const ultima   = datas[0];
    const primMap  = {};
    const ultMap   = {};
    historico.filter(r => r.data === primeira).forEach(r => { primMap[r.codPa] = r; });
    historico.filter(r => r.data === ultima).forEach(r => { ultMap[r.codPa] = r; });

    return Object.entries(ultMap)
      .map(([codPa, u]) => {
        const p = primMap[codPa];
        if (!p) return null;
        return {
          nomePa:   u.nomePa,
          categoria: u.categoria,
          cmvPrim:  p.cmvPct,
          cmvUlt:   u.cmvPct,
          delta:    u.cmvPct - p.cmvPct,
        };
      })
      .filter(Boolean)
      .sort((a,b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 20);
  }, [historico, datas]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-7 h-7 border-2 border-brand-olive border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="p-5 space-y-4">

      {/* Tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {[['diaria','Variação Diária'],['semanal','Variação Semanal']].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`px-4 h-8 rounded-lg text-[13px] font-medium transition-colors border
              ${tab===k?'bg-brand-black text-white border-brand-black':'bg-white text-zinc-500 border-surface-border hover:border-zinc-400'}`}>
            {l}
          </button>
        ))}
        {datas.length === 0 && (
          <span className="text-[12px] text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
            Sem histórico — cole o XLSX na ficha_tecnica e clique em "📸 Gravar snapshot agora"
          </span>
        )}
        {datas.length === 1 && (
          <span className="text-[12px] text-amber-600 bg-amber-50 px-3 py-1 rounded-lg border border-amber-100">
            Só 1 snapshot — variação aparece após o 2º dia
          </span>
        )}
        {datas.length >= 2 && (
          <span className="text-[11px] text-zinc-400">
            {datas.length} snapshots · {datas[datas.length-1]} → {datas[0]}
          </span>
        )}
      </div>

      {/* ── TAB DIÁRIA ── */}
      {tab === 'diaria' && (
        <div className="space-y-4">
          {datas.length < 2 ? (
            <div className="bg-white border border-surface-border rounded-xl p-8 text-center">
              <p className="text-zinc-400 text-sm">Precisa de pelo menos 2 snapshots para ver variação diária.</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-surface-border rounded-xl px-5 py-3 flex items-center gap-3">
                <p className="text-[12px] text-zinc-400">Comparando</p>
                <span className="text-[12px] font-semibold bg-surface-muted px-2 py-0.5 rounded">{dataAnt}</span>
                <span className="text-zinc-300">→</span>
                <span className="text-[12px] font-semibold bg-surface-muted px-2 py-0.5 rounded">{dataAtual}</span>
                <span className="ml-auto text-[11px] text-zinc-400">{variacaoDiaria.length} produtos variaram</span>
              </div>

              {variacaoDiaria.length === 0 ? (
                <div className="bg-white border border-surface-border rounded-xl p-6 text-center">
                  <p className="text-zinc-400 text-sm">Nenhum produto variou entre esses dois dias.</p>
                </div>
              ) : (
                <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
                  <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                    <table className="w-full text-[13px]">
                      <thead className="sticky top-0 bg-white border-b border-surface-border">
                        <tr>
                          {['Produto','Categoria','Conta Contábil','Custo Ant.','Custo Atual','Δ Custo','CMV Ant.','CMV Atual','Δ CMV'].map(h => (
                            <th key={h} className="px-4 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right first:text-left">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {variacaoDiaria.map((r,i) => (
                          <tr key={r.codPa} className={`border-b border-surface-border hover:bg-surface-muted ${i%2===0?'':'bg-surface-base'}`}>
                            <td className="px-4 py-2.5 font-medium text-brand-black">{r.nomePa}</td>
                            <td className="px-4 py-2.5 text-zinc-500 text-[12px]">{r.categoria}</td>
                            <td className="px-4 py-2.5 text-zinc-500 text-[11px]">
                              <span className="bg-surface-muted px-1.5 py-0.5 rounded-full">{r.catContabil || '—'}</span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{brl(r.custoAnt)}</td>
                            <td className={`px-4 py-2.5 text-right font-mono font-semibold ${r.deltaCusto>0?'text-brand-crimson':'text-brand-olive'}`}>{brl(r.custoAtual)}</td>
                            <td className="px-4 py-2.5 text-right">
                              <span className={`text-[11px] font-semibold ${r.deltaCusto>0?'text-brand-crimson':'text-brand-olive'}`}>
                                {r.deltaCusto>0?'+':''}{brl(r.deltaCusto)}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{pct(r.cmvAnt)}</td>
                            <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.cmvAtual>=0.80?'text-brand-crimson':r.cmvAtual>=0.35?'text-amber-700':'text-brand-olive'}`}>{pct(r.cmvAtual)}</td>
                            <td className="px-4 py-2.5 text-right"><DeltaBadge delta={r.deltaCMV}/></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── TAB SEMANAL ── */}
      {tab === 'semanal' && (
        <div className="space-y-4">
          {graficoCMV.length < 2 ? (
            <div className="bg-white border border-surface-border rounded-xl p-8 text-center">
              <p className="text-zinc-400 text-sm">Precisa de pelo menos 2 snapshots para ver a evolução.</p>
            </div>
          ) : (
            <>
              <div className="bg-white border border-surface-border rounded-xl">
                <div className="px-5 py-3.5 border-b border-surface-border">
                  <p className="font-semibold text-brand-black text-sm">Evolução do CMV por conta contábil</p>
                  <p className="text-xs text-zinc-400 mt-0.5">CMV ponderado (custo/preço) por dia</p>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={graficoCMV} margin={{top:4,right:16,left:-10,bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false}/>
                      <XAxis dataKey="data" tick={{fontSize:11,fill:'#999'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fontSize:10,fill:'#999'}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/>
                      <Tooltip formatter={(v,n)=>[`${v}%`,n]} contentStyle={{background:'#fff',border:'1px solid #e8e8e2',borderRadius:8,fontSize:12}}/>
                      <ReferenceLine y={30} stroke="#97A624" strokeDasharray="4 2" strokeWidth={1.5} label={{value:'30%',fontSize:10,fill:'#97A624'}}/>
                      <Legend wrapperStyle={{fontSize:11}}/>
                      {Object.entries(CORES).map(([cat, cor]) =>
                        graficoCMV.some(d => d[cat]) && (
                          <Line key={cat} type="monotone" dataKey={cat} stroke={cor}
                            strokeWidth={2} dot={{r:3}} activeDot={{r:5}}/>
                        )
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-surface-border">
                  <p className="font-semibold text-brand-black text-sm">Top produtos — maior variação no período</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{datas[datas.length-1]} → {datas[0]}</p>
                </div>
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="w-full text-[13px]">
                    <thead className="sticky top-0 bg-white border-b border-surface-border">
                      <tr>
                        {['Produto','Categoria','CMV Inicial','CMV Final','Δ CMV'].map(h => (
                          <th key={h} className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right first:text-left">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {topVariacao.map((r,i) => (
                        <tr key={r.nomePa+i} className={`border-b border-surface-border hover:bg-surface-muted ${i%2===0?'':'bg-surface-base'}`}>
                          <td className="px-4 py-2.5 font-medium text-brand-black">{r.nomePa}</td>
                          <td className="px-4 py-2.5 text-zinc-500 text-[12px]">{r.categoria}</td>
                          <td className="px-4 py-2.5 text-right font-mono text-zinc-400">{pct(r.cmvPrim)}</td>
                          <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.delta>0?'text-brand-crimson':'text-brand-olive'}`}>{pct(r.cmvUlt)}</td>
                          <td className="px-4 py-2.5 text-right"><DeltaBadge delta={r.delta}/></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
