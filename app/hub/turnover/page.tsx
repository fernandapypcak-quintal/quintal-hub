import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import TurnoverClientApp from './ClientApp'

export default async function TurnoverPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'turnover')) redirect('/hub')

  return <TurnoverClientApp allowedLojas={access.lojas} />
}
