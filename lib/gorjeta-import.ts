// lib/gorjeta-import.ts
// =============================================================
//  QUINTAL HUB — Importação de planilhas do módulo Gorjeta
//  Ativos: aceita o export "ATIVOS_GERAL" (Filial/Matricula/Nome/
//  Desc.Funcao/CPF), filtrando pela Filial da unidade atual.
//  Presença: aceita o pivot Nome × Data da TOTVS (Ponto), com os
//  códigos reais confirmados (1, FÉRIAS, FO, AF, AT, SUSP, FA, BH).
// =============================================================

import * as XLSX from 'xlsx'
import { matchFuncao, norm, PONTOS, type Ativo, type Presenca } from './gorjeta-engine'

function fmtMat(v: unknown): string {
  let s = String(v == null ? '' : v).trim()
  if (/^\d+$/.test(s) && s.length < 6) s = s.padStart(6, '0')
  return s
}

function fmtDateBR(v: unknown): string {
  // Mesmo comportamento do fmtDate() do gorjeta.html original — sempre
  // devolve dd/mm/aaaa, que é o formato que o Apps Script já usa pra "data".
  if (v == null) return ''
  if (v instanceof Date) {
    const d = String(v.getDate()).padStart(2, '0'), m = String(v.getMonth() + 1).padStart(2, '0'), y = v.getFullYear()
    return `${d}/${m}/${y}`
  }
  const s = String(v).trim()
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m) return `${m[3]}/${m[2]}/${m[1]}`
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/)
  if (m) return `${m[1].padStart(2, '0')}/${m[2].padStart(2, '0')}/${m[3]}`
  return ''
}

function readSheetRows(buf: ArrayBuffer): any[][] {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  return XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }) as any[][]
}

// ── Ativos (ATIVOS_GERAL: Filial, Matricula, Nome completo, Desc.Funcao, CPF) ──
export async function parseAtivosXlsx(file: File, filialAlvo: string): Promise<{
  ativos: Ativo[]; totalNoArquivo: number; funcoesNaoReconhecidas: string[]
}> {
  const buf = await file.arrayBuffer()
  const rows = readSheetRows(buf)

  let hi = -1, H: string[] = []
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const r = rows[i].map(norm)
    if (r.some(c => c.includes('NOME')) && r.some(c => c.includes('FUNC') || c.includes('CARGO'))) { hi = i; H = r; break }
  }
  if (hi < 0) throw new Error('Não achei as colunas Nome e Função nesta planilha.')

  const find = (...ks: string[]) => { for (let j = 0; j < H.length; j++) if (ks.some(k => H[j].includes(k))) return j; return -1 }
  const cN = find('NOME'), cF = find('FUNC', 'CARGO'), cC = find('CPF'), cE = find('EMPRESA', 'UNIDADE', 'LOJA', 'FILIAL', 'ESTAB')
  let cM = -1
  for (let j = 0; j < H.length; j++) if (H[j] === 'MAT' || H[j].includes('MATRIC') || H[j].includes('CHAPA') || H[j].includes('REGISTRO')) { cM = j; break }

  const filialNorm = norm(filialAlvo).replace(/^0+/, '')
  const ativos: Ativo[] = []
  const naoReco = new Set<string>()
  let totalNoArquivo = 0

  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue
    const nome = String(r[cN] || '').trim(); if (!nome) continue
    totalNoArquivo++

    if (cE >= 0 && filialAlvo) {
      const valFilial = norm(r[cE]).replace(/^0+/, '')
      if (valFilial !== filialNorm) continue // não é dessa unidade
    }

    let funcao = cF >= 0 ? matchFuncao(r[cF]) : 'GARCOM II'
    if (!(funcao in PONTOS)) naoReco.add(funcao)
    const mat = (cM >= 0 && r[cM] !== '' && r[cM] != null) ? fmtMat(r[cM]) : String(Date.now() + i).slice(-6)
    const cpf = cC >= 0 ? String(r[cC] || '').replace(/\D/g, '') : ''
    ativos.push({ mat, nome: nome.toUpperCase(), funcao, cpf })
  }

  return { ativos, totalNoArquivo, funcoesNaoReconhecidas: [...naoReco] }
}

// Códigos reais confirmados no export de Ponto da TOTVS:
// "1" (trabalhou) -> X · "FÉRIAS" -> FER · FO/AF/AT/SUSP/FA/BH/NOVO -> vazio
// (não conta ponto naquele dia — nem Retaguarda nem Salão). "R" (rescisão)
// não vem automaticamente da TOTVS nesse layout — continua sendo um ajuste
// manual na grade de presença.
export function normPontoCode(raw: unknown): string {
  const c = String(raw || '').toUpperCase().trim()
  if (c === '1' || c === 'X') return 'X'
  if (c.startsWith('FÉR') || c.startsWith('FER')) return 'FER'
  if (c === 'R' || c.startsWith('RESC')) return 'R'
  return ''
}

// ── Presença (pivot Nome × Data) ──
// zigDatesBR: datas no mesmo formato dd/mm/aaaa que o ZIG já usa (é assim
// que o Apps Script devolve "data", e o compute() casa por essa string).
export async function parsePresencaXlsx(
  file: File, ativos: Ativo[], zigDatesBR: Set<string>
): Promise<{ pres: Presenca; ativosNovos: Ativo[]; diasCasados: number; diasNoArquivo: number }> {
  const buf = await file.arrayBuffer()
  const rows = readSheetRows(buf)

  let hi = -1, H: string[] = []
  for (let i = 0; i < Math.min(rows.length, 15); i++) {
    const r = rows[i].map(norm)
    if (r.some(c => c.includes('NOME'))) { hi = i; H = r; break }
  }
  if (hi < 0) throw new Error('Não achei o cabeçalho (coluna Nome) nesta planilha.')

  const raw = rows[hi]
  const find = (...ks: string[]) => { for (let j = 0; j < H.length; j++) if (ks.some(k => H[j].includes(k))) return j; return -1 }
  const cN = find('NOME'), cF = find('FUNC', 'CARGO')

  const dateCols: { j: number; date: string }[] = []
  for (let j = 0; j < raw.length; j++) { const d = fmtDateBR(raw[j]); if (d) dateCols.push({ j, date: d }) }
  if (!dateCols.length) throw new Error('Não encontrei colunas de data no cabeçalho.')

  const usable = dateCols.filter(d => zigDatesBR.has(d.date))
  const nameMap: Record<string, Ativo> = {}
  ativos.forEach(a => nameMap[norm(a.nome)] = a)

  const pres: Presenca = {}
  const ativosNovos: Ativo[] = []

  for (let i = hi + 1; i < rows.length; i++) {
    const r = rows[i]; if (!r) continue
    const nome = String(r[cN] || '').trim(); if (!nome) continue
    let a = nameMap[norm(nome)]
    if (!a) {
      const funcao = cF >= 0 ? matchFuncao(r[cF]) : 'GARCOM II'
      a = { mat: String(Date.now() + i).slice(-6), nome: nome.toUpperCase(), funcao, cpf: '' }
      nameMap[norm(nome)] = a
      ativosNovos.push(a)
    }
    dateCols.forEach(({ j, date }) => {
      if (!zigDatesBR.has(date)) return
      pres[a!.mat + '|' + date] = normPontoCode(r[j])
    })
  }

  return { pres, ativosNovos, diasCasados: usable.length, diasNoArquivo: dateCols.length }
}
