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

// Unidades que efetivamente servem almoço (Casa, seg-sex). Usado pra
// corrigir registros do Zig que caem em "Almoço" só por causa do
// horário do lançamento (11h-15h), mesmo em lojas que não têm esse
// serviço — ex: lançamento atrasado/ajuste manual em Santo André.
export const SERVE_ALMOCO: UnitId[] = [
  'carinas', 'vila_mariana', 'lapa', 'perdizes',
