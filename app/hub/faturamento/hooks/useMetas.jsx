// src/hooks/useMetas.jsx
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isUnitAllowed } from '@/lib/units';

const MetasContext   = createContext(null);
const STORAGE_KEY    = 'quintal_metas_v1';
const APPSCRIPT_URL  = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

function toKey(ano, mes) {
  return `${ano}-${String(mes).padStart(2, '0')}`;
}

// metas vem como { 'YYYY-MM': { LOJA: valor, ... } } — filtra as chaves
// de loja de cada mês pra só sobrar as unidades permitidas.
function filtraMetasPorUnidade(metas, allowedLojas) {
  if (allowedLojas === '*' || !metas) return metas;
  const out = {};
  for (const [anoMes, porLoja] of Object.entries(metas)) {
    out[anoMes] = {};
    for (const [loja, valor] of Object.entries(porLoja || {})) {
      if (isUnitAllowed(loja, allowedLojas)) out[anoMes][loja] = valor;
    }
  }
  return out;
}

export function MetasProvider({ children, allowedLojas = '*' }) {
  const [metas, setMetas]             = useState({});
  const [sheetsStatus, setSheetsStatus] = useState('idle'); // idle | loading | ok | error
  const [sheetsError, setSheetsError]   = useState('');

  // Carrega metas do AppScript ao iniciar
  useEffect(() => {
    fetchMetas();
  }, []);

  async function fetchMetas() {
    setSheetsStatus('loading');
    try {
      const res  = await fetch(`${APPSCRIPT_URL}?tipo=metas`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.erro) throw new Error(json.erro);
      if (!json.metas?.length) {
        // Sem metas ainda — carrega do localStorage como fallback
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setMetas(filtraMetasPorUnidade(JSON.parse(saved), allowedLojas));
        setSheetsStatus('idle');
        return;
      }
      // Converte array → { 'YYYY-MM': { LOJA: valor } }
      const parsed = {};
      json.metas.forEach(m => {
        const key = m.Ano_Mes || toKey(m.Ano, m.Mes);
        if (!parsed[key]) parsed[key] = {};
        parsed[key][m.Loja] = parseFloat(m.Meta) || 0;
      });
      // Guarda o cache local com tudo (útil pra quem tem acesso total),
      // mas o estado usado pelo dashboard só enxerga a(s) unidade(s)
      // permitida(s) do usuário logado.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      setMetas(filtraMetasPorUnidade(parsed, allowedLojas));
      setSheetsStatus('ok');
    } catch (e) {
      setSheetsError(e.message);
      setSheetsStatus('error');
      // Tenta carregar do cache local
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setMetas(filtraMetasPorUnidade(JSON.parse(saved), allowedLojas));
      } catch (_) {}
    }
  }

  const getMeta = useCallback((anoMes, loja) => {
    return metas[anoMes]?.[loja] ?? 0;
  }, [metas]);

  const getMetaTotal = useCallback((anoMes, lojas) => {
    return lojas.reduce((s, l) => s + (metas[anoMes]?.[l] ?? 0), 0);
  }, [metas]);

  // Salva metas localmente (edição manual no dashboard)
  const savePeriodMetas = useCallback((anoMes, valoresPorLoja) => {
    setMetas(prev => {
      const next = { ...prev, [anoMes]: { ...valoresPorLoja } };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const reloadFromSheets = useCallback(() => fetchMetas(), []);

  return (
    <MetasContext.Provider value={{
      metas, getMeta, getMetaTotal,
      savePeriodMetas, reloadFromSheets,
      sheetsStatus, sheetsError,
    }}>
      {children}
    </MetasContext.Provider>
  );
}

export function useMetas() {
  const ctx = useContext(MetasContext);
  if (!ctx) throw new Error('useMetas must be used within MetasProvider');
  return ctx;
}
