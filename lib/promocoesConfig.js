// lib/promocoesConfig.js
// Config do módulo de Promoções (dashboard + simulador).

// Web App do Apps Script de Promoções Utilizadas + Pacotes + Ficha Técnica.
// Usado só pelo proxy /api/promocoes (dashboard e simulador leem de lá).
export const URL_PROMOCOES_PACOTES = 'https://script.google.com/macros/s/AKfycbxZv0RNOKnWHk04LDmrwtdak-ALs_GsqbeMNqBhMcNTPCTgW0DZunh1-1oHGWtObQde8g/exec'

export const CATEGORIAS_PROMO = ['All Inclusive', 'C&C', 'Clássicos', 'Pacotes dias Promo', 'Pacotes']

// Qual coluna do relatório de Pacotes da ZIG conta como faturamento da promoção:
//   'faturamento' → Faturamento (R$)            ← padrão
//   'valor'       → Valor do Pacote (R$)
// (Antes o dashboard somava Faturamento + Emitido NF, o que contava a mesma
// venda duas vezes. A aba Conferência mostra as três colunas lado a lado
// pra bater com o painel da ZIG.)
export const COLUNA_FATURAMENTO_PACOTE = 'faturamento'

// Faixas de CMV usadas em todo o módulo
export const CMV_META = 0.35     // até aqui: rentável
export const CMV_CRITICO = 0.50  // acima daqui: crítico
