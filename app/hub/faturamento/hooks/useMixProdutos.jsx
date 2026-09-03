// src/hooks/useMixProdutos.jsx
import { createContext, useContext, useState, useEffect } from 'react';

const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const Ctx = createContext(null);

export function MixProdutosProvider({ children }) {
  const [mixProdutos, setMixProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${URL}?tipo=mixProdutos`)
      .then(r => r.json())
      .then(json => {
        if (json.mixProdutos) setMixProdutos(json.mixProdutos);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Ctx.Provider value={{ mixProdutos, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export function useMixProdutos() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMixProdutos fora do MixProdutosProvider');
  return ctx;
}
