import { useState } from 'react';
import { useCMV } from '../../hooks/useCMV';
import StatusBadge from '../ui/StatusBadge';
import PainelIngredientes from '../ui/PainelIngredientes';
import { Search } from 'lucide-react';

const brl = v => `R$ ${(v||0).toFixed(2)}`;
const pct = v => `${((v||0)*100).toFixed(1)}%`;

export default function Rentabilidade() {
  const { produtos, margemPorCategoria, histComp } = useCMV();
  const [busca,         setBusca]         = useState('');
  const [ordenar,       setOrdenar]       = useState('cmv');
  const [filtroCrit,    setFiltroCrit]    = useState('Todos'); // Todos | Crítico | Atenção | OK
  const [painelProduto, setPainelProduto] = useState(null);

  // Filtra e agrupa
  const grupos = {};
  produtos
    .filter(r => {
      if (!r.nomePa.toLowerCase().includes(busca.toLowerCase())) return false;
      if (filtroCrit === 'Crítico') return r.cmvPct >= 0.80;
      if (filtroCrit === 'Atenção') return r.cmvPct >= 0.35 && r.cmvPct < 1;
      if (filtroCrit === 'OK')      return r.cmvPct < 0.35;
      return true;
    })
    .forEach(r => {
      if (!grupos[r.categoria]) grupos[r.categoria] = {};
      if (!grupos[r.categoria][r.subcategoria]) grupos[r.categoria][r.subcategoria] = [];
      grupos[r.categoria][r.subcategoria].push(r);
    });

  Object.values(grupos).forEach(subs =>
    Object.keys(subs).forEach(sub =>
      subs[sub].sort((a, b) =>
        ordenar === 'cmv'    ? b.cmvPct - a.cmvPct :
        ordenar === 'margem' ? b.margemContribPct - a.margemContribPct :
        a.nomePa.localeCompare(b.nomePa)
      )
    )
  );

  const totalFiltrado = Object.values(grupos).flatMap(s => Object.values(s).flat()).length;

  return (
    <div className="p-5 space-y-4">

      {/* Controles */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-8 pr-3 h-8 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:border-zinc-400"/>
        </div>

        {/* Filtro de criticidade */}
        <div className="flex gap-1.5">
          {['Todos','Crítico','Atenção','OK'].map(op => (
            <button key={op} onClick={() => setFiltroCrit(op)}
              className={`px-3 h-8 rounded-lg text-[12px] font-medium transition-colors border
                ${filtroCrit === op
                  ? op === 'Crítico' ? 'bg-brand-crimson text-white border-brand-crimson'
                  : op === 'Atenção' ? 'bg-amber-500 text-white border-amber-500'
                  : op === 'OK'      ? 'bg-brand-olive text-white border-brand-olive'
                  : 'bg-brand-black text-white border-brand-black'
                  : 'bg-white text-zinc-500 border-surface-border hover:border-zinc-400'}`}>
              {op}
            </button>
          ))}
        </div>

        <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
          className="text-[12.5px] border border-surface-border rounded-lg px-2.5 h-8 bg-white focus:outline-none">
          <option value="cmv">Ordenar: CMV%</option>
          <option value="margem">Ordenar: Margem</option>
          <option value="nome">Ordenar: Nome</option>
        </select>
        <span className="text-xs text-zinc-400">{totalFiltrado} produtos · clique para ver ingredientes</span>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {margemPorCategoria.slice(0, 4).map(r => (
          <div key={r.categoria} className="bg-white border border-surface-border rounded-xl p-3">
            <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide mb-1.5 truncate">{r.categoria}</p>
            <div className="flex justify-between items-end">
              <div>
                <p className={`text-[18px] font-bold ${r.cmvMedio>=0.80?'text-brand-crimson':r.cmvMedio>=0.35?'text-amber-700':'text-brand-olive'}`}>
                  {pct(r.cmvMedio)}
                </p>
                <p className="text-[11px] text-zinc-400">CMV médio</p>
              </div>
              <div className="text-right">
                <p className={`text-[15px] font-semibold ${r.margemMedia>=0.65?'text-brand-olive':'text-amber-700'}`}>
                  {pct(r.margemMedia)}
                </p>
                <p className="text-[11px] text-zinc-400">margem</p>
              </div>
            </div>
            {r.criticos > 0 && (
              <p className="text-[10px] text-brand-crimson font-semibold mt-1.5">⚠ {r.criticos} crítico{r.criticos>1?'s':''}</p>
            )}
          </div>
        ))}
      </div>

      {/* Tabelas */}
      {Object.entries(grupos).map(([cat, subs]) => (
        <div key={cat} className="bg-white border border-surface-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-border bg-surface-muted flex items-center justify-between">
            <p className="font-semibold text-brand-black text-sm">{cat}</p>
            {margemPorCategoria.find(r => r.categoria === cat) && (() => {
              const m = margemPorCategoria.find(r => r.categoria === cat);
              return (
                <div className="flex gap-4 text-[11px] text-zinc-400">
                  <span>CMV médio: <strong className="text-brand-black">{pct(m.cmvMedio)}</strong></span>
                  <span>Margem: <strong className="text-brand-black">{pct(m.margemMedia)}</strong></span>
                </div>
              );
            })()}
          </div>

          {Object.entries(subs).map(([sub, itens]) => (
            <div key={sub}>
              <div className="px-5 py-2 border-b border-surface-border bg-surface-base">
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{sub}</p>
              </div>
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-surface-border">
                    <th className="px-5 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-left">Produto</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">Preço Venda</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">Custo</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">CMV%</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">Margem</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">Status</th>
                    <th className="px-4 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right">Sugestão</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map(item => (
                    <tr key={item.codPa}
                      onClick={() => setPainelProduto(item)}
                      className="border-b border-surface-border hover:bg-surface-muted cursor-pointer transition-colors group">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-brand-black">{item.nomePa}</p>
                          <span className="text-[10px] text-zinc-300 group-hover:text-brand-olive transition-colors">
                            ver ingredientes →
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500 font-mono text-[12px]">{brl(item.precoVenda)}</td>
                      <td className="px-4 py-3 text-right text-zinc-500 font-mono text-[12px]">{brl(item.custoIngr)}</td>
                      <td className={`px-4 py-3 text-right font-mono font-bold text-[13px]
                        ${item.cmvPct>=0.80?'text-brand-crimson':item.cmvPct>=0.35?'text-amber-700':'text-brand-olive'}`}>
                        {pct(item.cmvPct)}
                      </td>
                      <td className={`px-4 py-3 text-right font-mono font-semibold text-[12px]
                        ${item.margemContribPct>=0.65?'text-brand-olive':'text-amber-700'}`}>
                        {pct(item.margemContribPct)}
                      </td>
                      <td className="px-4 py-3 text-right"><StatusBadge cmvPct={item.cmvPct}/></td>
                      <td className="px-4 py-3 text-right text-[11px] font-mono text-brand-olive font-semibold">
                        {item.cmvPct > 0.30 ? `Sug. ${brl(item.precoSugerido)}` : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ))}

      {totalFiltrado === 0 && (
        <div className="text-center py-12 text-zinc-400 text-sm">
          Nenhum produto encontrado com esse filtro.
        </div>
      )}

      {/* Painel lateral */}
      {painelProduto && (
        <PainelIngredientes produto={painelProduto} histComp={histComp} onClose={() => setPainelProduto(null)}/>
      )}
    </div>
  );
}
