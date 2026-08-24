// src/hooks/useAreas.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const Ctx = createContext(null);

export function AreasProvider({ children }) {
  const [areas, setAreas] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${URL}?tipo=areas`)
      .then(r => r.json())
      .then(json => {
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
