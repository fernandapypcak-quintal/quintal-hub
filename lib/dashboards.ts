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
  'raiani.kids@quintaldoespeto.com.br':        ['faturamento', 'custos'],
  'carlos.chinen@quintaldoespeto.com.br':      ['faturamento', 'custos'],
  'leandro.melo@quintaldoespeto.com.br':       ['faturamento', 'custos'],
}

export const DEFAULT_PERMISSION: string[] | '*' = []

export const ADMIN_USERS: string[] = [
  'fernanda.pypcak@quintaldoespeto.com.br',
]
