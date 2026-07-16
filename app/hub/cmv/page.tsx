import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import CMVClientApp from './ClientApp'

export default async function CMVPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'cmv')) redirect('/hub')

  return <CMVClientApp allowedLojas={access.lojas} />
}
