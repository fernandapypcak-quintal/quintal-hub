// src/hooks/useFilters.jsx
import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { loadData } from '../data/loader';
import { filterRowsByUnit, allowedNativeLabels } from '@/lib/units';

const Ctx = createContext(null);

const MESES = [
  {num:1,nome:'Jan'},{num:2,nome:'Fev'},{num:3,nome:'Mar'},{num:4,nome:'Abr'},
  {num:5,nome:'Mai'},{num:6,nome:'Jun'},{num:7,nome:'Jul'},{num:8,nome:'Ago'},
  {num:9,nome:'Set'},{num:10,nome:'Out'},{num:11,nome:'Nov'},{num:12,nome:'Dez'},
];

function defaultFilters(allowedLojas = '*') {
  const now = new Date();
  // Quem tem acesso a todas as unidades abre com o filtro de loja vazio
  // ("Todas"). Quem tem acesso restrito já abre com a(s) própria(s)
  // unidade(s) marcada(s) — em vez de aparecer "Todos" marcado, que
  // confunde mesmo não vazando dado nenhum (o rawData já vem restrito).
  const lojasPermitidas = allowedNativeLabels(allowedLojas, 'zigLabel');
  return {
    lojas: allowedLojas === '*' ? new Set() : new Set(lojasPermitidas),
    meses: new Set([now.getMonth()+1]),  // mês atual
    canal: 'Todos',
    ano:   String(now.getFullYear()),    // ano atual
  };
}

export function FilterProvider({ children, allowedLojas = '*' }) {
  const [modoAoVivo, setModoAoVivo] = useState(false);
  const [reloadKey, setReloadKey]   = useState(0);

  function toggleModoAoVivo() {
    setModoAoVivo(v => !v);
    setReloadKey(k => k + 1); // força reload dos dados
  }
  const [rawDataFull, setRawDataFull] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filters, setFilters] = useState(defaultFilters(allowedLojas));

  useEffect(() => {
    loadData(modoAoVivo)
      .then(d => { setRawDataFull(d); setLoading(false); })
      .catch(e => { setError(e);  setLoading(false); });
  }, [reloadKey, modoAoVivo]);

  // Restringe à(s) unidade(s) permitida(s) do usuário logado — feito uma
  // vez aqui, então toda página que consome rawData/meta já está segura.
  const rawData = useMemo(
    () => filterRowsByUnit(rawDataFull, 'Loja', allowedLojas),
    [rawDataFull, allowedLojas]
  );

  const meta = useMemo(() => ({
    lojas: [...new Set(rawData.map(r => r.Loja))].sort(),
    anos:  [...new Set(rawData.map(r => r.Ano))].sort((a,b) => b-a),
    meses: MESES,
  }), [rawData]);

  const filteredData = useMemo(() => {
    const { lojas, meses, canal, ano } = filters;
    return rawData.filter(r => {
      if (lojas.size > 0 && !lojas.has(r.Loja))        return false;
      if (meses.size > 0 && !meses.has(r.Mes))          return false;
      if (canal !== 'Todos' && r.Canal !== canal)        return false;
      if (ano   !== 'Todos' && r.Ano   !== Number(ano))  return false;
      return true;
    });
  }, [rawData, filters]);

  const updateFilter = (key, val) => setFilters(p => ({...p, [key]: val}));
  const resetFilters = () => setFilters(defaultFilters(allowedLojas));

  // Quem tem acesso restrito já abre com a própria unidade marcada — isso
  // não deve contar como "filtro ativo" (não é algo que a pessoa escolheu).
  const lojasSaoPadrao = allowedLojas === '*'
    ? filters.lojas.size === 0
    : filters.lojas.size === (allowedNativeLabels(allowedLojas, 'zigLabel')?.length ?? 0)
        && [...filters.lojas].every(l => (allowedNativeLabels(allowedLojas, 'zigLabel') || []).includes(l));

  const hasActiveFilters =
    !lojasSaoPadrao || filters.meses.size > 0 ||
    filters.canal !== 'Todos' || filters.ano !== 'Todos';

  return (
    <Ctx.Provider value={{ rawData, filteredData, filters, meta,
      updateFilter, resetFilters, hasActiveFilters,
      loading, error,
      allowedLojas,
      modoAoVivo, toggleModoAoVivo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useFilters fora do FilterProvider');
  return ctx;
}
