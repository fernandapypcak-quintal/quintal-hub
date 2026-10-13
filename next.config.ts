import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'standalone',
  // o Painel de Caixa & Forecast lê o template e o snapshot de lib/caixa-forecast em tempo de execução
  outputFileTracingIncludes: {
    '/api/caixa-forecast/painel': ['./lib/caixa-forecast/**/*'],
  },
  experimental: {
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
}

export default nextConfig
