// lib/units.ts
// =============================================================
//  QUINTAL HUB — Registro canônico de unidades
//  Cada dashboard (custos, faturamento, ZIG, turnover, comercial…)
//  usa uma grafia diferente para a mesma loja. Este arquivo é a
//  fonte única de verdade: um id canônico por unidade + os apelidos
//  ("aliases") usados em cada sistema, para permitir filtrar os
//  dados por unidade a partir de uma permissão salva uma única vez.
// =============================================================

export type UnitId =
  | 'carinas'
  | 'santana'
  | 'tatuape'
  | 'lapa'
  | 'perdizes'
  | 'vila_mariana'
  | 'vila_madalena'
  | 'pavao'
  | 'chacara'
  | 'santo_andre'
  | 'holding'

export type Unit = {
  id: UnitId
  label: string
  aliases: string[]
  // Grafia exata usada em cada sistema/dashboard — necessária pra
  // selecionar/comparar com precisão (cada um nomeia diferente).
  custosLabel: string     // app/hub/custos (config.js LOJAS) e app/hub/relatorios
  turnoverLabel: string   // app/hub/turnover (useGASData.js UNIDADES)
  zigLabel?: string       // app/hub/faturamento e app/api/zig (Loja em maiúsculas)
  comercialId?: string    // app/hub/comercial (Pipedrive UNIDADES)
}

// "Figueiras" / "Espaço Figueiras" é sempre a unidade Santo André.
export const UNITS: Unit[] = [
  { id: 'carinas', label: 'Carinás', custosLabel: 'Carinas', turnoverLabel: 'Carinas', zigLabel: 'CARINAS', comercialId: '14', aliases: [
    'carinas', 'carinás', 'moema carinas', 'moema carinás', 'quintal do espeto carinas', 'quintal do espeto carinás', 'delivery carinas', 'delivery carinás',
  ] },
  { id: 'santana', label: 'Santana', custosLabel: 'Santana', turnoverLabel: 'Santana', zigLabel: 'SANTANA', comercialId: '28', aliases: [
    'santana', 'quintal do espeto santana', 'delivery santana',
  ] },
  { id: 'tatuape', label: 'Tatuapé', custosLabel: 'Tatuapé', turnoverLabel: 'Tatuapé', zigLabel: 'TATUAPÉ', comercialId: '17', aliases: [
    'tatuape', 'tatuapé', 'quintal do espeto tatuape', 'quintal do espeto tatuapé', 'delivery tatuape', 'delivery tatuapé',
  ] },
  { id: 'lapa', label: 'Lapa', custosLabel: 'Lapa', turnoverLabel: 'Lapa', zigLabel: 'LAPA', comercialId: '13', aliases: [
    'lapa', 'alto da lapa', 'quintal do espeto lapa', 'delivery lapa',
  ] },
  { id: 'perdizes', label: 'Perdizes', custosLabel: 'Perdizes', turnoverLabel: 'Perdizes', zigLabel: 'PERDIZES', comercialId: '16', aliases: [
    'perdizes', 'quintal do espeto perdizes', 'delivery perdizes',
  ] },
  { id: 'vila_mariana', label: 'Vila Mariana', custosLabel: 'Mariana', turnoverLabel: 'Mariana', zigLabel: 'VILA MARIANA', comercialId: '19', aliases: [
    'mariana', 'vila mariana', 'v. mariana', 'v mariana', 'quintal do espeto v. mariana', 'quintal do espeto vila mariana', 'delivery v. mariana', 'delivery vila mariana',
  ] },
  { id: 'vila_madalena', label: 'Vila Madalena', custosLabel: 'Madalena', turnoverLabel: 'Madalena', zigLabel: 'VILA MADALENA', comercialId: '18', aliases: [
    'madalena', 'vila madalena', 'v. madalena', 'v madalena', 'quintal do espeto v. madalena', 'quintal do espeto vila madalena', 'delivery vila madalena', 'delivery v. madalena',
  ] },
  { id: 'pavao', label: 'Pavão', custosLabel: 'Pavão', turnoverLabel: 'Pavão', zigLabel: 'PAVÃO', comercialId: '15', aliases: [
    'pavao', 'pavão', 'moema pavao', 'moema pavão', 'quintal do espeto pavao', 'quintal do espeto pavão', 'delivery pavao', 'delivery pavão',
  ] },
  { id: 'chacara', label: 'Chácara', custosLabel: 'Chácara', turnoverLabel: 'Chácara', zigLabel: 'CHÁCARA', comercialId: '78', aliases: [
    'chacara', 'chácara', 'chacara sto antonio', 'chácara sto. antônio', 'chac sto antonio', 'chac. sto antonio', 'quintal do espeto chac sto antonio', 'delivery chac. sto antonio',
  ] },
  { id: 'santo_andre', label: 'Santo André (Figueiras)', custosLabel: 'Figueiras', turnoverLabel: 'Santo André', zigLabel: 'SANTO ANDRÉ', comercialId: '72', aliases: [
    'santo andre', 'santo andré', 'figueiras', 'espaco figueiras', 'espaço figueiras', 'quintal do espeto santo andre', 'quintal do espeto santo andré', 'delivery santo andre', 'delivery santo andré',
  ] },
  { id: 'holding', label: 'Holding', custosLabel: 'Holding', turnoverLabel: 'Holding', aliases: [
    'holding',
  ] },
]

export const ALL_UNIT_IDS: UnitId[] = UNITS.map(u => u.id)

function normalize(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
}

// Resolve uma string de qualquer sistema (ex: "SANTO ANDRÉ", "Figueiras",
// "V. Mariana", "Moema Carinás") para o id canônico da unidade.
export function unitIdFromString(raw: string | null | undefined): UnitId | null {
  const n = normalize(raw || '')
  if (!n) return null
  // match exato contra os apelidos
  for (const u of UNITS) {
    if (u.aliases.some(a => normalize(a) === n)) return u.id
  }
  // match por substring (nomes de loja no ZIG/relatórios costumam vir com
  // prefixos como "Quintal do Espeto " ou "Delivery ")
  for (const u of UNITS) {
    if (u.aliases.some(a => n.includes(normalize(a)))) return u.id
  }
  return null
}

export function labelForUnit(id: UnitId): string {
  return UNITS.find(u => u.id === id)?.label ?? id
}

// Converte a permissão salva (ids canônicos, ou '*') na lista de rótulos
// "bonitos" (labels de exibição) — usado no painel /hub/admin.
export function allowedLabels(allowed: UnitId[] | '*'): string[] | '*' {
  if (allowed === '*') return '*'
  return UNITS.filter(u => allowed.includes(u.id)).map(u => u.label)
}

// Mesma ideia, mas devolvendo a grafia EXATA usada por um sistema
// específico — necessário pra comparar/selecionar com precisão nos
// filtros de cada dashboard (cada um nomeia as lojas de um jeito).
export function allowedNativeLabels(
  allowed: UnitId[] | '*',
  system: 'custosLabel' | 'turnoverLabel' | 'zigLabel' | 'comercialId'
): string[] | '*' {
  if (allowed === '*') return '*'
  return UNITS.filter(u => allowed.includes(u.id))
    .map(u => u[system])
    .filter((v): v is string => Boolean(v))
}

// Verifica se o valor de "loja"/"unidade" de uma linha de dado está
// dentro da permissão do usuário. Fecha por padrão (fail-closed): se a
// unidade da linha não for reconhecida, a linha é ocultada — evita
// vazar dados de uma unidade nova/mal digitada que ainda não tenha
// entrado no registro de aliases acima.
export function isUnitAllowed(raw: string | null | undefined, allowed: UnitId[] | '*'): boolean {
  if (allowed === '*') return true
  if (allowed.length === 0) return false
  const id = unitIdFromString(raw)
  if (!id) return false
  return allowed.includes(id)
}

// Filtra um array de linhas por um campo que contenha o nome da loja.
export function filterRowsByUnit<T extends Record<string, any>>(
  rows: T[],
  field: string,
  allowed: UnitId[] | '*'
): T[] {
  if (allowed === '*') return rows
  return rows.filter(r => isUnitAllowed(r[field], allowed))
}
