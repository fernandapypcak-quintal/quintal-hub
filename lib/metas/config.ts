// lib/metas/config.ts
//
// ÚNICO lugar para mudar as regras do dashboard Metas Regionais.
//
// Cada VIGÊNCIA vale a partir de um mês (inclusive) até a próxima
// vigência começar. Assim, quando as regras mudam, os meses antigos
// continuam sendo calculados com as regras da época.
//
// Para mudar algo:
//   • indicador / peso / meta fixa   → edite `indicadores` da vigência
//   • casas prioritárias (críticas)   → edite `unidadesCriticas`
//   • carteira de cada regional       → edite `regionais`
//   • regra de bônus x críticas       → edite `regraCriticas`
// Se a mudança vale só a partir de um mês novo, copie a última vigência,
// mude `vigenteDesde` e ajuste o que mudou. Não precisa mexer em tela.

import type { UnitId } from '@/lib/units'

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

export const VIGENCIAS: VigenciaMetas[] = [
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
export function vigenciaDoMes(anoMes: string): VigenciaMetas {
  const ordenadas = [...VIGENCIAS].sort((a, b) => a.vigenteDesde.localeCompare(b.vigenteDesde))
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
