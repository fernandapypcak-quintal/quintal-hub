import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { loadCMVData } from '../data/loader';
import { META_CMV, LOJAS_GRANDES, LOJAS_MENORES } from '../data/config';
import { filterRowsByUnit } from '@/lib/units';

const Ctx = createContext(null);

const MESES_ORDER = ['janeiro','fevereiro','março','abril','maio','junho',
                     'julho','agosto','setembro','outubro','novembro','dezembro'];

function avg(arr) { return arr.length ? arr.reduce((s,v) => s+v, 0) / arr.length : 0; }

export function CMVProvider({ children, allowedLojas = '*' }) {
  const [fichas,      setFichas]      = useState([]);
  const [desperdicio, setDesperdicio] = useState([]);
  const [vendas,      setVendas]      = useState([]);
  const [parametros,  setParametros]  = useState({ taxa_ifood: 24.8, embalagem_padrao: 3.0 });
  const [history,     setHistory]     = useState([]);
  const [historico,   setHistorico]   = useState([]);
  const [histIng,     setHistIng]     = useState([]);
  const [bonificacoes, setBonificacoes] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);

  // Filtros globais
  const [filtroLoja,     setFiltroLoja]     = useState('Todas');
  const [filtroPeriodo,  setFiltroPeriodo]  = useState('Todos');
  const [filtroCat,      setFiltroCat]      = useState('Todas');
  const [filtroMes,      setFiltroMes]      = useState('Todos');
  const [filtroSemana,      setFiltroSemana]      = useState('atual');
  const [filtroCatContabil, setFiltroCatContabil] = useState('Todas');

  useEffect(() => {
    loadCMVData()
      .then(({ fichas, desperdicio, vendas, parametros, history, historico, historicoIngredientes, bonificacoes }) => {
        // "fichas" (fichas técnicas) e "historico"/"historicoIngredientes"
        // são dados de produto, compartilhados pela rede toda — não têm
        // recorte por loja. "vendas" e "desperdicio" são por unidade, e é
        // aí que a permissão precisa ser aplicada antes de guardar no estado.
        const desperdicioF = filterRowsByUnit(desperdicio || [], 'unidade', allowedLojas);
        const vendasF      = filterRowsByUnit(vendas || [], 'loja', allowedLojas);

        setFichas(fichas || []);
        setDesperdicio(desperdicioF);
        setVendas(vendasF);
        setParametros(parametros || { taxa_ifood: 24.8, embalagem_padrao: 3.0 });
        setHistory(history || []);
        setHistorico(historico || []);
        setHistIng(historicoIngredientes || []);
        setBonificacoes(bonificacoes || []);
        setLoading(false);

        // Se o usuário só tem acesso a 1 unidade, já abre filtrado nela
        const unicas = new Set([
          ...desperdicioF.map(r => r.unidade).filter(Boolean),
          ...vendasF.map(r => r.loja).filter(Boolean),
        ]);
        if (allowedLojas !== '*' && unicas.size === 1) {
          setFiltroLoja([...unicas][0]);
        }
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  // ── Produtos únicos (agrupa fichas por codPa) ─────────────
  const produtosUnicos = useMemo(() => {
    const map = new Map();
    fichas.forEach(r => {
      const key = r.codPa;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          codPa:        r.codPa,
          skuZig:       r.skuZig,
          nomePa:       r.nomePa,
          categoria:    r.categoria,
          subcategoria: r.subcategoria,
          cardapio:     r.cardapio || 'Sim',
          catContabil:  r.catContabil || '',
          precoVenda:   r.precoVenda,
          custoIngr:    0,
          cmvPct:       0,
          margemContribR:   0,
          margemContribPct: 0,
          precoSugerido:    0,
          ingredientes: [],
        });
      }
      map.get(key).ingredientes.push({
        codComponente:  r.codComponente,
        descComponente: r.descComponente,
        qtd:            r.qtd,
        und:            r.und,
        custoUnit:      r.custoUnit,
        custoIngr:      r.custoIngr,
      });
    });

    // Calcula custo total e CMV após agrupar
    map.forEach(p => {
      p.custoIngr = p.ingredientes.reduce((s, ing) => s + (ing.custoIngr || 0), 0);
      if (p.precoVenda > 0) {
        p.cmvPct           = p.custoIngr / p.precoVenda;
        p.margemContribR   = p.precoVenda - p.custoIngr;
        p.margemContribPct = (p.precoVenda - p.custoIngr) / p.precoVenda;
        p.precoSugerido    = p.custoIngr > 0 ? p.custoIngr / 0.30 : p.precoVenda;
      }
    });

    // Debug
    const comPrecoDebug = [...map.values()].filter(p => p.precoVenda > 0 && p.cardapio === 'Sim');
    const zeroCusto = [...map.values()].filter(p => p.precoVenda > 0 && p.custoIngr === 0);
    if (zeroCusto.length > 0) console.log('[CMV] Produtos com custo zero:', zeroCusto.length, '| Exemplo:', zeroCusto[0]?.nomePa, '| custoIngr:', zeroCusto[0]?.custoIngr);
    const somaCustos = comPrecoDebug.reduce((s,p) => s + p.custoIngr, 0);
    const somaPrecos = comPrecoDebug.reduce((s,p) => s + p.precoVenda, 0);
    console.log(`[CMV] ${map.size} produtos | CMV ponderado: ${(somaCustos/somaPrecos*100).toFixed(1)}% | ${comPrecoDebug.length} no cardápio`);

    return [...map.values()];
  }, [fichas]);

  // ── Filtros ───────────────────────────────────────────────
  const produtosFiltrados = useMemo(() =>
    produtosUnicos.filter(r =>
      (filtroCat === 'Todas' || (Array.isArray(filtroCat) ? filtroCat.includes(r.categoria) : r.categoria === filtroCat)) &&
      (filtroCatContabil === 'Todas' || r.catContabil === filtroCatContabil)
    ),
  [produtosUnicos, filtroCat, filtroCatContabil]);

  // Semanas disponíveis nos dados — usa a mais recente como "atual"
  const semanasOrdenadas = useMemo(() => {
    return [...new Set(vendas.map(r => r.semanaISO || '').filter(Boolean))].sort();
  }, [vendas]);

  const semanaAtualISO    = semanasOrdenadas[semanasOrdenadas.length - 1] || '';
  const semanaAnteriorISO = semanasOrdenadas[semanasOrdenadas.length - 2] || semanaAtualISO;

  const vendasFiltradas = useMemo(() => {
    return vendas.filter(r => {
      if (filtroLoja    !== 'Todas' && r.loja    !== filtroLoja)    return false;
      if (filtroPeriodo !== 'Todos' && r.periodo !== filtroPeriodo) return false;
      if (filtroSemana === 'atual')    return r.semanaISO === semanaAtualISO;
      if (filtroSemana === 'anterior') return r.semanaISO === semanaAnteriorISO;
      if (filtroSemana && filtroSemana !== 'atual' && filtroSemana !== 'anterior') {
        return r.semanaISO === filtroSemana;
      }
      return true;
    });
  }, [vendas, filtroLoja, filtroPeriodo, filtroSemana, semanaAtualISO, semanaAnteriorISO]);

  const desperdicioFiltrado = useMemo(() =>
    desperdicio.filter(r =>
      r.unidade &&
      (filtroLoja === 'Todas' || r.unidade === filtroLoja) &&
      (filtroMes  === 'Todos' || r.mes === filtroMes)
    ),
  [desperdicio, filtroLoja, filtroMes]);

  // ── Opções de filtro ───────────────────────────────────────
  const opcoesLojas = useMemo(() => {
    const dLojas = desperdicio.map(r => r.unidade).filter(Boolean);
    const vLojas = vendas.map(r => r.loja).filter(Boolean);
    const lojas  = [...new Set([...dLojas, ...vLojas])].sort();
    return ['Todas', ...lojas];
  }, [desperdicio, vendas]);

  const opcoesCatContabil = useMemo(() => {
    const cats = [...new Set(produtosUnicos.map(r => r.catContabil).filter(Boolean))].sort();
    return ['Todas', ...cats];
  }, [produtosUnicos]);

  const opcoesCats = useMemo(() => {
    const cats = [...new Set(produtosUnicos.map(r => r.categoria).filter(Boolean))].sort();
    return ['Todas', ...cats];
  }, [produtosUnicos]);

  const opcoesMeses = useMemo(() => {
    const ms = [...new Set(desperdicio.map(r => r.mes).filter(Boolean))];
    return ['Todos', ...ms.sort((a,b) => MESES_ORDER.indexOf(a) - MESES_ORDER.indexOf(b))];
  }, [desperdicio]);

  const semanasDisponiveis = useMemo(() => {
    const sems = [...new Set(vendas.map(r => r.semanaISO || '').filter(Boolean))].sort().reverse();
    return sems;
  }, [vendas]);

  // ── Bonificações filtradas por semana ──────────────────────
  const bonificacoesFiltradas = useMemo(() => {
    // Semanas de bonificação disponíveis
    const semsB = [...new Set(bonificacoes.map(b => b.semanaISO).filter(Boolean))].sort();
    const semBAtual = semsB[semsB.length - 1] || '';
    const semBAnt   = semsB[semsB.length - 2] || semBAtual;
    const semTarget = filtroSemana === 'anterior' ? semBAnt
      : filtroSemana !== 'atual' && filtroSemana ? filtroSemana
      : semBAtual;
    return bonificacoes.filter(b =>
      (!semTarget || b.semanaISO === semTarget) &&
      (filtroCatContabil === 'Todas' || b.catContabil === filtroCatContabil)
    );
  }, [bonificacoes, filtroSemana, filtroCatContabil]);

  const totalBonificacoes = useMemo(() =>
    bonificacoesFiltradas.reduce((s, b) => s + b.valor, 0),
  [bonificacoesFiltradas]);

  const bonifPorConta = useMemo(() => {
    const map = {};
    bonificacoesFiltradas.forEach(b => {
      const k = b.catContabil || 'Outros';
      map[k] = (map[k] || 0) + b.valor;
    });
    return Object.entries(map).map(([cat, val]) => ({ cat, val }))
      .sort((a,b) => b.val - a.val);
  }, [bonificacoesFiltradas]);

  // ── KPIs ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    // CMV médio teórico — média simples dos CMVs individuais
    const comPreco = produtosFiltrados.filter(r => r.precoVenda > 0);
    const cmvAtual = avg(comPreco.map(r => r.cmvPct));
    const margem   = avg(comPreco.map(r => r.margemContribPct));
    const criticos   = comPreco.filter(r => r.cmvPct >= 0.80).length;
    const atencao    = comPreco.filter(r => r.cmvPct >= 0.35 && r.cmvPct < 0.80).length;
    const okCount    = comPreco.filter(r => r.cmvPct < 0.35).length;
    const totalDesp  = desperdicioFiltrado.reduce((s, r) => s + r.custoTotal, 0);
    const maiorDesp  = [...new Set(desperdicioFiltrado.map(r => r.unidade))]
      .map(u => ({ u, v: desperdicioFiltrado.filter(r=>r.unidade===u).reduce((s,r)=>s+r.custoTotal,0) }))
      .sort((a,b) => b.v-a.v)[0];

    // CMV ajustado com bonificação
    const totalCusto = comPreco.reduce((s,r) => s + r.custoIngr, 0);
    const totalPreco = comPreco.reduce((s,r) => s + r.precoVenda, 0);
    const cmvAjustado = totalPreco > 0
      ? Math.max(0, (totalCusto - totalBonificacoes) / totalPreco)
      : cmvAtual;

    return {
      cmvAtual: cmvAtual || 0, cmvAjustado: cmvAjustado || 0, cmvAnt: cmvAtual || 0, deltaCMV: 0,
      margem, criticos, atencao, okCount,
      totalDesperdicio: totalDesp,
      maiorDesperdicio: maiorDesp?.u || '—',
    };
  }, [produtosFiltrados, desperdicioFiltrado]);

  // ── Evolução CMV (do histórico da planilha) ─────────────────
  const evolucaoCMV = useMemo(() => {
    if (!historico.length) return [];
    // Agrupa por data
    const porData = {};
    historico.filter(r => r.cardapio === 'Sim' && r.precoVenda > 0).forEach(r => {
      if (!porData[r.data]) porData[r.data] = { custos: 0, precos: 0 };
      porData[r.data].custos += r.custoIngr;
      porData[r.data].precos += r.precoVenda;
    });
    return Object.entries(porData)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([data, v]) => ({
        semana: data.slice(5), // MM-DD
        cmv: v.precos > 0 ? v.custos / v.precos : 0,
        ts: data,
      }));
  }, [historico]);

  // ── Volume por produto (cruza vendas × fichas) ────────────
  const volumePorProduto = useMemo(() => {
    const vendaMap = {};
    vendasFiltradas.forEach(v => {
      const sku = String(v.productSku || '').replace(/^0+/, '') || v.productSku;
      if (!sku) return;
      if (!vendaMap[sku]) vendaMap[sku] = { qtd: 0, receita: 0 };
      vendaMap[sku].qtd     += v.count || 0;
      vendaMap[sku].receita += Math.max(0, (v.unitValue||0) - (v.discountValue||0)) * (v.count||0);
    });
    console.log(`[Volume] SKUs com venda: ${Object.keys(vendaMap).length} | Total itens: ${Object.values(vendaMap).reduce((s,v)=>s+v.qtd,0)}`);

    // Mapa de bonificação por nome de produto
    const bonifMap = {};
    bonificacoesFiltradas.forEach(b => {
      if (!b.produto) return;
      const k = b.produto.trim().toLowerCase();
      bonifMap[k] = (bonifMap[k] || 0) + b.valor;
    });

    return produtosFiltrados.map(p => {
      const skuNorm     = String(p.skuZig || '').replace(/^0+/, '') || p.skuZig;
      const venda      = vendaMap[skuNorm] || vendaMap[p.skuZig] || { qtd: 0, receita: 0 };
      const custoTotal = venda.qtd * p.custoIngr;
      const receitaReal = venda.receita;
      const cmvReal    = receitaReal > 0 ? custoTotal / receitaReal : p.cmvPct;
      // Bonificação por produto (match por nome)
      const bonif = bonifMap[p.nomePa?.trim().toLowerCase()] || 0;
      const custoAjustado = Math.max(0, custoTotal - bonif);
      const cmvAjustado   = receitaReal > 0 ? custoAjustado / receitaReal : cmvReal;
      return {
        ...p,
        cmvTeorico:  p.cmvPct,
        qtdVendida:  venda.qtd,
        receitaReal,
        custoTotal,
        cmvReal,
        bonif,
        custoAjustado,
        cmvAjustado,
        margem:      receitaReal > 0 ? (receitaReal - custoTotal) / receitaReal : p.margemContribPct,
        margemAjustada: receitaReal > 0 ? (receitaReal - custoAjustado) / receitaReal : p.margemContribPct,
        temVenda:    venda.qtd > 0,
      };
    }).sort((a, b) => b.custoTotal - a.custoTotal);
  }, [produtosFiltrados, vendasFiltradas]);

  // ── Desperdício por unidade e classificação ───────────────
  const desperdicioByUnidade = useMemo(() => {
    const map = {};
    desperdicioFiltrado.forEach(r => {
      if (!map[r.unidade]) map[r.unidade] = { unidade: r.unidade, total: 0, registros: 0 };
      map[r.unidade].total     += r.custoTotal;
      map[r.unidade].registros += 1;
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [desperdicioFiltrado]);

  const desperdicioByClassificacao = useMemo(() => {
    const map = {};
    desperdicio.forEach(r => {
      const k = r.classificacao || 'Sem classificação';
      if (!map[k]) map[k] = { classificacao: k, total: 0 };
      map[k].total += r.custoTotal;
    });
    return Object.values(map).sort((a,b) => b.total - a.total);
  }, [desperdicio]);

  // ── CMV por conta contábil ────────────────────────────────────
  const cmvPorContabil = useMemo(() => {
    const map = {};
    produtosFiltrados.filter(r => r.precoVenda > 0 && r.catContabil).forEach(r => {
      if (!map[r.catContabil]) map[r.catContabil] = { catContabil: r.catContabil, custos: 0, precos: 0, produtos: 0 };
      map[r.catContabil].custos   += r.custoIngr;
      map[r.catContabil].precos   += r.precoVenda;
      map[r.catContabil].produtos += 1;
    });
    return Object.values(map).map(r => ({
      catContabil: r.catContabil,
      cmvMedio:    r.precos > 0 ? r.custos / r.precos : 0,
      produtos:    r.produtos,
    })).sort((a,b) => b.cmvMedio - a.cmvMedio);
  }, [produtosFiltrados]);

  // ── Margem por categoria ───────────────────────────────────
  const margemPorCategoria = useMemo(() => {
    const map = {};
    produtosFiltrados.filter(r => r.precoVenda > 0).forEach(r => {
      if (!map[r.categoria]) map[r.categoria] = { categoria: r.categoria, cmvs: [], margens: [], criticos: 0 };
      map[r.categoria].cmvs.push(r.cmvPct);
      map[r.categoria].margens.push(r.margemContribPct);
      if (r.cmvPct >= 0.80) map[r.categoria].criticos++;
    });
    return Object.values(map).map(r => ({
      categoria:   r.categoria,
      cmvMedio:    avg(r.cmvs),
      margemMedia: avg(r.margens),
      criticos:    r.criticos,
    })).sort((a,b) => b.cmvMedio - a.cmvMedio);
  }, [produtosFiltrados]);

  return (
    <Ctx.Provider value={{
      loading, error,
      // Dados
      produtos: produtosFiltrados,
      desperdicio: desperdicioFiltrado,
      desperdicioRaw: desperdicio,
      vendas: vendasFiltradas,
      history,
      historico,
      histIng,
      bonificacoes: bonificacoesFiltradas,
      totalBonificacoes,
      bonifPorConta,
      parametros,
      // Derivados
      kpis, evolucaoCMV, volumePorProduto,
      desperdicioByUnidade, desperdicioByClassificacao,
      margemPorCategoria,
      cmvPorContabil,
      histComp: [], histProd: [],  // mantidos para compatibilidade
      // Filtros
      opcoesLojas, opcoesCats, opcoesMeses, semanasDisponiveis, opcoesCatContabil,
      filtroLoja,    setFiltroLoja,
      filtroPeriodo, setFiltroPeriodo,
      filtroCat,     setFiltroCat,
      filtroMes,     setFiltroMes,
      filtroSemana,  setFiltroSemana,
      filtroCatContabil, setFiltroCatContabil,
      filtroCanal: 'CASA', setFiltroCanal: () => {},
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCMV() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCMV fora do CMVProvider');
  return ctx;
}
