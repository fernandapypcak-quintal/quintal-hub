'use client'

// ─────────────────────────────────────────────────────────────────────────────
// useMarketing.ts
// Hook de dados do dashboard de Marketing.
// Por enquanto retorna estrutura vazia (Status: Planejado).
// Quando as fontes estiverem definidas, substituir os valores nulos pelos
// dados reais: Meta Ads API, Google Ads API, ou planilha consolidada.
// ─────────────────────────────────────────────────────────────────────────────

export type MarketingKPI = {
  // ROAS — Return on Ad Spend
  roas: number | null                // ex: 4.2 (adimensional)
  roasReceitaAnuncios: number | null // R$ receita atribuída a anúncios
  roasGastoAnuncios: number | null   // R$ investido em anúncios

  // LTV — Lifetime Value
  ltv: number | null                 // R$ valor total por cliente
  ltvTicketMedio: number | null      // R$
  ltvFrequencia: number | null       // visitas/mês
  ltvTempoRelacionamento: number | null // meses

  // ROI de Marketing
  roiMarketing: number | null        // % retorno sobre investimento
  roiReceitaGerada: number | null    // R$
  roiInvestimento: number | null     // R$

  // Metadados
  periodo: string | null             // ex: 'junho/2026'
  fonteAtualizada: string | null     // ISO date string
}

export type MarketingData = {
  kpis: MarketingKPI
  historico: MarketingHistoricoItem[]
  loading: boolean
  error: string | null
}

export type MarketingHistoricoItem = {
  mes: string        // 'Jan', 'Fev', ...
  roas: number | null
  ltv: number | null
  roiMarketing: number | null
  investimento: number | null
}

// Estado inicial vazio — todos os indicadores planejados
const EMPTY_KPIS: MarketingKPI = {
  roas: null,
  roasReceitaAnuncios: null,
  roasGastoAnuncios: null,
  ltv: null,
  ltvTicketMedio: null,
  ltvFrequencia: null,
  ltvTempoRelacionamento: null,
  roiMarketing: null,
  roiReceitaGerada: null,
  roiInvestimento: null,
  periodo: null,
  fonteAtualizada: null,
}

const EMPTY_HISTORICO: MarketingHistoricoItem[] = [
  'Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'
].map(mes => ({ mes, roas: null, ltv: null, roiMarketing: null, investimento: null }))

// ─────────────────────────────────────────────────────────────────────────────
// Hook principal
// Para conectar dados reais, substituir o return abaixo por uma chamada
// fetch/useEffect para a fonte definida (Meta Ads, Google Ads, Sheets, etc.)
// ─────────────────────────────────────────────────────────────────────────────
export function useMarketing(): MarketingData {
  return {
    kpis: EMPTY_KPIS,
    historico: EMPTY_HISTORICO,
    loading: false,
    error: null,
  }
}
