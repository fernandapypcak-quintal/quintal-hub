import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import KidsClientApp from './ClientApp'

export default async function KidsPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'kids')) redirect('/hub')

  return <KidsClientApp allowedLojas={access.lojas} />
}
