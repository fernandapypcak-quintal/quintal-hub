// app/hub/reservas/pesos.ts
// Peso de cada casa na meta mensal do time de reservas.
//
// Base: reservas de 2025 por casa e mês (export Get In, por data da reserva), sem corporativo,
// sem eventos do Pipe, só status Sentada e Confirmada — planilha
// "reservas_2025_sentadas_confirmadas_por_casa.xlsx", aba Reservas.
//
// Regra: a meta de cada casa no mês M = faixa (ou desafio) do time em M × peso da casa no
// mesmo mês de 2025 (reservas da casa ÷ total do mês). Cada coluna soma 100%.
// Para trocar a base, basta atualizar os números abaixo (o peso é recalculado sozinho).

import type { UnitId } from '@/lib/units'

//                     jan  fev  mar  abr  mai  jun  jul  ago  set  out  nov  dez
export const RESERVAS_2025: Partial<Record<UnitId, number[]>> = {
  tatuape:       [462, 526, 704, 545, 664, 551, 522, 755, 559, 514, 510, 408],
  carinas:       [541, 588, 773, 509, 580, 463, 549, 618, 623, 461, 491, 345],
  santo_andre:   [438, 454, 676, 408, 551, 493, 618, 592, 458, 407, 576, 328],
  santana:       [293, 432, 497, 413, 565, 438, 518, 598, 498, 392, 402, 331],
  lapa:          [184, 222, 285, 186, 273, 224, 232, 308, 296, 231, 254, 208],
  perdizes:      [204, 225, 227, 188, 237, 195, 216, 253, 247, 242, 201, 205],
  vila_mariana:  [213, 179, 237, 204, 223, 185, 189, 238, 210, 193, 171, 139],
  vila_madalena: [218, 200, 198, 200, 235, 170, 192, 214, 196,  99, 185, 171],
  chacara:       [114, 156, 175, 111, 124, 108, 111, 131, 157, 116, 130, 123],
  pavao:         [108, 119, 133, 118, 123, 121, 125, 156, 133,  99, 118,  84],
}
export const ANO_BASE_PESO = 2025

// Casas críticas: a supervisora (Thais) bate a meta dela só se TODAS estas baterem a meta da casa.
export const CASAS_CRITICAS: UnitId[] = ['santana', 'tatuape', 'perdizes', 'chacara', 'vila_madalena']
export const SUPERVISORA = 'Thais'

// Peso da casa no mês (AAAA-MM) — usa o mesmo mês do ano-base
export function pesoDaCasa(id: UnitId, mes: string): number {
  const i = Number(mes.slice(5, 7)) - 1
  const total = Object.values(RESERVAS_2025).reduce((s, v) => s + (v?.[i] || 0), 0)
  const casa = RESERVAS_2025[id]?.[i] || 0
  return total ? casa / total : 0
}
export function reservasBase(id: UnitId, mes: string): number {
  return RESERVAS_2025[id]?.[Number(mes.slice(5, 7)) - 1] || 0
}
