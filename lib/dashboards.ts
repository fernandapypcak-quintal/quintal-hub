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

// Permissões: mapeie o email do usuário para IDs de dashboards
// Use '*' para acesso total
export const USER_PERMISSIONS: Record<string, string[] | '*'> = {
  // Exemplos — edite conforme necessário:
  // 'admin@quintal.com': '*',
  // 'gerente@quintal.com': ['faturamento', 'custos', 'cmv'],
  // 'operador@quintal.com': ['cmv'],
}

// Permissão padrão para usuários não listados
export const DEFAULT_PERMISSION: string[] | '*' = []
