import { useState, useEffect } from 'react'

const GAS_URL = "https://script.google.com/macros/s/AKfycby-QXglHGObJS1_YVTonnY0rXkrzkMBQZhwOqBMm2dZ46i53vdJuX7zM1SiEijtQ2H9/exec"

export const MESES     = ['Jan/26','Fev/26','Mar/26','Abr/26','Mai/26','Jun/26']
export const MESES_API = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06']

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
    const idx    = Math.min(Math.max(Number(mesIdx) || 0, 0), MESES_API.length - 1)
    const mes    = MESES_API[idx]
    const undParam = unidade && unidade !== 'Todas' ? `&unidade=${encodeURIComponent(unidade)}` : ''

    Promise.all([
      fetch(`${GAS_URL}?tipo=todos&mes=${mes}${undParam}`).then(r => r.json()),
      fetch(`${GAS_URL}?tipo=motivos_historico${undParam}`).then(r => r.json()),
    ])
      .then(([principal, historico]) => {
        if (principal.erro) throw new Error(principal.erro)
        setData({ ...principal, motivos_historico: historico })
      })
      .catch(e => { console.error('GAS erro:', e); setErro(e.message) })
      .finally(() => setLoading(false))

  }, [mesIdx, unidade])

  return { data, loading, erro }
}

export const CFG_DEFAULT = {
  meta_turnover:           5.0,
  custo_contratacao:       2514.32,
  custo_demissao:          2724.0,
  folha_mensal:            1800000,
  custo_turnover_ano:      1185202,
  admissoes_ano_ref:       193,
  desligamentos_ano_ref:   257,
  comp_salario_base:       52,
  comp_encargos:           21,
  comp_beneficios:         12,
  comp_provisoes:          15,
  semaforo_verde_ambar:    5.0,
  semaforo_ambar_vermelho: 9.0,
  custo_ideal_carinas:     237984,
  custo_ideal_chacara:     82875,
  custo_ideal_figueiras:   227518,
  custo_ideal_lapa:        95360,
  custo_ideal_madalena:    103279,
  custo_ideal_mariana:     95461,
  custo_ideal_pavao:       69717,
  custo_ideal_perdizes:    85281,
  custo_ideal_santana:     218559,
  custo_ideal_tatuape:     249294,
  custo_ideal_holding:     201220,
  custo_ideal_santoandre:  100000,
}

export const CUSTO_IDEAL_KEY = {
  'Carinas':    'custo_ideal_carinas',
  'Chácara':    'custo_ideal_chacara',

  'Lapa':       'custo_ideal_lapa',
  'Madalena':   'custo_ideal_madalena',
  'Mariana':    'custo_ideal_mariana',
  'Pavão':      'custo_ideal_pavao',
  'Perdizes':   'custo_ideal_perdizes',
  'Santana':    'custo_ideal_santana',
  'Tatuapé':    'custo_ideal_tatuape',
  'Holding':    'custo_ideal_holding',
  'Santo André':'custo_ideal_santoandre',
}
