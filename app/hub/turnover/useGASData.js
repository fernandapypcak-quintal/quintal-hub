import { useState, useEffect } from 'react'

const GAS_URL = "https://script.google.com/macros/s/AKfycby-QXglHGObJS1_YVTonnY0rXkrzkMBQZhwOqBMm2dZ46i53vdJuX7zM1SiEijtQ2H9/exec"

// Meses disponíveis — adicionar conforme a planilha for sendo alimentada
export const MESES     = ['Jan/26','Fev/26','Mar/26','Abr/26','Mai/26','Jun/26']
export const MESES_API = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06']

// Unidades alinhadas com a planilha 1_Ativos_TOTVS
// Santo André = Figueiras (mesma casa)
export const UNIDADES = [
  'Carinas','Chácara','Holding','Lapa','Madalena',
  'Mariana','Pavão','Perdizes','Santana','Santo André','Tatuapé'
]

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
  custo_demissao:          2724.00,
  semaforo_verde_ambar:    5.0,
  semaforo_ambar_vermelho: 9.0,
}

// Mantido por compatibilidade com PageCustos
export const CUSTO_IDEAL_KEY = {}
