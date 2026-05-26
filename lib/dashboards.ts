export type Dashboard = {
  id: string
  name: string
  description: string
  url: string
  color: string
  icon: string
}

export const DASHBOARDS: Dashboard[] = [
  {
    id: 'faturamento',
    name: 'Faturamento',
    description: 'Acompanhamento de receitas e faturamento',
    url: 'https://faturamento-quintal.vercel.app',
    color: '#22c55e',
    icon: '📈',
  },
  {
    id: 'custos',
    name: 'Custos',
    description: 'Controle e análise de custos operacionais',
    url: 'https://dashboardcustos.vercel.app',
    color: '#f59e0b',
    icon: '💰',
  },
  {
    id: 'cmv',
    name: 'CMV',
    description: 'Custo da mercadoria vendida',
    url: 'https://cmv-quintal.vercel.app',
    color: '#ef4444',
    icon: '🏪',
  },
]

export const USER_PERMISSIONS: Record<string, string[] | '*'> = {
  'amanda.pamplona@quintaldoespeto.com.br': '*',
  'cintia.araujo@quintaldoespeto.com.br': '*',
  'fabio.duarte@quintaldoespeto.com.br': '*',
  'fernanda.pypcak@quintaldoespeto.com.br': '*',
  'fernando.crescencio@quintaldoespeto.com.br': '*',
  'gabriel.dias@quintaldoespeto.com.br': '*',
  'leandro.calixto@quintaldoespeto.com.br': '*',
  'pedro.mott@quintaldoespeto.com.br': '*',
  'rayara.mundario@quintaldoespeto.com.br': '*',
  'rogerio.palermo@quintaldoespeto.com.br': '*',
  'secretaria@quintaldoespeto.com.br': '*',
}

export const DEFAULT_PERMISSION: string[] | '*' = []
