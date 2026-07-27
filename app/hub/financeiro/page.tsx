import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import FinanceiroClientApp from './ClientApp'

export default async function FinanceiroPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'financeiro')) redirect('/hub')

  return <FinanceiroClientApp allowedLojas={access.lojas} isAdmin={access.isAdmin} />
}
