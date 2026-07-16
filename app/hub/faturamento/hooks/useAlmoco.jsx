// src/hooks/useAlmoco.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { filterRowsByUnit } from '@/lib/units';

const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const Ctx = createContext(null);

export function AlmocoProvider({ children, allowedLojas = '*' }) {
  const [almoco, setAlmoco] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${URL}?tipo=almoco`)
      .then(r => r.json())
      .then(json => {
        // Mesma regra de acesso por unidade aplicada em rawData (useFilters) —
        // esse hook busca de um Apps Script separado, então precisa filtrar
        // aqui também, senão a seção de Almoço vaza dado de loja não permitida.
        if (json.almoco) setAlmoco(filterRowsByUnit(json.almoco, 'Loja', allowedLojas));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [allowedLojas]);

  // Busca registros de almoço para um período
  function getAlmoco(ano, mes) {
    return almoco.filter(r => r.Ano === ano && r.Mes === mes);
  }

  function getAlmocoLoja(ano, mes, loja) {
    return almoco.filter(r => r.Ano === ano && r.Mes === mes && r.Loja === loja);
  }

  return (
    <Ctx.Provider value={{ almoco, loading, getAlmoco, getAlmocoLoja }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAlmoco() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAlmoco fora do AlmocoProvider');
  return ctx;
}
