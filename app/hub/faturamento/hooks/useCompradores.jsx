// src/hooks/useCompradores.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import { filterRowsByUnit } from '@/lib/units';

const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const Ctx = createContext(null);

export function CompradoresProvider({ children, allowedLojas = '*' }) {
  const [compradores, setCompradores] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${URL}?tipo=compradores`)
      .then(r => r.json())
      .then(json => {
        if (json.compradores) {
          setCompradores(filterRowsByUnit(json.compradores, 'Loja', allowedLojas));
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [allowedLojas]);

  // Pessoas (checkins distintos) num recorte — canal null = Salão+Delivery somados
  function getPessoas(ano, mes, canal, dia, loja) {
    let rows = compradores.filter(r => r.Ano === ano && r.Mes === mes);
    if (dia   != null) rows = rows.filter(r => r.Dia === dia);
    if (loja)          rows = rows.filter(r => r.Loja === loja);
    if (canal)         rows = rows.filter(r => r.Canal === canal);
    return rows.reduce((s, r) => s + (r.Pessoas || 0), 0);
  }

  // Ticket médio = faturamento ÷ pessoas, pro recorte pedido.
  // `faturamento` já vem calculado por quem chama (evita esse hook
  // precisar conhecer a estrutura de rawData de faturamento).
  function getTicketMedio(faturamento, ano, mes, canal, dia, loja) {
    const pessoas = getPessoas(ano, mes, canal, dia, loja);
    return pessoas > 0 ? faturamento / pessoas : null;
  }

  return (
    <Ctx.Provider value={{ compradores, loading, getPessoas, getTicketMedio }}>
      {children}
    </Ctx.Provider>
  );
}

export function useCompradores() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompradores fora do CompradoresProvider');
  return ctx;
}
