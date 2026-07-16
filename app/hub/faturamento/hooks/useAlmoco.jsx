// src/hooks/useAlmoco.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { filterRowsByUnit, servesAlmoco } from '@/lib/units';

const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const Ctx = createContext(null);

export function AlmocoProvider({ children, allowedLojas = '*' }) {
  const [almoco, setAlmoco] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${URL}?tipo=almoco`)
      .then(r => r.json())
      .then(json => {
        if (json.almoco) {
          // Alguns lançamentos caem em "Almoço" só pelo horário do
          // registro (11h-15h), mesmo em lojas que não têm esse serviço
          // (ex: ajuste manual/atraso de fechamento em Santo André) — por
          // isso filtramos também pela lista real de lojas com almoço,
          // além da permissão por unidade do usuário logado.
          const comServico = json.almoco.filter(r => servesAlmoco(r.Loja));
          setAlmoco(filterRowsByUnit(comServico, 'Loja', allowedLojas));
        }
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
