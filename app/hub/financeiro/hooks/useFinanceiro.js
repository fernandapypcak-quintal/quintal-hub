import { useState, useEffect } from 'react'

export function useFinanceiro() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    setLoading(true)
    setErro(null)
    fetch('/api/financeiro')
      .then((r) => r.json())
      .then((json) => {
        if (json.erro) throw new Error(json.erro)
        setData(json)
      })
      .catch((e) => { console.error('Financeiro erro:', e); setErro(e.message) })
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, erro }
}
