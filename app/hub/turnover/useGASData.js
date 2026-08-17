import { useState, useEffect } from 'react'

const GAS_URL = "https://script.google.com/macros/s/AKfycby-QXglHGObJS1_YVTonnY0rXkrzkMBQZhwOqBMm2dZ46i53vdJuX7zM1SiEijtQ2H9/exec"

export const UNIDADES = [
  'Carinas','Chácara','Holding','Lapa','Madalena',
  'Mariana','Pavão','Perdizes','Santana','Santo André','Tatuapé'
]

// Gera meses de Jan/26 até o mês atual — automaticamente
// Quando virar Jan/27, aparece sozinho. Nunca mais precisa mexer no código.
function gerarMeses() {
  const nomes  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const hoje   = new Date()
  const labels = []
  const apis   = []
  let ano = 2026, mes = 1
  while (ano < hoje.getFullYear() || (ano === hoje.getFullYear() && mes <= hoje.getMonth() + 1)) {
    labels.push(`${nomes[mes-1]}/${String(ano).slice(2)}`)
    apis.push(`${ano}-${String(mes).padStart(2,'0')}`)
    mes++
    if (mes > 12) { mes = 1; ano++ }
  }
  return { labels, apis }
}

const { labels: MESES, apis: MESES_API } = gerarMeses()
export { MESES, MESES_API }

export function useGASData(mesIdx, unidade) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro]       = useState(null)

  useEffect(() => {
    setLoading(true)
    setErro(null)
    const idx      = Math.min(Math.max(Number(mesIdx) || 0, 0), MESES_API.length - 1)
    const mes      = MESES_API[idx]
    const undParam = unidade && unidade !== 'Todas' ? `&unidade=${encodeURIComponent(unidade)}` : ''

    Promise.all([
      fetch(`${GAS_URL}?tipo=todos&mes=${mes}${undParam}`).then(r => r.json()),
      fetch(`${GAS_URL}?tipo=motivos_historico${undParam}`).then(r => r.json()),
    ])
      .then(([principal, historico]) => {
        if (principal.erro) throw new Error(principal.erro)
        setData({ ...principal, motivos_historico: Array.isArray(historico) ? historico : [] })
      })
      .catch(e => { console.error('GAS erro:', e); setErro(e.message) })
      .finally(() => setLoading(false))
  }, [mesIdx, unidade])

  return { data, loading, erro }
}

export const CFG_DEFAULT = {
  meta_turnover:           5.0,
  custo_contratacao:       2514.32,
  encargo_multiplicador:   1.6377,
  semaforo_verde_ambar:    5.0,
  semaforo_ambar_vermelho: 9.0,
}
