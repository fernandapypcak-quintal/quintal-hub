// lib/promocoesConfig.js
// Config do módulo de Promoções (dashboard + simulador).

// Web App do Apps Script de Promoções Utilizadas + Pacotes + Ficha Técnica.
// Usado só pelo proxy /api/promocoes (dashboard e simulador leem de lá).
export const URL_PROMOCOES_PACOTES = 'https://script.google.com/macros/s/AKfycbxZv0RNOKnWHk04LDmrwtdak-ALs_GsqbeMNqBhMcNTPCTgW0DZunh1-1oHGWtObQde8g/exec'

// Sem categorias: a análise é por PROMOÇÃO (nome da promoção na ZIG — PACOTE 01,
// QUINTAL 2, RODÍZIO…). Cada promoção só é marcada como tipo:
//   Pacote   = item sai de graça, receita vem da reserva (relatório de Pacotes)
//   Desconto = cliente paga parte do item (ex.: Parceiros 20%), receita = cardápio − desconto
export const TIPOS_PROMO = ['Pacote', 'Desconto']

// Promoção vira tipo "Desconto" quando o desconto médio fica entre esses limites
// (abaixo de 5% = ZIG não mandou desconto; a partir de 80% = item de pacote, sai "de graça").
export const DESCONTO_PARCIAL_MIN = 0.05
export const DESCONTO_PARCIAL_MAX = 0.80

// Receita da reserva no relatório de Pacotes da ZIG = Faturamento + Emissão de NF.
// São canais diferentes, não a mesma venda: "Faturamento" é o que foi pago na casa
// (ex.: Noite Italiana, R$ 28,2k) e "Emissão de NF" é o que foi faturado por nota
// (ex.: corporativo Torrent, R$ 9,0k com Faturamento de só R$ 133). Somar os dois
// é o certo. Opções: 'faturamento+nf' (padrão) | 'faturamento' | 'valor'
export const COLUNA_FATURAMENTO_PACOTE = 'faturamento+nf'

// Faixas de CMV usadas em todo o módulo
export const CMV_META = 0.35     // até aqui: rentável
export const CMV_CRITICO = 0.50  // acima daqui: crítico
