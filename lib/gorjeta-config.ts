// lib/gorjeta-config.ts
// =============================================================
//  QUINTAL HUB — Config do módulo Gorjeta
//  O "Filial" aqui é o código da FOLHA DE PAGAMENTO (Tothus/TOTVS),
//  diferente do UnitId canônico do HUB e do zigLabel da Zig — os três
//  sistemas nomeiam as mesmas 10 unidades de jeitos diferentes.
//  Confirmado contra o layout real (LAYOUT_IMP_Filial_040.xlsx = Vila
//  Madalena = Filial "040101").
// =============================================================

import type { UnitId } from './units'

export const FILIAL_PAGAMENTO: Record<UnitId, string> = {
  carinas: '020101',
  lapa: '020102',
  tatuape: '020103',
  pavao: '030101',
  chacara: '030102',
  vila_madalena: '040101',
  vila_mariana: '050101',
  perdizes: '060101',
  santana: '070101',
  santo_andre: '090101',
  holding: '',
}

export type TipoFolha = 'adiantamento' | 'mensal'

export type Periodo = { inicio: string; fim: string } // aaaa-mm-dd

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

// "Adiantamento" que FECHA no dia 10 de anoFim/mesFim (começa dia 25 do mês anterior).
export function periodoAdiantamento(anoFim: number, mesFim: number): Periodo {
  let mesIni = mesFim - 1
  let anoIni = anoFim
  if (mesIni === 0) { mesIni = 12; anoIni = anoFim - 1 }
  return { inicio: `${anoIni}-${pad2(mesIni)}-25`, fim: `${anoFim}-${pad2(mesFim)}-10` }
}

// "Mensal" do mês informado: sempre 11 a 24 do mesmo mês.
export function periodoMensal(ano: number, mes: number): Periodo {
  return { inicio: `${ano}-${pad2(mes)}-11`, fim: `${ano}-${pad2(mes)}-24` }
}

// Descobre em qual período "hoje" cai — mesma regra usada no Apps Script
// (periodoAtual_) e no gorjeta.html standalone (periodoAtualCliente).
export function periodoAtual(): { tipo: TipoFolha } & Periodo {
  const hoje = new Date()
  const ano = hoje.getFullYear(), mes = hoje.getMonth() + 1, dia = hoje.getDate()

  if (dia >= 11 && dia <= 24) {
    const p = periodoMensal(ano, mes)
    return { tipo: 'mensal', ...p }
  }
  if (dia >= 25) {
    let mesFim = mes + 1, anoFim = ano
    if (mesFim > 12) { mesFim = 1; anoFim = ano + 1 }
    const p = periodoAdiantamento(anoFim, mesFim)
    return { tipo: 'adiantamento', ...p }
  }
  const p = periodoAdiantamento(ano, mes)
  return { tipo: 'adiantamento', ...p }
}

export function fmtDataBR(ymd: string): string {
  const [a, m, d] = ymd.split('-')
  return `${d}/${m}/${a}`
}
