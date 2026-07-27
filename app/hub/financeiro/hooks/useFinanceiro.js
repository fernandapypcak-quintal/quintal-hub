import { useState, useEffect } from 'react'

export function useFinanceiro(dataSelecionada, enabled = true) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(enabled)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    if (!enabled) {
      setLoading(false)
      return
    }
    setLoading(true)
    setErro(null)
    const query = dataSelecionada ? `?data=${encodeURIComponent(dataSelecionada)}` : ''
    fetch(`/api/financeiro${query}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.erro) throw new Error(json.erro)
        setData(json)
      })
      .catch((e) => { console.error('Financeiro erro:', e); setErro(e.message) })
      .finally(() => setLoading(false))
  }, [dataSelecionada, enabled])

  return { data, loading, erro }
}
