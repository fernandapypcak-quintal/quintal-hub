import { APPS_SCRIPT_URL } from './config.js'
import { unitIdFromString, labelForUnit } from '@/lib/units'

async function fetchObjeto(tipo) {
  const url = `${APPS_SCRIPT_URL}?tipo=${tipo}`
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 50000)
  try {
    const res = await fetch(url, { method: 'GET', signal: controller.signal, redirect: 'follow' })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    if (data && data.erro) { console.warn(`[kids loader] ${tipo}:`, data.erro); return null }
    return data
  } catch (e) {
    clearTimeout(timer)
    console.error(`[kids loader] fetchObjeto(${tipo}) falhou:`, e.message)
    return null
  }
}

const num = (v) => Number(v || 0)

// Cada fonte de dados grava a unidade de um jeito diferente ("CARINAS" sem
// acento vindo do ZIG, "Carinás" vindo da planilha de Shows/Infláveis,
// "santo_andre" com underscore vindo do cadastro de crianças...). Aqui a
// gente normaliza tudo pro label oficial de lib/units.ts, senão o filtro
// de unidade do dashboard mostra a mesma casa duplicada várias vezes.
function canonicalizarUnidade(raw) {
  const id = unitIdFromString(raw)
  return id ? labelForUnit(id) : (raw || '')
}

// A planilha de crianças usa a chave da unidade (ex: "santo_andre"), sem
// espaço/acento — precisa virar o label "de verdade" (ex: "Santo André")
// pra bater com os aliases de lib/units.ts na hora de filtrar por unidade.
const CRIANCAS_KEY_TO_LABEL = {
  carinas: 'Carinás',
  chacara: 'Chácara',
  lapa: 'Lapa',
  pavao: 'Pavão',
  perdizes: 'Perdizes',
  santana: 'Santana',
  santo_andre: 'Santo André',
  tatuape: 'Tatuapé',
  vila_madalena: 'Vila Madalena',
  vila_mariana: 'Vila Mariana',
}

const parseShows = rows => rows.map(r => ({
  unidade: canonicalizarUnidade(r.unidade),
  data: r.data || '',
  diaSemana: r.dia_semana || '',
  empresa: r.empresa || '',
  tema: r.tema || '',
  artista: r.artista || '',
  horaInicio: r.hora_inicio || '',
  horaTermino: r.hora_termino || '',
  valor: num(r.valor_diaria),
  mesAba: r.mes_aba || '',
}))

const parseCriancas = rows => rows.map(r => ({
  unidade: canonicalizarUnidade(CRIANCAS_KEY_TO_LABEL[r.unidade] || r.unidade),
  data: r.data || '',
  hora: r.hora || '',
  qtdCriancas: num(r.qtd_criancas_na_submissao),
  timestampIso: r.timestamp_iso || '',
}))

const parseInflaveis = rows => rows.map(r => ({
  unidade: canonicalizarUnidade(r.unidade),
  data: r.data || '',
  diaSemana: r.dia_semana || '',
  tamanho: r.tamanho || '',
  cobradoDosPais: r.cobrado_dos_pais || '',
  corPulseira: r.cor_pulseira || '',
  motivoContratacao: r.motivo_contratacao || '',
  comMonitor: r.com_monitor || '',
  valor: num(r.valor_diaria),
  mesAba: r.mes_aba || '',
  obs: r.obs || '',
}))

const parseCombo = rows => rows.map(r => ({
  data: r.data || '',
  unidade: canonicalizarUnidade(r.unidade),
  canal: r.canal || '',
  qtdVendida: num(r.qtd_vendida),
  valor: num(r.valor_total),
}))

const parseFaturamentoDomShow = rows => rows.map(r => ({
  data: r.data || '',
  unidade: canonicalizarUnidade(r.unidade),
  canal: r.canal || '',
  valor: num(r.valor_faturamento_12h_14h),
}))

export async function loadTudo() {
  const raw = await fetchObjeto('tudo')

  if (!raw) {
    return {
      shows: [], criancas: [], inflaveis: [], combo: [], faturamentoDomShow: [],
    }
  }

  return {
    shows: parseShows(raw.shows || []),
    criancas: parseCriancas(raw.criancas || []),
    inflaveis: parseInflaveis(raw.inflaveis || []),
    combo: parseCombo(raw.combo || []),
    faturamentoDomShow: parseFaturamentoDomShow(raw.faturamentoDomShow || []),
  }
}
