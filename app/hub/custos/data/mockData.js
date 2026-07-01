// =============================================================
//  MOCK DATA — substitua pela integração com Apps Script
//  Estrutura idêntica ao retorno esperado do doGet
// =============================================================

export const MOCK_CONTAS = [
  // Loja Centro
  { id: 1, nome: 'Aluguel Março', fornecedor: 'Imob. Paulista', valor: 8500, vencimento: '2025-03-05', status: 'vencido', categoria: 'Aluguel', centro: 'Loja Centro', observacao: 'Reajuste pendente de negociação' },
  { id: 2, nome: 'Conta de Energia Fev', fornecedor: 'Enel', valor: 3200, vencimento: '2025-03-10', status: 'vencido', categoria: 'Energia', centro: 'Loja Centro', observacao: '' },
  { id: 3, nome: 'Conta de Água Mar', fornecedor: 'SABESP', valor: 680, vencimento: '2025-03-18', status: 'pendente', categoria: 'Água', centro: 'Loja Centro', observacao: '' },
  { id: 4, nome: 'Folha Março', fornecedor: 'RH Interno', valor: 28000, vencimento: '2025-03-05', status: 'pago', categoria: 'Folha', centro: 'Loja Centro', observacao: 'Incluindo 13º proporcional' },
  { id: 5, nome: 'Software PDV', fornecedor: 'TOTVS', valor: 890, vencimento: '2025-03-15', status: 'pendente', categoria: 'Software', centro: 'Loja Centro', observacao: '' },
  { id: 6, nome: 'Marketing Digital', fornecedor: 'Agência W', valor: 2400, vencimento: '2025-03-20', status: 'pendente', categoria: 'Marketing', centro: 'Loja Centro', observacao: 'Instagram + Google Ads' },
  { id: 7, nome: 'Manutenção Equipamentos', fornecedor: 'TecnoFix', valor: 1200, vencimento: '2025-03-22', status: 'pendente', categoria: 'Manutenção', centro: 'Loja Centro', observacao: '' },
  { id: 8, nome: 'Contador', fornecedor: 'Escritório ABC', valor: 1500, vencimento: '2025-03-28', status: 'pendente', categoria: 'Contador', centro: 'Loja Centro', observacao: '' },
  { id: 9, nome: 'Pró-labore Sócios', fornecedor: 'Interno', valor: 12000, vencimento: '2025-03-05', status: 'pago', categoria: 'Pró-labore', centro: 'Loja Centro', observacao: '' },
  { id: 10, nome: 'Seguro Loja', fornecedor: 'Porto Seguro', valor: 420, vencimento: '2025-03-30', status: 'pendente', categoria: 'Outros', centro: 'Loja Centro', observacao: '' },
  // Loja Sul
  { id: 11, nome: 'Aluguel Março', fornecedor: 'Fundo Imob. XP', valor: 6200, vencimento: '2025-03-05', status: 'vencido', categoria: 'Aluguel', centro: 'Loja Sul', observacao: '' },
  { id: 12, nome: 'Conta de Energia Fev', fornecedor: 'Enel', valor: 2800, vencimento: '2025-03-10', status: 'pago', categoria: 'Energia', centro: 'Loja Sul', observacao: '' },
  { id: 13, nome: 'Folha Março', fornecedor: 'RH Interno', valor: 22000, vencimento: '2025-03-05', status: 'pago', categoria: 'Folha', centro: 'Loja Sul', observacao: '' },
  { id: 14, nome: 'Software PDV', fornecedor: 'TOTVS', valor: 890, vencimento: '2025-03-15', status: 'pendente', categoria: 'Software', centro: 'Loja Sul', observacao: '' },
  { id: 15, nome: 'Marketing Digital', fornecedor: 'Agência W', valor: 1800, vencimento: '2025-03-20', status: 'pendente', categoria: 'Marketing', centro: 'Loja Sul', observacao: '' },
  { id: 16, nome: 'Conta de Água Mar', fornecedor: 'SABESP', valor: 510, vencimento: '2025-03-18', status: 'pendente', categoria: 'Água', centro: 'Loja Sul', observacao: '' },
  { id: 17, nome: 'Manutenção Câmara Fria', fornecedor: 'FrioCerta', valor: 780, vencimento: '2025-03-25', status: 'pendente', categoria: 'Manutenção', centro: 'Loja Sul', observacao: 'Revisão semestral' },
  { id: 18, nome: 'Contador', fornecedor: 'Escritório ABC', valor: 1500, vencimento: '2025-03-28', status: 'pendente', categoria: 'Contador', centro: 'Loja Sul', observacao: '' },
  // Loja Norte
  { id: 19, nome: 'Aluguel Março', fornecedor: 'Construtora Nova Era', valor: 7100, vencimento: '2025-03-05', status: 'pago', categoria: 'Aluguel', centro: 'Loja Norte', observacao: '' },
  { id: 20, nome: 'Conta de Energia Fev', fornecedor: 'Enel', valor: 2950, vencimento: '2025-03-10', status: 'vencido', categoria: 'Energia', centro: 'Loja Norte', observacao: 'Aguardando 2ª via' },
  { id: 21, nome: 'Folha Março', fornecedor: 'RH Interno', valor: 25000, vencimento: '2025-03-05', status: 'pago', categoria: 'Folha', centro: 'Loja Norte', observacao: '' },
  { id: 22, nome: 'Software PDV', fornecedor: 'TOTVS', valor: 890, vencimento: '2025-03-15', status: 'pendente', categoria: 'Software', centro: 'Loja Norte', observacao: '' },
  { id: 23, nome: 'Conta de Água Mar', fornecedor: 'SABESP', valor: 590, vencimento: '2025-03-18', status: 'pendente', categoria: 'Água', centro: 'Loja Norte', observacao: '' },
  { id: 24, nome: 'Manutenção Ar-condicionado', fornecedor: 'ClimaBH', valor: 950, vencimento: '2025-03-22', status: 'pendente', categoria: 'Manutenção', centro: 'Loja Norte', observacao: 'Limpeza filtros' },
  { id: 25, nome: 'Marketing Digital', fornecedor: 'Agência W', valor: 2100, vencimento: '2025-03-20', status: 'pendente', categoria: 'Marketing', centro: 'Loja Norte', observacao: '' },
  { id: 26, nome: 'Contador', fornecedor: 'Escritório ABC', valor: 1500, vencimento: '2025-03-28', status: 'pendente', categoria: 'Contador', centro: 'Loja Norte', observacao: '' },
  { id: 27, nome: 'Seguro Loja', fornecedor: 'Porto Seguro', valor: 380, vencimento: '2025-03-30', status: 'pendente', categoria: 'Outros', centro: 'Loja Norte', observacao: '' },
  { id: 28, nome: 'Licença App Delivery', fornecedor: 'iFood', valor: 1200, vencimento: '2025-03-15', status: 'pago', categoria: 'Software', centro: 'Loja Norte', observacao: '' },
]

export const MOCK_CUSTOS_FIXOS = [
  // Loja Centro
  { id: 1, categoria: 'Aluguel', subcategoria: 'Ponto comercial', orcado: 8500, realizado: 8500, mes: '2025-03', loja: 'Loja Centro' },
  { id: 2, categoria: 'Energia', subcategoria: 'Energia elétrica', orcado: 3000, realizado: 3200, mes: '2025-03', loja: 'Loja Centro' },
  { id: 3, categoria: 'Água', subcategoria: 'Água e esgoto', orcado: 700, realizado: 680, mes: '2025-03', loja: 'Loja Centro' },
  { id: 4, categoria: 'Folha', subcategoria: 'Salários CLT', orcado: 26000, realizado: 28000, mes: '2025-03', loja: 'Loja Centro' },
  { id: 5, categoria: 'Pró-labore', subcategoria: 'Retirada sócios', orcado: 12000, realizado: 12000, mes: '2025-03', loja: 'Loja Centro' },
  { id: 6, categoria: 'Contador', subcategoria: 'Serviços contábeis', orcado: 1500, realizado: 1500, mes: '2025-03', loja: 'Loja Centro' },
  { id: 7, categoria: 'Software', subcategoria: 'PDV + gestão', orcado: 890, realizado: 890, mes: '2025-03', loja: 'Loja Centro' },
  { id: 8, categoria: 'Marketing', subcategoria: 'Digital', orcado: 2000, realizado: 2400, mes: '2025-03', loja: 'Loja Centro' },
  { id: 9, categoria: 'Manutenção', subcategoria: 'Equipamentos', orcado: 800, realizado: 1200, mes: '2025-03', loja: 'Loja Centro' },
  { id: 10, categoria: 'Outros', subcategoria: 'Seguro + diversos', orcado: 600, realizado: 420, mes: '2025-03', loja: 'Loja Centro' },
  // Loja Sul
  { id: 11, categoria: 'Aluguel', subcategoria: 'Ponto comercial', orcado: 6200, realizado: 6200, mes: '2025-03', loja: 'Loja Sul' },
  { id: 12, categoria: 'Energia', subcategoria: 'Energia elétrica', orcado: 3000, realizado: 2800, mes: '2025-03', loja: 'Loja Sul' },
  { id: 13, categoria: 'Água', subcategoria: 'Água e esgoto', orcado: 550, realizado: 510, mes: '2025-03', loja: 'Loja Sul' },
  { id: 14, categoria: 'Folha', subcategoria: 'Salários CLT', orcado: 22000, realizado: 22000, mes: '2025-03', loja: 'Loja Sul' },
  { id: 15, categoria: 'Contador', subcategoria: 'Serviços contábeis', orcado: 1500, realizado: 1500, mes: '2025-03', loja: 'Loja Sul' },
  { id: 16, categoria: 'Software', subcategoria: 'PDV + gestão', orcado: 890, realizado: 890, mes: '2025-03', loja: 'Loja Sul' },
  { id: 17, categoria: 'Marketing', subcategoria: 'Digital', orcado: 2000, realizado: 1800, mes: '2025-03', loja: 'Loja Sul' },
  { id: 18, categoria: 'Manutenção', subcategoria: 'Câmara fria', orcado: 500, realizado: 780, mes: '2025-03', loja: 'Loja Sul' },
  // Loja Norte
  { id: 19, categoria: 'Aluguel', subcategoria: 'Ponto comercial', orcado: 7100, realizado: 7100, mes: '2025-03', loja: 'Loja Norte' },
  { id: 20, categoria: 'Energia', subcategoria: 'Energia elétrica', orcado: 3000, realizado: 2950, mes: '2025-03', loja: 'Loja Norte' },
  { id: 21, categoria: 'Água', subcategoria: 'Água e esgoto', orcado: 600, realizado: 590, mes: '2025-03', loja: 'Loja Norte' },
  { id: 22, categoria: 'Folha', subcategoria: 'Salários CLT', orcado: 24000, realizado: 25000, mes: '2025-03', loja: 'Loja Norte' },
  { id: 23, categoria: 'Contador', subcategoria: 'Serviços contábeis', orcado: 1500, realizado: 1500, mes: '2025-03', loja: 'Loja Norte' },
  { id: 24, categoria: 'Software', subcategoria: 'PDV + gestão + delivery', orcado: 1500, realizado: 2090, mes: '2025-03', loja: 'Loja Norte' },
  { id: 25, categoria: 'Marketing', subcategoria: 'Digital', orcado: 2000, realizado: 2100, mes: '2025-03', loja: 'Loja Norte' },
  { id: 26, categoria: 'Manutenção', subcategoria: 'Ar-condicionado', orcado: 500, realizado: 950, mes: '2025-03', loja: 'Loja Norte' },
  { id: 27, categoria: 'Outros', subcategoria: 'Seguro', orcado: 400, realizado: 380, mes: '2025-03', loja: 'Loja Norte' },
]

// Histórico 6 meses para gráficos de evolução
export const MOCK_HISTORICO = [
  { mes: 'Out/24', loja: 'Loja Centro', total_realizado: 54200, total_orcado: 52000 },
  { mes: 'Nov/24', loja: 'Loja Centro', total_realizado: 56800, total_orcado: 52000 },
  { mes: 'Dez/24', loja: 'Loja Centro', total_realizado: 61200, total_orcado: 55000 },
  { mes: 'Jan/25', loja: 'Loja Centro', total_realizado: 55400, total_orcado: 52000 },
  { mes: 'Fev/25', loja: 'Loja Centro', total_realizado: 53100, total_orcado: 52000 },
  { mes: 'Mar/25', loja: 'Loja Centro', total_realizado: 58290, total_orcado: 55990 },

  { mes: 'Out/24', loja: 'Loja Sul', total_realizado: 37500, total_orcado: 36000 },
  { mes: 'Nov/24', loja: 'Loja Sul', total_realizado: 39200, total_orcado: 36000 },
  { mes: 'Dez/24', loja: 'Loja Sul', total_realizado: 42100, total_orcado: 38000 },
  { mes: 'Jan/25', loja: 'Loja Sul', total_realizado: 37800, total_orcado: 36000 },
  { mes: 'Fev/25', loja: 'Loja Sul', total_realizado: 36500, total_orcado: 36000 },
  { mes: 'Mar/25', loja: 'Loja Sul', total_realizado: 36480, total_orcado: 36640 },

  { mes: 'Out/24', loja: 'Loja Norte', total_realizado: 41000, total_orcado: 40000 },
  { mes: 'Nov/24', loja: 'Loja Norte', total_realizado: 43500, total_orcado: 40000 },
  { mes: 'Dez/24', loja: 'Loja Norte', total_realizado: 47800, total_orcado: 43000 },
  { mes: 'Jan/25', loja: 'Loja Norte', total_realizado: 40200, total_orcado: 40000 },
  { mes: 'Fev/25', loja: 'Loja Norte', total_realizado: 39800, total_orcado: 40000 },
  { mes: 'Mar/25', loja: 'Loja Norte', total_realizado: 42660, total_orcado: 40600 },
]

// =============================================================
//  HISTÓRICO POR CATEGORIA — Custo Fixo (6 meses, por loja)
//  Estrutura: { mes, loja, categoria, realizado }
// =============================================================
export const MOCK_HISTORICO_CAT_FIXO = [
  // Loja Centro
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Aluguel',    realizado: 8500  },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Energia',    realizado: 2800  },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Folha',      realizado: 25000 },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Marketing',  realizado: 1800  },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Manutenção', realizado: 600   },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Software',   realizado: 890   },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Contador',   realizado: 1500  },
  { mes: 'Out/24', loja: 'Loja Centro', categoria: 'Outros',     realizado: 420   },

  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Aluguel',    realizado: 8500  },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Energia',    realizado: 3100  },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Folha',      realizado: 26500 },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Marketing',  realizado: 2200  },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Manutenção', realizado: 900   },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Software',   realizado: 890   },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Contador',   realizado: 1500  },
  { mes: 'Nov/24', loja: 'Loja Centro', categoria: 'Outros',     realizado: 420   },

  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Aluguel',    realizado: 8500  },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Energia',    realizado: 3800  },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Folha',      realizado: 31000 },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Marketing',  realizado: 3200  },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Manutenção', realizado: 1400  },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Software',   realizado: 890   },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Contador',   realizado: 1500  },
  { mes: 'Dez/24', loja: 'Loja Centro', categoria: 'Outros',     realizado: 420   },

  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Aluguel',    realizado: 8500  },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Energia',    realizado: 2900  },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Folha',      realizado: 26000 },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Marketing',  realizado: 2000  },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Manutenção', realizado: 500   },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Software',   realizado: 890   },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Contador',   realizado: 1500  },
  { mes: 'Jan/25', loja: 'Loja Centro', categoria: 'Outros',     realizado: 420   },

  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Aluguel',    realizado: 8500  },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Energia',    realizado: 2750  },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Folha',      realizado: 25800 },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Marketing',  realizado: 2000  },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Manutenção', realizado: 650   },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Software',   realizado: 890   },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Contador',   realizado: 1500  },
  { mes: 'Fev/25', loja: 'Loja Centro', categoria: 'Outros',     realizado: 420   },

  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Aluguel',    realizado: 8500  },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Energia',    realizado: 3200  },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Folha',      realizado: 28000 },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Marketing',  realizado: 2400  },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Manutenção', realizado: 1200  },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Software',   realizado: 890   },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Contador',   realizado: 1500  },
  { mes: 'Mar/25', loja: 'Loja Centro', categoria: 'Outros',     realizado: 420   },

  // Loja Sul
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Aluguel',    realizado: 6200  },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Energia',    realizado: 2600  },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Folha',      realizado: 21000 },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Marketing',  realizado: 1700  },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Manutenção', realizado: 400   },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Software',   realizado: 890   },
  { mes: 'Fev/25', loja: 'Loja Sul', categoria: 'Contador',   realizado: 1500  },

  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Aluguel',    realizado: 6200  },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Energia',    realizado: 2800  },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Folha',      realizado: 22000 },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Marketing',  realizado: 1800  },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Manutenção', realizado: 780   },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Software',   realizado: 890   },
  { mes: 'Mar/25', loja: 'Loja Sul', categoria: 'Contador',   realizado: 1500  },

  // Loja Norte
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Aluguel',    realizado: 7100  },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Energia',    realizado: 2800  },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Folha',      realizado: 23000 },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Marketing',  realizado: 1900  },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Manutenção', realizado: 300   },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Software',   realizado: 1500  },
  { mes: 'Fev/25', loja: 'Loja Norte', categoria: 'Contador',   realizado: 1500  },

  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Aluguel',    realizado: 7100  },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Energia',    realizado: 2950  },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Folha',      realizado: 25000 },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Marketing',  realizado: 2100  },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Manutenção', realizado: 950   },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Software',   realizado: 2090  },
  { mes: 'Mar/25', loja: 'Loja Norte', categoria: 'Contador',   realizado: 1500  },
]
