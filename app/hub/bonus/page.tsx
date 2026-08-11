import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import BonusClientApp from './ClientApp'

export default async function BonusPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'bonus')) redirect('/hub')

  return <BonusClientApp isAdmin={access.isAdmin} />
}
