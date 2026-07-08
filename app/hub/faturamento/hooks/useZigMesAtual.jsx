// useZigMesAtual.jsx
// Busca dados do mês atual via rota server-side /api/zig
// Evita CORS e erros 500 ao chamar a ZIG direto do browser

import { useState, useEffect } from 'react';

export function useZigMesAtual() {
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [erro,    setErro]    = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function buscar() {
      setLoading(true); setErro(null);
      try {
        const r = await fetch('/api/zig');
        if (!r.ok) throw new Error(`Erro ${r.status} ao buscar dados ZIG`);
        const json = await r.json();
        if (json.erro) throw new Error(json.erro);
        if (!cancelled) {
          setDados(json.rows || []);
          console.log(`[ZIG direto] ${json.total} registros carregados para o mês atual`);
        }
      } catch (e) {
        if (!cancelled) {
          setErro(e.message);
          console.error('[ZIG direto] Erro:', e.message);
          setDados([]); // fallback vazio — planilha continua funcionando
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    buscar();
    return () => { cancelled = true; };
  }, []);

  return { dados, loading, erro };
}
