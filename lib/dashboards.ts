export type Dashboard = {
  id: string
  name: string
  description: string
  url: string
  internalPath?: string
  color: string
  icon: string
}

export const DASHBOARDS: Dashboard[] = [
  { id: 'faturamento', name: 'Faturamento', description: 'Acompanhamento de receitas e faturamento', url: 'https://faturamento-quintal.vercel.app', internalPath: '/hub/faturamento', color: '#97A624', icon: '📈' },
  { id: 'custos', name: 'Custos', description: 'Controle e análise de custos operacionais', url: 'https://dashboardcustos.vercel.app', internalPath: '/hub/custos', color: '#D9B504', icon: '💰' },
  { id: 'cmv', name: 'CMV', description: 'Custo da mercadoria vendida', url: 'https://cmv-quintal.vercel.app', internalPath: '/hub/cmv', color: '#8C1414', icon: '🏪' },
  { id: 'turnover', name: 'Turnover & Headcount', description: 'Gestão de pessoas, turnover e custos com RH', url: 'https://turnovereheadcount.vercel.app', internalPath: '/hub/turnover', color: '#6366f1', icon: '👥' },
  { id: 'comercial', name: 'Comercial & Eventos', description: 'Funil de eventos B2B, calendário e deals', url: '', internalPath: '/hub/comercial', color: '#0ea5e9', icon: '🤝' },
  { id: 'relatorios', name: 'Relatório de Descontos', description: 'Descontos, estornos, contas em aberto e bônus', url: '', internalPath: '/hub/relatorios', color: '#EA580C', icon: '🧾' },
  { id: 'financeiro', name: 'Financeiro — Saldo de Bancos', description: 'Saldo bancário, aplicações e recebíveis por unidade', url: '', internalPath: '/hub/financeiro', color: '#0369A1', icon: '🏦' },
  { id: 'promocoes', name: 'Promoções', description: 'Dashboard mensal de promoções/pacotes + simulador de CMV', url: '', internalPath: '/hub/promocoes', color: '#9A3412', icon: '🔥' },
  { id: 'kids', name: 'Kids', description: 'Crianças, Combo Quintal Feliz, shows e infláveis', url: '', internalPath: '/hub/kids', color: '#DB2777', icon: '🎈' },
  { id: 'metas', name: 'Metas Regionais', description: 'Acompanhamento de metas por unidade — gerentes regionais', url: '', internalPath: '/hub/metas', color: '#7C3AED', icon: '🎯' },
  { id: 'bonus', name: 'Meta de Bônus', description: 'Acompanhamento da meta coletiva de bônus (CMV, Custo c/ Pessoal, LOL, NPS)', url: '', internalPath: '/hub/bonus', color: '#97A624', icon: '🏆' },
  { id: 'vendas', name: 'Vendas por Produto', description: 'Vendas diárias ZIG por produto, SKU, loja e canal', url: '', internalPath: '/hub/vendas', color: '#15803D', icon: '🍢' },
  { id: 'gorjeta', name: 'Gorjeta', description: 'Distribuição de gorjeta por unidade — Adiantamento e Mensal', url: '', internalPath: '/hub/gorjeta', color: '#97A624', icon: '💰' },
  { id: 'reservas', name: 'Reservas', description: 'Meta do time de reservas, reservas por dia, operadoras e agenda das casas', url: '', internalPath: '/hub/reservas', color: '#0F766E', icon: '📅' },
]

// Sub-permissões: não são dashboards próprios (não aparecem como card no
// HUB principal) — são liberações extras DENTRO de um dashboard que já
// existe. O toggle só aparece na tela de admin quando o dashboard "pai"
// (parentId) já está marcado pra aquela pessoa.
export type SubPermission = { id: string; parentId: string; name: string; color: string }
export const SUB_PERMISSIONS: SubPermission[] = [
  { id: 'comercial-vendedores', parentId: 'comercial', name: 'Vendedores (comissão)', color: '#7d5ac9' },
]

export const USER_PERMISSIONS: Record<string, string[] | '*'> = {
  'amanda.pamplona@quintaldoespeto.com.br':    '*',
  'cintia.araujo@quintaldoespeto.com.br':      ['faturamento', 'custos'],
  'fabio.duarte@quintaldoespeto.com.br':       ['faturamento', 'custos', 'cmv'],
  'fernanda.pypcak@quintaldoespeto.com.br':    '*',
  'fernando.crescencio@quintaldoespeto.com.br':['faturamento', 'custos', 'cmv'],
  'alan.batessoco@quintaldoespeto.com.br':     ['faturamento', 'custos', 'cmv'],
  'leandro.calixto@quintaldoespeto.com.br':    ['faturamento', 'custos', 'cmv'],
  'pedro.mott@quintaldoespeto.com.br':         '*',
  'rayara.mundario@quintaldoespeto.com.br':    ['faturamento', 'custos', 'cmv'],
  'rogerio.palermo@quintaldoespeto.com.br':    '*',
  'isabella.coury@quintaldoespeto.com.br':     '*',
  'raiani.kids@quintaldoespeto.com.br':        ['faturamento', 'custos', 'kids'],
  'carlos.chinen@quintaldoespeto.com.br':      ['faturamento', 'custos'],
  'leandro.melo@quintaldoespeto.com.br':       ['faturamento', 'custos'],
}

export const DEFAULT_PERMISSION: string[] | '*' = []

export const ADMIN_USERS: string[] = [
  'fernanda.pypcak@quintaldoespeto.com.br',
]
