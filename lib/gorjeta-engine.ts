// lib/gorjeta-engine.ts
// =============================================================
//  QUINTAL HUB — Motor de cálculo do rateio de gorjeta
//  Porta fiel do compute() do gorjeta.html standalone. Mantém as
//  mesmas regras: 33% retenção / 67% distribuição, Retaguarda por
//  pontos (diário), Salão por venda entre presentes (diário), e o
//  desconto de Adiantamento já pago quando a folha é Mensal.
// =============================================================

export const PONTOS: Record<string, number> = {
  'GARCONETE II': 4, 'MAITRE JR': 6.5, 'RECEPCIONISTA II': 3, 'CHURRASQUEIRO II': 5,
  'MAITRE SR': 7.5, 'GARCOM II': 4, 'COZINHEIRO(A) I': 4, 'BARMAN I': 4,
  'ESTOQUISTA I': 4, 'GARCOM III': 3, 'APRENDIZ RECEPCIONIS': 0, 'AUX DE LIMPEZA I': 3,
  'COZINHEIRO(A) II': 3, 'AUX SERV GERAIS I': 3, 'OPERADOR(A) CAIXA I': 4, 'CHEFE DE RECEPCAO': 5,
  'RECEPCIONISTA I': 4, 'SUB GERENTE': 8, 'LIDER DE OPERAÇÕES': 5, 'GERENTE OPER JR': 4,
  'COPEIRO(A) I': 3, 'LIDER DE ESTOQUE': 5, 'ESTOQUISTA II': 3, 'COPEIRO(A) II': 2,
  'AUX SERV GERAIS II': 2, 'AUX DE LIMPEZA II': 2, 'CHEFE DE COZINHA': 5, 'LIDER DE CHURRASQUEIRO': 6,
  'CHURRASQUEIRO I': 5, 'CHEFE DE BAR': 5, 'BARMAN II': 3, 'CHEFE DE CAIXA': 5,
  'OPERADOR(A) CAIXA II': 3, 'AUXILIAR ADMINISTRATIVO': 3, 'GARCOM I': 4.5, 'GARCONETE I': 4.5,
  'GARCONETE III': 3, 'MAITRE PL': 7, 'GERENTE OPER SR': 5, 'GERENTE OPER PL': 4,
  'GER ASSUNT/CORPORAT': 9, 'CUMIM': 0, 'APRENDIZ ADM': 0,
}
export const FUNCOES = Object.keys(PONTOS).sort()
export const RETENCAO = 0.33
export const DISTRIB = 0.67

export function ponto(f: string): number { return PONTOS[f] ?? 0 }
export function isSalao(f: string): boolean { return /^GARCOM|^GARCONETE/.test((f || '').toUpperCase()) }
export function setorDe(f: string): 'SALÃO' | 'RETAGUARDA' { return isSalao(f) ? 'SALÃO' : 'RETAGUARDA' }
export function cpfDigits(s: string | undefined | null): string {
  const m = (s || '').match(/\d{11}/g)
  return m ? m[m.length - 1] : ''
}
export function norm(s: string | undefined | null): string {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().trim()
}
export function matchFuncao(raw: string): string {
  const n = norm(raw)
  for (const f of FUNCOES) if (norm(f) === n) return f
  return String(raw || '').toUpperCase().trim()
}

export type Ativo = { mat: string; nome: string; funcao: string; cpf: string }
export type ZigDia = { data: string; local: string; servico: number; entrada?: number; fat?: number }
export type RankLinha = { raw: string; valor: number }
// PRES: chave "mat|data" -> 'X' | 'FER' | 'R' | ''
export type Presenca = Record<string, string>

export type ResPessoa = {
  mat: string; nome: string; funcao: string; setor: string
  base: number; pagar: number; ferias: number; resc: number
  isSalao: boolean; hasR: boolean; daily: number[]
  descontoAdiant?: number; pagarLiquido?: number
}

export type ComputeResult = {
  res: Record<string, ResPessoa>
  brutoTot: number; distribTot: number; retidoTot: number
  poolSalaoTot: number; poolRetagTot: number
  pctSalao: number; pctRetag: number; ptsSalao: number; ptsRetag: number
  vendaTot: number
  matched: { a: Ativo; valor: number }[]
  cpfMap: Record<string, Ativo>; nomeMap: Record<string, Ativo>
  memo: { nome: string; valor: number; pct: number; g: number }[]
  distribuido: number; sobra: number; days: number
  tipoFolha?: 'adiantamento' | 'mensal'
  adiantRef?: HistoricoEntry | null
}

export type HistoricoEntry = {
  label: string; calcEm: string; quem: string
  bruto: number; distribuido: number; sobra: number; nColab: number
  tipo: 'adiantamento' | 'mensal'
  porMat: Record<string, { pagar: number; ferias: number; resc: number }>
}

function pcode(pres: Presenca, mat: string, date: string, presImported: boolean): string {
  const k = mat + '|' + date
  return k in pres ? pres[k] : (presImported ? '' : 'X')
}

export function compute(
  ativos: Ativo[], zig: ZigDia[], rank: RankLinha[], pres: Presenca, presImported: boolean
): ComputeResult {
  let ptsSalao = 0, ptsRetag = 0
  ativos.forEach(a => { const p = ponto(a.funcao); if (isSalao(a.funcao)) ptsSalao += p; else ptsRetag += p })
  const ptsTot = ptsSalao + ptsRetag || 1
  const pctSalao = ptsSalao / ptsTot, pctRetag = ptsRetag / ptsTot

  let brutoTot = 0
  zig.forEach(z => brutoTot += z.servico)
  const distribTot = brutoTot * DISTRIB, retidoTot = brutoTot * RETENCAO
  const poolSalaoTot = distribTot * pctSalao, poolRetagTot = distribTot * pctRetag

  const res: Record<string, ResPessoa> = {}
  ativos.forEach(a => res[a.mat] = {
    mat: a.mat, nome: a.nome, funcao: a.funcao, setor: setorDe(a.funcao),
    base: 0, pagar: 0, ferias: 0, resc: 0, isSalao: isSalao(a.funcao), hasR: false,
    daily: zig.map(() => 0),
  })
  const hasR = (mat: string) => zig.some(z => pcode(pres, mat, z.data, presImported) === 'R')
  ativos.forEach(a => res[a.mat].hasR = hasR(a.mat))

  // RETAGUARDA dia a dia
  zig.forEach((z, di) => {
    const poolDia = z.servico * DISTRIB * pctRetag
    let ptsDia = 0
    const cs: { a: Ativo; p: number; st: string }[] = []
    ativos.forEach(a => {
      if (isSalao(a.funcao)) return
      const st = pcode(pres, a.mat, z.data, presImported)
      if (st === 'X' || st === 'FER') { const p = ponto(a.funcao); if (p > 0) { ptsDia += p; cs.push({ a, p, st }) } }
    })
    if (ptsDia > 0) cs.forEach(({ a, p, st }) => {
      const v = poolDia / ptsDia * p
      res[a.mat].daily[di] = v
      if (res[a.mat].hasR) res[a.mat].resc += v
      else if (st === 'X') res[a.mat].pagar += v
      else res[a.mat].ferias += v
    })
  })

  // SALÃO — rateio diário: a cada dia, o bolo do Salão é dividido entre os
  // garçons PRESENTES (X/FER), ponderado pela % de venda de cada um.
  const cpfMap: Record<string, Ativo> = {}
  const nomeMap: Record<string, Ativo> = {}
  ativos.forEach(a => { if (!isSalao(a.funcao)) return; const c = cpfDigits(a.cpf); if (c) cpfMap[c] = a; nomeMap[norm(a.nome)] = a })

  let vendaTot = 0
  const matched: { a: Ativo; valor: number }[] = []
  const matchedMats = new Set<string>()
  rank.forEach(r => {
    const c = cpfDigits(r.raw)
    let a = c ? cpfMap[c] : undefined
    if (!a) { const soNome = norm(String(r.raw || '').replace(/\(.*\)/, '')); a = soNome ? nomeMap[soNome] : undefined }
    if (a && !matchedMats.has(a.mat)) { vendaTot += r.valor; matched.push({ a, valor: r.valor }); matchedMats.add(a.mat) }
  })
  const salesFrac: Record<string, number> = {}
  matched.forEach(({ a, valor }) => salesFrac[a.mat] = vendaTot ? valor / vendaTot : 0)
  const memoMap: Record<string, { nome: string; valor: number; pct: number; g: number }> = {}
  matched.forEach(({ a, valor }) => { res[a.mat].base = valor; memoMap[a.mat] = { nome: a.nome, valor, pct: salesFrac[a.mat], g: 0 } })

  zig.forEach((z, di) => {
    const poolDiaS = z.servico * DISTRIB * pctSalao
    const presentes = matched.filter(({ a }) => { const c = pcode(pres, a.mat, z.data, presImported); return c === 'X' || c === 'FER' })
    let den = 0
    presentes.forEach(({ a }) => den += salesFrac[a.mat])
    if (den > 0) presentes.forEach(({ a }) => {
      const c = pcode(pres, a.mat, z.data, presImported)
      const slice = poolDiaS * salesFrac[a.mat] / den
      res[a.mat].daily[di] = slice
      if (res[a.mat].hasR) res[a.mat].resc += slice
      else if (c === 'X') res[a.mat].pagar += slice
      else res[a.mat].ferias += slice
      memoMap[a.mat].g += slice
    })
  })

  const memo = Object.values(memoMap).sort((x, y) => y.valor - x.valor)
  ativos.forEach(a => { if (!isSalao(a.funcao)) res[a.mat].base = ponto(a.funcao) })

  let distribuido = 0
  Object.values(res).forEach(r => distribuido += r.pagar + r.ferias + r.resc)
  const sobra = distribTot - distribuido

  return {
    res, brutoTot, distribTot, retidoTot, poolSalaoTot, poolRetagTot,
    pctSalao, pctRetag, ptsSalao, ptsRetag, vendaTot, matched, cpfMap, nomeMap,
    memo, distribuido, sobra, days: zig.length,
  }
}

// Aplica o desconto do Adiantamento já pago, quando a folha atual é Mensal.
// Não mexe em nada quando é Adiantamento (retorna C como veio).
export function aplicarDescontoAdiantamento(
  C: ComputeResult, tipoFolha: 'adiantamento' | 'mensal', ultimoAdiantamento: HistoricoEntry | null
): ComputeResult {
  C.tipoFolha = tipoFolha
  C.adiantRef = null
  if (tipoFolha !== 'mensal') return C
  C.adiantRef = ultimoAdiantamento
  Object.values(C.res).forEach(r => {
    const pago = ultimoAdiantamento?.porMat?.[r.mat]?.pagar ?? 0
    r.descontoAdiant = pago
    r.pagarLiquido = Math.max(0, r.pagar - pago)
  })
  return C
}

// Constrói a entrada de histórico (o que vai persistir) a partir de um
// cálculo fechado — usada tanto pelo "fechar quinzena" quanto por quem for
// gravar no Supabase.
export function construirHistoricoEntry(
  C: ComputeResult, tipo: 'adiantamento' | 'mensal', label: string, quem: string
): HistoricoEntry {
  const porMat: HistoricoEntry['porMat'] = {}
  Object.values(C.res).forEach(r => { porMat[r.mat] = { pagar: r.pagar, ferias: r.ferias, resc: r.resc } })
  const distribuidoFinal = tipo === 'mensal'
    ? Object.values(C.res).reduce((s, r) => s + (r.pagarLiquido ?? r.pagar) + r.ferias + r.resc, 0)
    : C.distribuido
  return {
    label, calcEm: new Date().toISOString(), quem,
    bruto: C.brutoTot, distribuido: distribuidoFinal, sobra: C.sobra, nColab: Object.keys(C.res).length,
    tipo, porMat,
  }
}
