// lib/metas/config.ts
//
// Regras do dashboard Metas Regionais.
//
// As regras VIVEM NO BANCO (tabela metas_vigencias) e são editadas pela
// aba "Regras" do dashboard, por quem tem a permissão 'metas-regras'.
// Este arquivo guarda:
//   • os TIPOS das regras
//   • VIGENCIAS_PADRAO: regras usadas se o banco estiver vazio ou fora
//     do ar (e para popular o banco na primeira gravação)
//   • validarVigencia(): checagem usada pela tela e pela API
//
// Cada VIGÊNCIA vale a partir de um mês (inclusive) até a próxima
// vigência começar — meses antigos continuam com as regras da época.

import { ALL_UNIT_IDS, type UnitId } from '@/lib/units'

export type IndicadorKey = string
export type Direcao = 'menor' | 'maior' | 'saldo'
export type Formato = 'pct' | 'moeda' | 'num'
export type TipoAgregacao = 'media' | 'soma'

/**
 * De onde vem o REAL do indicador:
 *  - manual       → lançado na aba Admin (chave = `chaveManual` ou `key`)
 *  - faturamento  → base do dashboard Faturamento; `canal` filtra CASA (salão) ou DELIVERY
 *  - perdas       → Relatório de Descontos: descontos + estornos (desperdício já está dentro)
 *  - bandas       → legado: arrecadação − custo do artista (lançados no Admin)
 */
export type FonteReal =
  | { tipo: 'manual'; chaveManual?: string }
  | { tipo: 'faturamento'; canal?: 'CASA' | 'DELIVERY' }
  | { tipo: 'perdas' }
  | { tipo: 'bandas' }

/**
 * De onde vem a META:
 *  - manual          → lançada na aba Admin (mesma chave do indicador)
 *  - fixa            → mesmo número para todas as casas
 *  - faturamento     → planilha de metas do Faturamento (total da casa)
 *  - reducaoMesAnterior → real do mês anterior × (1 − pct)
 * Uma meta lançada manualmente no Admin sempre tem prioridade.
 */
export type FonteMeta =
  | { tipo: 'manual' }
  | { tipo: 'fixa'; valor: number }
  | { tipo: 'faturamento' }
  | { tipo: 'reducaoMesAnterior'; pct: number }
  | { tipo: 'nenhuma' }

export interface IndicadorConfig {
  key: IndicadorKey
  label: string
  /** rótulo curto para colunas estreitas */
  curto: string
  formato: Formato
  /** pontos que o regional ganha se o Total da carteira bater a meta */
  peso: number
  /** menor = custo (real ≤ meta), maior = receita/NPS (real ≥ meta), saldo = legado Bandas */
  direcao: Direcao
  /** como o Total da carteira (e o trimestre) junta as casas: média (%) ou soma (R$) */
  agregacao: TipoAgregacao
  real: FonteReal
  meta: FonteMeta
  /** explicação curta que aparece na tela (fórmula / regra da meta) */
  descricao?: string
  /** marca "a definir" na tela enquanto a regra não está validada */
  pendente?: string
}

export interface RegionalConfig {
  id: string
  nome: string
  cor: string
  unidades: UnitId[]
}

/**
 * Regra que liga o bônus do regional às casas críticas da carteira dele.
 * `null` = ainda não definida: as críticas aparecem na tela, mas não
 * travam a pontuação.
 */
export type RegraCriticas =
  | null
  | {
      /** o regional só pontua se TODAS as críticas da carteira atingirem o mínimo */
      tipo: 'todas_criticas'
      /** mínimo de pontos (0–100) que cada crítica precisa fazer */
      minimoPontos: number
      /** o que acontece se não bater: zera o bônus ou multiplica os pontos por `fator` */
      efeito: { tipo: 'zera' } | { tipo: 'fator'; fator: number }
    }

export interface VigenciaMetas {
  /** 'YYYY-MM' — vale deste mês em diante */
  vigenteDesde: string
  nome: string
  indicadores: IndicadorConfig[]
  regionais: RegionalConfig[]
  unidadesCriticas: UnitId[]
  regraCriticas: RegraCriticas
}

const REGIONAIS_2026: RegionalConfig[] = [
  { id: 'marco', nome: 'Marco', cor: '#97A624', unidades: ['carinas', 'pavao', 'vila_madalena'] },
  { id: 'andre', nome: 'André', cor: '#0284C7', unidades: ['vila_mariana', 'santana', 'tatuape'] },
  { id: 'keylla', nome: 'Keylla', cor: '#7C3AED', unidades: ['lapa', 'chacara', 'perdizes'] },
]

export const VIGENCIAS_PADRAO: VigenciaMetas[] = [
  // ------------------------------------------------------------------
  // Regras originais (até out/26)
  // ------------------------------------------------------------------
  {
    vigenteDesde: '2000-01',
    nome: 'Regras até out/26',
    indicadores: [
      { key: 'cmv', label: 'CMV', curto: 'CMV', formato: 'pct', peso: 30, direcao: 'menor', agregacao: 'media', real: { tipo: 'manual' }, meta: { tipo: 'manual' } },
      { key: 'custo_folha', label: 'Custo Folha', curto: 'Folha', formato: 'pct', peso: 10, direcao: 'menor', agregacao: 'media', real: { tipo: 'manual' }, meta: { tipo: 'manual' } },
      { key: 'custo_freela', label: 'Custo Freela', curto: 'Freela', formato: 'moeda', peso: 10, direcao: 'menor', agregacao: 'soma', real: { tipo: 'manual' }, meta: { tipo: 'manual' } },
      { key: 'nps', label: 'NPS', curto: 'NPS', formato: 'num', peso: 10, direcao: 'maior', agregacao: 'media', real: { tipo: 'manual' }, meta: { tipo: 'fixa', valor: 85 } },
      { key: 'bandas', label: 'Bandas', curto: 'Bandas', formato: 'moeda', peso: 10, direcao: 'saldo', agregacao: 'soma', real: { tipo: 'bandas' }, meta: { tipo: 'nenhuma' } },
      { key: 'faturamento', label: 'Faturamento', curto: 'Fat.', formato: 'moeda', peso: 30, direcao: 'maior', agregacao: 'soma', real: { tipo: 'faturamento' }, meta: { tipo: 'faturamento' } },
    ],
    regionais: REGIONAIS_2026,
    unidadesCriticas: ['santo_andre', 'chacara', 'santana', 'tatuape', 'vila_madalena'],
    regraCriticas: null,
  },

  // ------------------------------------------------------------------
  // Nov e Dez/26 — MBR outubro/26 (slide "Indicadores Regionais")
  // ------------------------------------------------------------------
  {
    vigenteDesde: '2026-11',
    nome: 'Regras nov–dez/26',
    indicadores: [
      {
        key: 'cmv', label: 'CMV', curto: 'CMV', formato: 'pct', peso: 30, direcao: 'menor', agregacao: 'media',
        real: { tipo: 'manual' }, meta: { tipo: 'manual' },
        descricao: 'Custo das mercadorias ÷ faturamento. Meta: metade do gap em relação a Carinás.',
        pendente: 'Cálculo da meta (gap vs Carinás) em validação: por enquanto a meta é lançada no Admin.',
      },
      {
        key: 'custo_pessoas', label: 'Custo com pessoas', curto: 'Pessoas', formato: 'pct', peso: 20, direcao: 'menor', agregacao: 'media',
        real: { tipo: 'manual' }, meta: { tipo: 'manual' },
        descricao: '(Folha + freela) ÷ faturamento.',
        pendente: 'Percentual a definir com a Amanda: meta e real lançados no Admin.',
      },
      {
        key: 'nps', label: 'NPS', curto: 'NPS', formato: 'num', peso: 10, direcao: 'maior', agregacao: 'media',
        real: { tipo: 'manual' }, meta: { tipo: 'fixa', valor: 88 },
        descricao: 'Índice de satisfação dos clientes. Meta 88.',
      },
      {
        key: 'fat_delivery', label: 'Faturamento delivery', curto: 'Delivery', formato: 'moeda', peso: 10, direcao: 'maior', agregacao: 'soma',
        real: { tipo: 'faturamento', canal: 'DELIVERY' }, meta: { tipo: 'manual' },
        descricao: 'Faturamento realizado do canal Delivery vs meta.',
        pendente: 'Meta por canal ainda não enviada: lance no Admin enquanto isso.',
      },
      {
        key: 'fat_salao', label: 'Faturamento salão', curto: 'Salão', formato: 'moeda', peso: 10, direcao: 'maior', agregacao: 'soma',
        real: { tipo: 'faturamento', canal: 'CASA' }, meta: { tipo: 'manual' },
        descricao: 'Faturamento realizado do canal Casa (salão) vs meta.',
        pendente: 'Meta por canal ainda não enviada: lance no Admin enquanto isso.',
      },
      {
        key: 'perdas', label: 'Desconto, estorno e desperdício', curto: 'Desc./Est.', formato: 'moeda', peso: 20, direcao: 'menor', agregacao: 'soma',
        real: { tipo: 'perdas' }, meta: { tipo: 'reducaoMesAnterior', pct: 0.2 },
        descricao: 'Soma de descontos + estornos do Relatório de Descontos (desperdício incluso). Meta: 20% abaixo do mês anterior.',
      },
    ],
    regionais: REGIONAIS_2026,
    unidadesCriticas: ['santana', 'tatuape', 'perdizes', 'chacara', 'vila_madalena'],
    regraCriticas: null, // em validação — ver tipo RegraCriticas
  },
]

/** Vigência que vale para o mês 'YYYY-MM'. */
export function vigenciaDoMes(vigencias: VigenciaMetas[], anoMes: string): VigenciaMetas {
  const lista = vigencias.length ? vigencias : VIGENCIAS_PADRAO
  const ordenadas = [...lista].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde))
  let atual = ordenadas[0]
  for (const v of ordenadas) if (v.vigenteDesde <= anoMes) atual = v
  return atual
}

export function totalPontosPossiveis(v: VigenciaMetas): number {
  return v.indicadores.reduce((s, i) => s + i.peso, 0)
}

/** Chaves que a aba Admin deixa lançar para a vigência (inclui as 2 linhas de Bandas no legado). */
export function chavesManuais(v: VigenciaMetas): { key: string; label: string; lancaMeta: boolean; lancaReal: boolean }[] {
  const out: { key: string; label: string; lancaMeta: boolean; lancaReal: boolean }[] = []
  v.indicadores.forEach((i) => {
    if (i.real.tipo === 'bandas') {
      out.push({ key: 'bandas_custo_artista', label: 'Bandas: custo do artista', lancaMeta: false, lancaReal: true })
      out.push({ key: 'bandas_arrecadacao', label: 'Bandas: arrecadação', lancaMeta: false, lancaReal: true })
      return
    }
    const lancaReal = i.real.tipo === 'manual'
    const lancaMeta = i.meta.tipo === 'manual' || i.meta.tipo === 'reducaoMesAnterior' || i.meta.tipo === 'faturamento'
    if (!lancaReal && !lancaMeta) return
    out.push({ key: i.real.tipo === 'manual' && i.real.chaveManual ? i.real.chaveManual : i.key, label: i.label, lancaMeta, lancaReal })
  })
  return out
}

// -------------------------------------------------------------------
// Validação — usada pela tela Regras (avisos) e pela API (bloqueio).
// -------------------------------------------------------------------

const UNIDADES_VALIDAS: string[] = ALL_UNIT_IDS.filter((u) => u !== 'holding')

/** 'Faturamento salão' → 'faturamento_salao' (chave estável usada nos lançamentos). */
export function gerarChave(label: string): string {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 40) || 'indicador'
}

export function validarVigencia(v: VigenciaMetas): string[] {
  const erros: string[] = []
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(v.vigenteDesde || '')) erros.push('Mês de início inválido (use AAAA-MM).')
  if (!v.nome?.trim()) erros.push('Dê um nome para a vigência.')

  if (!Array.isArray(v.indicadores) || v.indicadores.length === 0) erros.push('Inclua pelo menos um indicador.')
  const chaves = new Set<string>()
  ;(v.indicadores || []).forEach((i, n) => {
    const nome = i.label?.trim() || `Indicador ${n + 1}`
    if (!i.label?.trim()) erros.push(`${nome}: falta o nome.`)
    if (!/^[a-z0-9_]{2,40}$/.test(i.key || '')) erros.push(`${nome}: chave inválida.`)
    if (chaves.has(i.key)) erros.push(`${nome}: chave repetida (${i.key}).`)
    chaves.add(i.key)
    if (!(Number.isFinite(i.peso) && i.peso >= 0)) erros.push(`${nome}: peso inválido.`)
    if (!['pct', 'moeda', 'num'].includes(i.formato)) erros.push(`${nome}: formato inválido.`)
    if (!['menor', 'maior', 'saldo'].includes(i.direcao)) erros.push(`${nome}: direção inválida.`)
    if (!['media', 'soma'].includes(i.agregacao)) erros.push(`${nome}: agregação inválida.`)
    if (!['manual', 'faturamento', 'perdas', 'bandas'].includes(i.real?.tipo)) erros.push(`${nome}: origem do real inválida.`)
    if (i.real?.tipo === 'faturamento' && i.real.canal && !['CASA', 'DELIVERY'].includes(i.real.canal)) erros.push(`${nome}: canal inválido.`)
    const m = i.meta
    if (!['manual', 'fixa', 'faturamento', 'reducaoMesAnterior', 'nenhuma'].includes(m?.tipo)) erros.push(`${nome}: origem da meta inválida.`)
    if (m?.tipo === 'fixa' && !Number.isFinite(m.valor)) erros.push(`${nome}: informe o valor da meta fixa.`)
    if (m?.tipo === 'reducaoMesAnterior' && !(Number.isFinite(m.pct) && m.pct >= 0 && m.pct < 1)) erros.push(`${nome}: % de redução deve ser entre 0 e 99.`)
    if (m?.tipo === 'faturamento' && !(i.real?.tipo === 'faturamento' && !i.real.canal)) erros.push(`${nome}: meta da planilha de faturamento só vale para faturamento total.`)
  })
  const soma = (v.indicadores || []).reduce((s, i) => s + (Number(i.peso) || 0), 0)
  if (soma !== 100) erros.push(`Os pesos somam ${soma} pts: precisam somar 100.`)

  const usadas = new Set<string>()
  ;(v.regionais || []).forEach((r) => {
    if (!r.nome?.trim()) erros.push('Tem regional sem nome.')
    if (!/^[a-z0-9_]{2,40}$/.test(r.id || '')) erros.push(`Regional ${r.nome}: identificador inválido.`)
    ;(r.unidades || []).forEach((u) => {
      if (!UNIDADES_VALIDAS.includes(u)) erros.push(`Regional ${r.nome}: unidade desconhecida (${u}).`)
      if (usadas.has(u)) erros.push(`A unidade ${u} está em mais de um regional.`)
      usadas.add(u)
    })
  })
  ;(v.unidadesCriticas || []).forEach((u) => {
    if (!UNIDADES_VALIDAS.includes(u)) erros.push(`Crítica desconhecida (${u}).`)
  })

  const rc = v.regraCriticas
  if (rc) {
    if (rc.tipo !== 'todas_criticas') erros.push('Regra das críticas inválida.')
    if (!(Number.isFinite(rc.minimoPontos) && rc.minimoPontos >= 0 && rc.minimoPontos <= 100)) erros.push('Mínimo de pontos das críticas deve ser entre 0 e 100.')
    if (rc.efeito?.tipo === 'fator' && !(Number.isFinite(rc.efeito.fator) && rc.efeito.fator >= 0 && rc.efeito.fator <= 1)) erros.push('Fator da regra das críticas deve ser entre 0 e 100%.')
    if (!['zera', 'fator'].includes(rc.efeito?.tipo)) erros.push('Efeito da regra das críticas inválido.')
  }
  return erros
}
