'use client'

import { useState, useEffect } from 'react'

const GAS_URL = '/api/pipedrive'

export type Sumario = {
  total: number; won: number; open: number; lost: number
  receitaTotal: number; ticketMedio: number; ticketPorPax: number
  paxTotal: number; mediaPaxPorEvento: number
  taxaConversao: number; cicloMedio: number
  futuros: number; proximoEvento: Deal | null
  funil: Record<string, number>
  funilConversao: Record<string, number>
  funilVendedor: Record<string, { total: number; won: number; open: number; lost: number; receita: number }>
  pacotes: Record<string, number>
  serieConversao: { mes: string; won: number; total: number; taxa: number }[]
}

export type Comparativo = {
  atual: SumarioSimples; anoAnterior: SumarioSimples; mesAnterior: SumarioSimples | null
}

export type SumarioSimples = {
  total: number; won: number; open: number; lost: number
  receita: number; ticketMedio: number; ticketPorPax: number; taxa: number
}

export type Deal = {
  id: number; titulo: string; empresa: string; contato: string
  email_contato: string; telefone_contato: string
  razao_social: string; cnpj_cpf: string
  status: 'open' | 'won' | 'lost'; stage_id: string; stage_nome: string
  valor: number; moeda: string
  data_evento: string; qtd_pessoas: number
  unidade_id: string; unidade_nome: string
  cardapio_id: string; cardapio_nome: string
  tipo_evento: string; local_evento: string
  horario_inicio: string; horario_fim: string
  responsavel_evento: string; telefone_responsavel: string
  forma_pgto_id: string; forma_pgto_nome: string
  status_contrato: string; conferido: string; info_extras: string
  vendedor: string; email_vendedor: string
  add_time: string; update_time: string; won_time: string
  lost_time: string; close_time: string; motivo_perda: string; sync_time: string
  won_time_efetivo?: string; teve_aditivo?: string; data_fechamento_original?: string
  data_aditivo?: string; valor_aditivo?: number | string
}

export type Filtros = {
  status: '' | 'open' | 'won' | 'lost'
  unidade: string; ano: string; mes: string; vendedor: string
}

export type LojaSumario = {
  total: number; won: number; open: number; lost: number
  receita: number; pax: number; pacotes: Record<string, number>
}

function buildParams(extra: Record<string, string>, filtros: Partial<Filtros>) {
  const p = new URLSearchParams(extra)
  if (filtros.status)   p.set('status',   filtros.status)
  if (filtros.unidade)  p.set('unidade',  filtros.unidade)
  if (filtros.ano)      p.set('ano',      filtros.ano)
  if (filtros.mes)      p.set('mes',      filtros.mes)
  if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
  return p.toString()
}

export function useSumario(filtros: Filtros) {
  const [sumario, setSumario] = useState<Sumario | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null); setSumario(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'sumario' }, filtros)}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setSumario(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.unidade, filtros.ano, filtros.mes, filtros.vendedor])

  return { sumario, loading, erro }
}

export function useComparativo(filtros: Filtros) {
  const [data, setData] = useState<Comparativo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true); setData(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'sumario_comparativo' }, filtros)}`)
      .then(r => r.json())
      .then(d => { if (!d.erro) setData(d) })
      .catch(() => {})
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.ano, filtros.mes, filtros.unidade, filtros.vendedor])

  return { comparativo: data, loadingComp: loading }
}

export function useDeals(filtros: Filtros, page = 1) {
  const [deals, setDeals] = useState<Deal[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'deals', page: String(page), limit: '500' }, filtros)}`)
      .then(r => r.json())
      .then(data => {
        if (data.erro) throw new Error(data.erro)
        setDeals(data.deals || []); setTotal(data.total || 0); setPages(data.pages || 1)
      })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.status, filtros.unidade, filtros.ano, filtros.mes, filtros.vendedor, page])

  return { deals, total, pages, loading, erro }
}

export function useLeadsDiarios(filtros: Filtros, dataInicio: string, dataFim: string) {
  const [leads, setLeads] = useState<Deal[]>([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    if (!dataInicio || !dataFim) return
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'leads', dataInicio, dataFim, limit: '1000' })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setLeads(data.deals || []) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, dataInicio, dataFim])

  return { leads, loading, erro }
}

export type PeriodoMes = {
  mes: string; leads: number; won: number; taxaConversao: number
  receitaFechamento: number; receitaCompetencia: number
  pax: number; ticketMedio: number; ticketMedioPax: number; ticketMedioCompetencia: number
}
export type SerieFaturamento = PeriodoMes & { periodo: string; label: string }
export type AnoCompleto = { ano: number; meses: (PeriodoMes & { mes: number; label: string })[] }
export type Meta = {
  mes: string; faixa1: number; faixa2: number; faixa3: number
  atingido: number; faixaAtual: number; mesFechado: boolean
  percentualFaixa1: number; percentualFaixa3: number
  projecao: number; percentualProjecaoFaixa3: number
} | null
export type Tendencia = {
  ehMesCorrente: boolean; diasDecorridos: number; diasNoMes: number
  projecaoCompetencia: number; projecaoFechamento: number; diasComparacao: number
}
export type Pacote = { pacote: string; qtd: number; receita: number; ticketMedio: number }
export type OnePageData = {
  atual: PeriodoMes; mesAnterior: PeriodoMes; anoAnterior: PeriodoMes
  serieFaturamento: SerieFaturamento[]
  anos: { atual: AnoCompleto; anterior: AnoCompleto }
  funil: { etapa: string; count: number }[]
  meta: Meta
  tendencia: Tendencia
  pacotes: Pacote[]
}

export function useOnePage(filtros: Pick<Filtros, 'unidade' | 'vendedor'>, mesFiltro: string) {
  const [dados, setDados] = useState<OnePageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'onepage' })
    if (mesFiltro)        p.set('mes_filtro', mesFiltro)
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, mesFiltro])

  return { dados, loading, erro }
}

export function useVendedores() {
  const [vendedores, setVendedores] = useState<string[]>([])
  useEffect(() => {
    fetch(`${GAS_URL}?tipo=vendedores`)
      .then(r => r.json())
      .then(d => { if (d.vendedores) setVendedores(d.vendedores) })
      .catch(() => {})
  }, [])
  return vendedores
}

export type VendedorResumo = {
  nome: string; papel: 'SDR' | 'Closer' | 'Outro (SDR)' | 'Outro (Closer)'
  leadsCriados: number; convertidos: number; ganhosNoMes: number; taxaConversao: number
  receitaFechamento: number; receitaCompetencia: number; comissao: number
  receitaFechamentoComSdr: number; receitaFechamentoSemSdr: number
}
export type SerieMensalValor = { periodo: string; label: string; valor: number; qtd: number; temDados?: boolean }
export type TotaisGerais = {
  leadsCriados: number; convertidos: number; taxaConversao: number
  ganhosNoMes: number; receitaFechamento: number; receitaCompetencia: number
  pipelineAbertoValor: number; comissaoTotal: number
}
export type VendedoresResumoData = {
  mes: string; eventoRealizado: boolean
  vendedores: VendedorResumo[]
  forecast: SerieMensalValor[]
  pipelineAbertoPorCloser: Record<string, SerieMensalValor[]>
  faturamentoCompetenciaTotal: number
  totaisGerais: TotaisGerais
  semSdrConfirmado: { qtd: number; valor: number }
  semSdrPendente: { qtd: number; valor: number }
  comissaoTotal: { sdr: number; closer: number; pendente: { qtd: number; valor: number } }
  avisos: { conversao: string; closer: string; leadsCriados: string }
}

export function useVendedoresResumo(filtros: Pick<Filtros, 'unidade' | 'vendedor'>, mesFiltro: string, sdrFiltro?: string) {
  const [dados, setDados] = useState<VendedoresResumoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'vendedores_resumo', mes_filtro: mesFiltro })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    if (sdrFiltro) p.set('sdr', sdrFiltro)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, mesFiltro, sdrFiltro])

  return { dados, loading, erro }
}

export type LinhaFunilProdutividade = {
  periodo: string; label: string; leadsNoMes: number
  qualificacao: number; fechamento: number; won: number; lost: number
  taxaAvancoFechamento: number
  ondeFicou: { etapa: string; grupo: string; count: number }[]
}
export type FunilProdutividadeData = {
  historico: LinhaFunilProdutividade[]
  funilDetalhado: { etapa: string; grupo: string; count: number }[]
}

export type FunilProdutividadeData_ = FunilProdutividadeData & { rotulo?: string }
export function useFunilProdutividade(filtros: Pick<Filtros, 'unidade' | 'vendedor'>, sdr?: string) {
  const [dados, setDados] = useState<FunilProdutividadeData_ | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'funil_produtividade' })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    if (sdr) p.set('sdr', sdr)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, sdr])

  return { dados, loading, erro }
}

export function usePorLojaDetalhe(filtros: Pick<Filtros, 'unidade' | 'vendedor'>, mesFiltro: string) {
  const [dados, setDados] = useState<{ mes: string; diaCorte: number | null; ehMesCorrente: boolean; lojas: any[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'por_loja_detalhe', mes_filtro: mesFiltro })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, mesFiltro])

  return { dados, loading, erro }
}

export type PontoCurvaMaturacao = {
  idadeMeses: number; amostras: number; leadsTotais: number
  convAbsolutaMedia: number; convRelativa: number | null
}
export type SafraProjecao = {
  mes: string; leadsCriados: number; ganhosAteHoje: number
  idadeMeses: number; madura: boolean
  conversaoAtual: number; conversaoProjetada: number | null
  amostraSuficiente: boolean
}
export type ProjecaoConversaoData = {
  curvaMaturacao: PontoCurvaMaturacao[]
  idadeConsideradaMadura: number
  tempoMedioFechamentoDias: number | null
  tempoMedianoFechamentoDias: number | null
  safras: SafraProjecao[]
  aviso: string
}

export function useProjecaoConversao(filtros: Pick<Filtros, 'unidade' | 'vendedor'>) {
  const [dados, setDados] = useState<ProjecaoConversaoData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'projecao_conversao' })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor])

  return { dados, loading, erro }
}

export type AditivoDeal = {
  id: number | string; empresa: string; unidade_nome: string; vendedor: string
  valorAtual: number; valorAditivo: number
  mesFechamentoOriginal: string; mesAditivo: string
  dataFechamentoOriginal: string; dataAditivo: string
}
export type AditivoMes = { mes: string; qtd: number; valorTotalAditivo: number; negocios: AditivoDeal[] }
export type AditivosData = { meses: AditivoMes[]; total: number; valorTotalAditivos: number; aviso: string }

export type CelulaMatriz = { mesCompetencia: string; qtd: number; valor: number }
export type LinhaMatriz = { mesFechamento: string; qtdTotal: number; valorTotal: number; porCompetencia: CelulaMatriz[] }
export type MatrizFechamentoCompetenciaData = {
  anoFechamento: number; colunas: string[]; totalPorColuna: CelulaMatriz[]
  linhas: LinhaMatriz[]; qtdGeral: number; valorGeral: number
}

export type DiaFD = { dia: number; qtd: number; valor: number }
export type BlocoFD = {
  mesFechamento: number
  competenciaAtual: string[]; competenciaAnterior: string[]
  diasAtual: DiaFD[]; diasAnterior: DiaFD[]
  totalAtual: { qtd: number; valor: number }; totalAnterior: { qtd: number; valor: number }
  diferenca: { qtd: number; valor: number }
}
export type FechamentoDiarioData = {
  anoAtual: number; anoAnterior: number; temDrillDown: boolean
  blocos: BlocoFD[]
  totalGeralAtual: { qtd: number; valor: number }; totalGeralAnterior: { qtd: number; valor: number }
  diferencaGeral: { qtd: number; valor: number }
  geralAno: { corteData: string; acumuladoAtual: number; acumuladoAnterior: number; diferenca: number }
}

export function useFechamentoDiarioCompetencia(
  filtros: Pick<Filtros, 'unidade' | 'vendedor'>, ano: string, mesesFechamento: number[], competenciaMeses: number[]
) {
  const [dados, setDados] = useState<FechamentoDiarioData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const mesesKey = mesesFechamento.join(',')
  const competenciaKey = competenciaMeses.join(',')

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'fechamento_diario_competencia', ano, meses_fechamento: mesesKey || '1' })
    if (competenciaKey) p.set('competencia_meses', competenciaKey)
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, ano, mesesKey, competenciaKey])

  return { dados, loading, erro }
}

export function useMatrizFechamentoCompetencia(filtros: Pick<Filtros, 'unidade' | 'vendedor'>, ano: string) {
  const [dados, setDados] = useState<MatrizFechamentoCompetenciaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'matriz_fechamento_competencia', ano })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, ano])

  return { dados, loading, erro }
}

export function useAditivos(filtros: Pick<Filtros, 'unidade' | 'vendedor'>, mesFiltro?: string) {
  const [dados, setDados] = useState<AditivosData | null>(null)
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    const p = new URLSearchParams({ tipo: 'aditivos' })
    if (filtros.unidade)  p.set('unidade',  filtros.unidade)
    if (filtros.vendedor) p.set('vendedor', filtros.vendedor)
    if (mesFiltro) p.set('mes_filtro', mesFiltro)
    fetch(`${GAS_URL}?${p}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setDados(data) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.unidade, filtros.vendedor, mesFiltro])

  return { dados, loading, erro }
}

export function usePorLoja(filtros: Filtros) {
  const [lojas, setLojas] = useState<Record<string, LojaSumario>>({})
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true); setErro(null)
    fetch(`${GAS_URL}?${buildParams({ tipo: 'por_loja' }, filtros)}`)
      .then(r => r.json())
      .then(data => { if (data.erro) throw new Error(data.erro); setLojas(data.lojas || {}) })
      .catch(e => setErro(e.message))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtros.ano, filtros.mes, filtros.status, filtros.unidade, filtros.vendedor])

  return { lojas, loading, erro }
}
