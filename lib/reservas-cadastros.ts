// lib/reservas-cadastros.ts
// Cadastros de Reservas editados pelo HUB (aba "Equipe e bônus") e gravados nas
// abas OPERADORES, METAS_SEMANAIS e ESCALA da planilha "Comercial e Marketing -
// Reservas B2C" (via Apps Script QuintalFaturamentoMetas.gs, ?tabela=...).
// Formatos que o Reservas.gs entende: datas AAAA-MM-DD (ou DD/MM/AAAA), mês AAAA-MM,
// dias da escala "15-16-19-20-21", apelidos separados por ";".
// As regras abaixo valem para a tela (erros na hora) e para a API (checagem final).

export type TabelaReservas = 'reservas_operadores' | 'reservas_metas_semanais' | 'reservas_escala'

export const COLUNAS: Record<TabelaReservas, string[]> = {
  reservas_operadores: ['operador', 'time', 'inicio', 'fim', 'apelidos'],
  reservas_metas_semanais: ['inicio', 'operador', 'meta_base', 'faixa_1_%', 'faixa_2_%', 'faixa_3_%'],
  reservas_escala: ['mes', 'semana', 'operador', 'dias'],
}

export const TABELAS_RESERVAS = Object.keys(COLUNAS) as TabelaReservas[]

export const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase()

/** "05/11/2026" | "2026-11-05" → "2026-11-05"; vazio → ""; inválido → null */
export function dataIso(v: string): string | null {
  const s = String(v || '').trim()
  if (!s) return ''
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s)
  if (m) return valida(+m[1], +m[2], +m[3]) ? s : null
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s)
  if (m && valida(+m[3], +m[2], +m[1])) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}
function valida(a: number, mes: number, d: number) {
  const dt = new Date(a, mes - 1, d)
  return dt.getFullYear() === a && dt.getMonth() === mes - 1 && dt.getDate() === d
}

/** chaves (nome + apelidos, sem acento, maiúsculas) → nome padrão */
export function mapaOperadores(linhasOperadores: string[][]): Map<string, string> {
  const m = new Map<string, string>()
  linhasOperadores.forEach((l) => {
    const nome = String(l[0] || '').trim()
    if (!nome) return
    ;[nome, ...String(l[4] || '').split(';')].map(semAcento).filter(Boolean).forEach((k) => m.set(k, nome))
  })
  return m
}

export type ErroLinha = { linha: number; msg: string }

/** Normaliza (apara espaços, datas em AAAA-MM-DD) e valida. linha = índice (0-based) na lista. */
export function validarTabela(
  tabela: TabelaReservas,
  linhas: string[][],
  operadores?: Map<string, string>
): { linhas: string[][]; erros: ErroLinha[] } {
  const erros: ErroLinha[] = []
  const err = (i: number, msg: string) => erros.push({ linha: i, msg })
  const out = linhas.map((l) => COLUNAS[tabela].map((_, k) => String(l[k] ?? '').trim()))
  const vistos = new Map<string, number>()
  const conhecido = (nome: string) => !operadores || operadores.has(semAcento(nome))
  // apelido ou nome com espaço sobrando → nome oficial do cadastro
  const oficial = (nome: string) => (operadores && operadores.get(semAcento(nome))) || nome

  out.forEach((l, i) => {
    if (tabela === 'reservas_operadores') {
      const [nome, time, ini, fim, apelidos] = l
      if (!nome) err(i, 'Falta o nome')
      if (!time) l[1] = 'Reservas'
      const di = dataIso(ini), df = dataIso(fim)
      if (di === null) err(i, 'Data de início inválida')
      else l[2] = di
      if (df === null) err(i, 'Data de saída inválida')
      else l[3] = df
      if (di && df && df < di) err(i, 'A saída é antes do início')
      l[4] = apelidos.split(/[;,]/).map((a) => a.trim()).filter(Boolean).join('; ')
      const k = semAcento(nome)
      if (k && vistos.has(k)) err(i, `Nome repetido (linha ${(vistos.get(k) as number) + 1})`)
      vistos.set(k, i)
    }

    if (tabela === 'reservas_metas_semanais') {
      const [ini, op, base, f1, f2, f3] = l
      const di = dataIso(ini)
      if (!ini || di === null) err(i, 'Data de início inválida')
      else l[0] = di
      if (op && !conhecido(op)) err(i, `Operadora "${op}" não está no cadastro`)
      else if (op) l[1] = oficial(op)
      const nb = Number(base)
      if (!(Number.isInteger(nb) && nb > 0)) err(i, 'Meta base precisa ser um número inteiro maior que zero')
      const p = [f1, f2, f3].map(Number)
      if (!p.every((x) => Number.isFinite(x) && x > 0)) err(i, 'Preencha as 3 faixas em %')
      else if (!(p[0] <= p[1] && p[1] <= p[2])) err(i, 'As faixas precisam ser crescentes')
      const k = `${di}|${semAcento(l[1])}`
      if (vistos.has(k)) err(i, `Repetida (linha ${(vistos.get(k) as number) + 1})`)
      vistos.set(k, i)
    }

    if (tabela === 'reservas_escala') {
      const [mes, semana, op, dias] = l
      if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) err(i, 'Mês inválido (use AAAA-MM)')
      const s = Number(semana)
      if (!(Number.isInteger(s) && s >= 1 && s <= 6)) err(i, 'Semana precisa ser de 1 a 6')
      if (!op) err(i, 'Falta a operadora')
      else if (!conhecido(op)) err(i, `Operadora "${op}" não está no cadastro`)
      else l[2] = oficial(op)
      const nums = dias.split(/\D+/).filter(Boolean).map(Number)
      const ultimo = /^\d{4}-\d{2}$/.test(mes) ? new Date(+mes.slice(0, 4), +mes.slice(5, 7), 0).getDate() : 31
      if (!nums.length) err(i, 'Informe os dias (ex.: 15-16-19-20-21)')
      else if (nums.some((d) => d < 1 || d > ultimo)) err(i, `Dia fora do mês (1 a ${ultimo})`)
      else l[3] = Array.from(new Set(nums)).sort((a, b) => a - b).join('-')
      const k = `${mes}|${s}|${semAcento(l[2])}`
      if (vistos.has(k)) err(i, `Repetida (linha ${(vistos.get(k) as number) + 1})`)
      vistos.set(k, i)
    }
  })

  return { linhas: out, erros }
}
