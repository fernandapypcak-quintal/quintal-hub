// src/hooks/useMixProdutos.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { buscarTipo } from '../data/loader';

// Dados vêm via buscarTipo(): CSV publicado → Web App → cópia local.

const Ctx = createContext(null);

export function MixProdutosProvider({ children }) {
  const [mixProdutos, setMixProdutos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    buscarTipo('mixProdutos', 'mixProdutos')
      .then(({ json }) => {
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
