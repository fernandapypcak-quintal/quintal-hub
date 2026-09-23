// src/hooks/useAreas.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { buscarTipo } from '../data/loader';

// Dados vêm via buscarTipo(): CSV publicado → Web App → cópia local.

const Ctx = createContext(null);

export function AreasProvider({ children }) {
  const [areas, setAreas] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarTipo('areas', 'areas')
      .then(({ json }) => {
        if (json.areas) {
          const map = {};
          json.areas.forEach(a => { map[a.Loja] = a.Area_m2; });
          setAreas(map);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Área em m² de uma loja, ou null se ainda não cadastrada (ex: Chácara).
  function getArea(loja) {
    return areas[loja] || null;
  }

  return (
    <Ctx.Provider value={{ areas, loading, getArea }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAreas() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAreas fora do AreasProvider');
  return ctx;
}
