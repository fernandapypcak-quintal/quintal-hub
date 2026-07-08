// =============================================================
//  MOCK — Custo Variável
//  Categorias: CMV, Comissões, Embalagens, Mão de obra variável
// =============================================================

export const MOCK_CUSTOS_VARIAVEIS = [
  // ── Loja Centro ─────────────────────────────────────────────
  { id: 1,  categoria: 'CMV',                  subcategoria: 'Carnes / proteínas',       orcado: 32000, realizado: 34800, mes: '2025-03', loja: 'Loja Centro' },
  { id: 2,  categoria: 'CMV',                  subcategoria: 'Hortifruti',               orcado: 4200,  realizado: 3900,  mes: '2025-03', loja: 'Loja Centro' },
  { id: 3,  categoria: 'CMV',                  subcategoria: 'Bebidas',                  orcado: 8500,  realizado: 9200,  mes: '2025-03', loja: 'Loja Centro' },
  { id: 4,  categoria: 'CMV',                  subcategoria: 'Secos / temperos',         orcado: 2800,  realizado: 2650,  mes: '2025-03', loja: 'Loja Centro' },
  { id: 5,  categoria: 'Comissões',            subcategoria: 'Gorjeta garçons',          orcado: 3500,  realizado: 3800,  mes: '2025-03', loja: 'Loja Centro' },
  { id: 6,  categoria: 'Comissões',            subcategoria: 'Comissão delivery',        orcado: 1200,  realizado: 1450,  mes: '2025-03', loja: 'Loja Centro' },
  { id: 7,  categoria: 'Embalagens',           subcategoria: 'Embalagens delivery',      orcado: 1800,  realizado: 2100,  mes: '2025-03', loja: 'Loja Centro' },
  { id: 8,  categoria: 'Embalagens',           subcategoria: 'Descartáveis salão',       orcado: 600,   realizado: 580,   mes: '2025-03', loja: 'Loja Centro' },
  { id: 9,  categoria: 'Mão de obra variável', subcategoria: 'Horas extras',             orcado: 2000,  realizado: 2800,  mes: '2025-03', loja: 'Loja Centro' },
  { id: 10, categoria: 'Mão de obra variável', subcategoria: 'Freelancers / temporário', orcado: 1500,  realizado: 900,   mes: '2025-03', loja: 'Loja Centro' },

  // ── Loja Sul ────────────────────────────────────────────────
  { id: 11, categoria: 'CMV',                  subcategoria: 'Carnes / proteínas',       orcado: 26000, realizado: 27400, mes: '2025-03', loja: 'Loja Sul' },
  { id: 12, categoria: 'CMV',                  subcategoria: 'Hortifruti',               orcado: 3500,  realizado: 3200,  mes: '2025-03', loja: 'Loja Sul' },
  { id: 13, categoria: 'CMV',                  subcategoria: 'Bebidas',                  orcado: 6800,  realizado: 7100,  mes: '2025-03', loja: 'Loja Sul' },
  { id: 14, categoria: 'CMV',                  subcategoria: 'Secos / temperos',         orcado: 2200,  realizado: 2100,  mes: '2025-03', loja: 'Loja Sul' },
  { id: 15, categoria: 'Comissões',            subcategoria: 'Gorjeta garçons',          orcado: 2800,  realizado: 2950,  mes: '2025-03', loja: 'Loja Sul' },
  { id: 16, categoria: 'Comissões',            subcategoria: 'Comissão delivery',        orcado: 900,   realizado: 1100,  mes: '2025-03', loja: 'Loja Sul' },
  { id: 17, categoria: 'Embalagens',           subcategoria: 'Embalagens delivery',      orcado: 1400,  realizado: 1600,  mes: '2025-03', loja: 'Loja Sul' },
  { id: 18, categoria: 'Embalagens',           subcategoria: 'Descartáveis salão',       orcado: 500,   realizado: 490,   mes: '2025-03', loja: 'Loja Sul' },
  { id: 19, categoria: 'Mão de obra variável', subcategoria: 'Horas extras',             orcado: 1500,  realizado: 1900,  mes: '2025-03', loja: 'Loja Sul' },
  { id: 20, categoria: 'Mão de obra variável', subcategoria: 'Freelancers / temporário', orcado: 1000,  realizado: 600,   mes: '2025-03', loja: 'Loja Sul' },

  // ── Loja Norte ──────────────────────────────────────────────
  { id: 21, categoria: 'CMV',                  subcategoria: 'Carnes / proteínas',       orcado: 29000, realizado: 30500, mes: '2025-03', loja: 'Loja Norte' },
  { id: 22, categoria: 'CMV',                  subcategoria: 'Hortifruti',               orcado: 3800,  realizado: 3600,  mes: '2025-03', loja: 'Loja Norte' },
  { id: 23, categoria: 'CMV',                  subcategoria: 'Bebidas',                  orcado: 7500,  realizado: 8100,  mes: '2025-03', loja: 'Loja Norte' },
  { id: 24, categoria: 'CMV',                  subcategoria: 'Secos / temperos',         orcado: 2500,  realizado: 2400,  mes: '2025-03', loja: 'Loja Norte' },
  { id: 25, categoria: 'Comissões',            subcategoria: 'Gorjeta garçons',          orcado: 3100,  realizado: 3400,  mes: '2025-03', loja: 'Loja Norte' },
  { id: 26, categoria: 'Comissões',            subcategoria: 'Comissão delivery',        orcado: 1100,  realizado: 1380,  mes: '2025-03', loja: 'Loja Norte' },
  { id: 27, categoria: 'Embalagens',           subcategoria: 'Embalagens delivery',      orcado: 1600,  realizado: 1950,  mes: '2025-03', loja: 'Loja Norte' },
  { id: 28, categoria: 'Embalagens',           subcategoria: 'Descartáveis salão',       orcado: 550,   realizado: 530,   mes: '2025-03', loja: 'Loja Norte' },
  { id: 29, categoria: 'Mão de obra variável', subcategoria: 'Horas extras',             orcado: 1800,  realizado: 2400,  mes: '2025-03', loja: 'Loja Norte' },
  { id: 30, categoria: 'Mão de obra variável', subcategoria: 'Freelancers / temporário', orcado: 1200,  realizado: 700,   mes: '2025-03', loja: 'Loja Norte' },
]

export const MOCK_HISTORICO_VARIAVEL = [
  { mes: 'Out/24', loja: 'Loja Centro', total_realizado: 55200, total_orcado: 52000 },
  { mes: 'Nov/24', loja: 'Loja Centro', total_realizado: 58400, total_orcado: 54000 },
  { mes: 'Dez/24', loja: 'Loja Centro', total_realizado: 67800, total_orcado: 62000 },
  { mes: 'Jan/25', loja: 'Loja Centro', total_realizado: 54100, total_orcado: 52000 },
  { mes: 'Fev/25', loja: 'Loja Centro', total_realizado: 52800, total_orcado: 52000 },
  { mes: 'Mar/25', loja: 'Loja Centro', total_realizado: 62180, total_orcado: 58100 },

  { mes: 'Out/24', loja: 'Loja Sul',    total_realizado: 43100, total_orcado: 41000 },
  { mes: 'Nov/24', loja: 'Loja Sul',    total_realizado: 45600, total_orcado: 43000 },
  { mes: 'Dez/24', loja: 'Loja Sul',    total_realizado: 52200, total_orcado: 48000 },
  { mes: 'Jan/25', loja: 'Loja Sul',    total_realizado: 42800, total_orcado: 41000 },
  { mes: 'Fev/25', loja: 'Loja Sul',    total_realizado: 41500, total_orcado: 41000 },
  { mes: 'Mar/25', loja: 'Loja Sul',    total_realizado: 48440, total_orcado: 46200 },

  { mes: 'Out/24', loja: 'Loja Norte',  total_realizado: 48500, total_orcado: 46000 },
  { mes: 'Nov/24', loja: 'Loja Norte',  total_realizado: 51200, total_orcado: 48000 },
  { mes: 'Dez/24', loja: 'Loja Norte',  total_realizado: 59800, total_orcado: 54000 },
  { mes: 'Jan/25', loja: 'Loja Norte',  total_realizado: 47600, total_orcado: 46000 },
  { mes: 'Fev/25', loja: 'Loja Norte',  total_realizado: 46200, total_orcado: 46000 },
  { mes: 'Mar/25', loja: 'Loja Norte',  total_realizado: 56060, total_orcado: 52350 },
]

// =============================================================
//  HISTÓRICO POR CATEGORIA — Custo Variável (6 meses, por loja)
// =============================================================
export const MOCK_HISTORICO_CAT_VARIAVEL = [
  // Loja Centro
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'CMV',                  realizado: 43000 },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Comissões',             realizado: 4800  },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Embalagens',            realizado: 2300  },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Mão de obra variável',  realizado: 2800  },

  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'CMV',                  realizado: 46200 },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Comissões',             realizado: 5100  },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Embalagens',            realizado: 2500  },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Mão de obra variável',  realizado: 3100  },

  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'CMV',                  realizado: 54000 },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Comissões',             realizado: 6200  },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Embalagens',            realizado: 3100  },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Mão de obra variável',  realizado: 4800  },

  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'CMV',                  realizado: 42500 },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Comissões',             realizado: 4600  },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Embalagens',            realizado: 2200  },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Mão de obra variável',  realizado: 2400  },

  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'CMV',                  realizado: 41200 },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Comissões',             realizado: 4400  },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Embalagens',            realizado: 2100  },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Mão de obra variável',  realizado: 2200  },

  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'CMV',                  realizado: 50550 },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Comissões',             realizado: 5250  },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Embalagens',            realizado: 2680  },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Mão de obra variável',  realizado: 3700  },

  // Loja Sul
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'CMV',                  realizado: 32500 },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Comissões',             realizado: 3400  },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Embalagens',            realizado: 1700  },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Mão de obra variável',  realizado: 1900  },

  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'CMV',                  realizado: 39800 },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Comissões',             realizado: 4050  },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Embalagens',            realizado: 2090  },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Mão de obra variável',  realizado: 2500  },

  // Loja Norte
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'CMV',                  realizado: 36200 },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Comissões',             realizado: 3900  },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Embalagens',            realizado: 1900  },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Mão de obra variável',  realizado: 2100  },

  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'CMV',                  realizado: 44600 },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Comissões',             realizado: 4780  },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Embalagens',            realizado: 2480  },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Mão de obra variável',  realizado: 3100  },
]
