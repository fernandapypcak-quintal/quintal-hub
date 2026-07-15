import { useState, useEffect } from 'react';
import { useCMV } from '../../hooks/useCMV';
import { loadDeliveryData } from '../../data/loaderDelivery';
import PainelIngredientes from '../ui/PainelIngredientes';
import { Search, Settings2, Save, Check } from 'lucide-react';
import { saveParametros } from '../../data/loader';

const brl  = v => `R$ ${(v||0).toFixed(2)}`;
const brlK = v => v >= 1000 ? `R$ ${(v/1000).toFixed(1)}k` : `R$ ${(v||0).toFixed(0)}`;
const pct  = v => `${((v||0)*100).toFixed(1)}%`;

export default function DeliveryRentabilidade() {
  const { produtos, histComp, filtroSemana, parametros } = useCMV();
  const [dados,      setDados]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [busca,      setBusca]      = useState('');
  const [ordenar,    setOrdenar]    = useState('custo');
  const [filtroCrit, setFiltroCrit] = useState('Todos');
  const [painel,     setPainel]     = useState(null);

  // Parâmetros — carregados da planilha via hook
  const [taxaIfood,       setTaxaIfood]       = useState(24.8);
  const [embalagemPadrao, setEmbalagemPadrao] = useState(3.00);
  const [embalagensCustom, setEmbalagensCustom] = useState({});
  const [salvando,  setSalvando]  = useState(false);
  const [salvoOk,   setSalvoOk]   = useState(false);

  // Sincroniza com parâmetros vindos da planilha
  useEffect(() => {
    if (parametros) {
      if (parametros.taxa_ifood)       setTaxaIfood(parametros.taxa_ifood);
      if (parametros.embalagem_padrao) setEmbalagemPadrao(parametros.embalagem_padrao);
    }
  }, [parametros]);

  async function handleSalvar() {
    setSalvando(true);
    await saveParametros({ taxa_ifood: taxaIfood, embalagem_padrao: embalagemPadrao });
    setSalvando(false);
    setSalvoOk(true);
    setTimeout(() => setSalvoOk(false), 3000);
  }

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
        <p className="text-[13px] text-amber-700">
          Execute <strong>📦 Atualizar vendas ZIG</strong> pelo menu da planilha.
        </p>
      </div>
    </div>
  );

  const taxaDecimal = taxaIfood / 100;

  // Calcula CMV com taxa iFood e embalagem por produto
  function calcCMV(item) {
    const embalagem   = embalagensCustom[item.skuZig] ?? embalagemPadrao;
    const custoReal   = item.custoUnit + embalagem;
    const recLiquida  = item.precoMedio * (1 - taxaDecimal);
    const cmvReal     = recLiquida > 0 ? custoReal / recLiquida : 0;
    const margemReal  = recLiquida > 0 ? (recLiquida - custoReal) / recLiquida : 0;
    const recTotalLiq = item.receitaTotal * (1 - taxaDecimal);
    const custoTotal  = (item.custoUnit + embalagem) * item.qtdTotal;
    return { embalagem, custoReal, recLiquida, cmvReal, margemReal, recTotalLiq, custoTotal };
  }

  // KPIs consolidados (só com ficha)
  const comFicha = dados.porProduto.filter(r => r.temFicha);
  const recLiqTotal   = comFicha.reduce((s,r) => s + r.receitaTotal*(1-taxaDecimal), 0);
  const custoTotalAdj = comFicha.reduce((s,r) => {
    const emb = embalagensCustom[r.skuZig] ?? embalagemPadrao;
    return s + (r.custoUnit + emb) * r.qtdTotal;
  }, 0);
  const cmvGeral = recLiqTotal > 0 ? custoTotalAdj / recLiqTotal : 0;

  // Filtra e ordena
  const filtrados = dados.porProduto.filter(r => {
    const { cmvReal } = calcCMV(r);
    if (!r.nomePa.toLowerCase().includes(busca.toLowerCase())) return false;
    if (filtroCrit === 'Crítico') return cmvReal >= 0.80;
    if (filtroCrit === 'Atenção') return cmvReal >= 0.35 && cmvReal < 0.80;
    if (filtroCrit === 'OK')      return cmvReal < 0.35;
    return true;
  }).sort((a, b) => {
    const ca = calcCMV(a), cb = calcCMV(b);
    if (ordenar === 'custo')   return cb.custoTotal - ca.custoTotal;
    if (ordenar === 'receita') return b.receitaTotal - a.receitaTotal;
    if (ordenar === 'cmv')     return cb.cmvReal - ca.cmvReal;
    return a.nomePa.localeCompare(b.nomePa);
  });

  function abrirPainel(item) {
    const prod = produtos.find(p => p.skuZig === item.skuZig);
    if (prod) setPainel(prod);
  }

  return (
    <div className="p-5 space-y-4">

      {/* Parâmetros editáveis */}
      <div className="bg-white border border-surface-border rounded-xl px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings2 size={14} className="text-zinc-400"/>
          <p className="text-[12px] font-semibold text-zinc-600 uppercase tracking-wide">Parâmetros do Delivery</p>
          <p className="text-[11px] text-zinc-400 ml-1">— altere para recalcular o CMV em tempo real</p>
        </div>
        <div className="flex items-center gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-zinc-500 whitespace-nowrap">Taxa iFood (%)</label>
            <div className="relative">
              <input
                type="number" min="0" max="100" step="0.1"
                value={taxaIfood}
                onChange={e => setTaxaIfood(parseFloat(e.target.value) || 0)}
                className="w-20 text-right font-mono text-[13px] font-semibold border border-surface-border rounded-lg px-2 h-8 focus:outline-none focus:border-zinc-400"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">%</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-[12px] text-zinc-500 whitespace-nowrap">Embalagem padrão (R$)</label>
            <div className="relative">
              <input
                type="number" min="0" step="0.1"
                value={embalagemPadrao}
                onChange={e => setEmbalagemPadrao(parseFloat(e.target.value) || 0)}
                className="w-24 text-right font-mono text-[13px] font-semibold border border-surface-border rounded-lg px-2 h-8 focus:outline-none focus:border-zinc-400"
              />
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-zinc-400">R$</span>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <div className="text-right">
              <p className="text-[11px] text-zinc-400">CMV com ajustes</p>
              <p className={`text-[20px] font-bold ${cmvGeral>0.30?'text-amber-700':'text-brand-olive'}`}>
                {pct(cmvGeral)}
              </p>
            </div>
            <button onClick={handleSalvar} disabled={salvando}
              className={`flex items-center gap-1.5 px-4 h-8 rounded-lg text-[12px] font-semibold transition-all
                ${salvoOk
                  ? 'bg-brand-olive text-white'
                  : 'bg-brand-black text-white hover:bg-zinc-800'}`}>
              {salvoOk ? <><Check size={13}/> Salvo!</> : salvando ? 'Salvando...' : <><Save size={13}/> Salvar</>}
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Receita Bruta</p>
          <p className="text-[24px] font-bold text-brand-black leading-none">{brlK(dados.receitaTotal)}</p>
          <p className="text-[11px] text-zinc-400 mt-1">antes da taxa iFood</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Receita Líquida</p>
          <p className="text-[24px] font-bold text-brand-black leading-none">{brlK(recLiqTotal)}</p>
          <p className="text-[11px] text-zinc-400 mt-1">após {pct(taxaDecimal)} iFood</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Custo Total Ajustado</p>
          <p className="text-[24px] font-bold text-brand-black leading-none">{brlK(custoTotalAdj)}</p>
          <p className="text-[11px] text-zinc-400 mt-1">ingredientes + embalagem</p>
        </div>
        <div className="bg-white border border-surface-border rounded-xl p-4">
          <p className="text-[10.5px] font-semibold text-zinc-400 uppercase tracking-wide mb-2">Produtos</p>
          <p className="text-[24px] font-bold text-brand-black leading-none">{dados.porProduto.length}</p>
          {dados.semFicha > 0 && (
            <p className="text-[11px] text-amber-700 mt-1">{dados.semFicha} sem ficha técnica</p>
          )}
        </div>
      </div>

      {/* Controles */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"/>
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar produto..."
            className="w-full pl-8 pr-3 h-8 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:border-zinc-400"/>
        </div>
        <div className="flex gap-1.5">
          {['Todos','Crítico','Atenção','OK'].map(op => (
            <button key={op} onClick={() => setFiltroCrit(op)}
              className={`px-3 h-8 rounded-lg text-[12px] font-medium transition-colors border
                ${filtroCrit===op
                  ? op==='Crítico'?'bg-brand-crimson text-white border-brand-crimson'
                  : op==='Atenção'?'bg-amber-500 text-white border-amber-500'
                  : op==='OK'?'bg-brand-olive text-white border-brand-olive'
                  : 'bg-brand-black text-white border-brand-black'
                  : 'bg-white text-zinc-500 border-surface-border hover:border-zinc-400'}`}>
              {op}
            </button>
          ))}
        </div>
        <select value={ordenar} onChange={e => setOrdenar(e.target.value)}
          className="text-[12.5px] border border-surface-border rounded-lg px-2.5 h-8 bg-white focus:outline-none">
          <option value="custo">Ordenar: Maior custo</option>
          <option value="receita">Ordenar: Maior receita</option>
          <option value="cmv">Ordenar: CMV%</option>
          <option value="nome">Ordenar: Nome</option>
        </select>
        <span className="text-xs text-zinc-400">{filtrados.length} produtos</span>
      </div>

      {/* Tabela */}
      <div className="bg-white border border-surface-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-surface-border bg-surface-muted">
                {['Produto','Qtd','Rec. Bruta','Rec. Líquida','Custo Ingr.','Embalagem','Custo Total','CMV Real','Margem',''].map(h => (
                  <th key={h} className="px-3 py-2.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wide text-right first:text-left last:text-center">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((item, i) => {
                const { embalagem, custoReal, recLiquida, cmvReal, margemReal, recTotalLiq, custoTotal } = calcCMV(item);
                return (
                  <tr key={item.skuZig}
                    className={`border-b border-surface-border hover:bg-surface-muted ${i%2===0?'':'bg-surface-base'}
                      ${!item.temFicha?'opacity-50':''}`}>
                    <td className="px-3 py-2.5">
                      <p className={`font-medium ${item.temFicha ? 'text-brand-black' : 'text-amber-700'}`}>
                        {item.nomePa || <span className="italic text-zinc-400">Nome não disponível</span>}
                      </p>
                      <p className="text-[10px] text-zinc-400">
                        {item.categoria || ''}
                        {!item.temFicha && <span className="ml-1 text-amber-500">· SKU: {item.skuZig}</span>}
                      </p>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-semibold text-brand-black">{item.qtdTotal}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-zinc-500 text-[11px]">{brlK(item.receitaTotal)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-zinc-600">{brlK(recTotalLiq)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-zinc-500 text-[11px]">{brl(item.custoUnit)}</td>
                    {/* Embalagem editável por produto */}
                    <td className="px-3 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <span className="text-[10px] text-zinc-400">R$</span>
                        <input
                          type="number" min="0" step="0.5"
                          value={embalagem}
                          onChange={e => setEmbalagensCustom(prev => ({
                            ...prev, [item.skuZig]: parseFloat(e.target.value) || 0
                          }))}
                          className="w-14 text-right font-mono text-[12px] border border-surface-border rounded px-1 h-6 focus:outline-none focus:border-zinc-400 bg-white"
                        />
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-zinc-600">{brlK(custoTotal)}</td>
                    <td className={`px-3 py-2.5 text-right font-mono font-bold
                      ${cmvReal>=0.80?'text-brand-crimson':cmvReal>=0.35?'text-amber-700':'text-brand-olive'}`}>
                      {pct(cmvReal)}
                    </td>
                    <td className={`px-3 py-2.5 text-right font-mono font-semibold
                      ${margemReal>=0.65?'text-brand-olive':'text-amber-700'}`}>
                      {pct(margemReal)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {item.temFicha ? (
                        <button onClick={() => abrirPainel(item)}
                          className="text-[11px] text-brand-olive hover:underline">ver →</button>
                      ) : (
                        <span className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full">sem ficha</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {painel && <PainelIngredientes produto={painel} histComp={histComp} onClose={() => setPainel(null)}/>}
    </div>
  );
}
