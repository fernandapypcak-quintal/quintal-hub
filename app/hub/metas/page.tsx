import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import MetasClientApp from './ClientApp'

export default async function MetasPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'metas')) redirect('/hub')

  return <MetasClientApp allowedLojas={access.lojas} isAdmin={access.isAdmin} />
}
