import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import FluxoPagamentosClientApp from './ClientApp'

export default async function FluxoPagamentosPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  // quem já vê o Painel de Caixa & Forecast também vê o fluxo de pagamentos
  if (!hasDashboardAccess(access, 'fluxo-pagamentos') && !hasDashboardAccess(access, 'caixa-forecast')) redirect('/hub')

  return <FluxoPagamentosClientApp />
}
