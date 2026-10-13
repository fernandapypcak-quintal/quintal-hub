import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import CaixaForecastClientApp from './ClientApp'

export default async function CaixaForecastPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'caixa-forecast')) redirect('/hub')

  return <CaixaForecastClientApp />
}
