import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import GorjetaClientApp from './ClientApp'

export default async function GorjetaPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'gorjeta')) redirect('/hub')

  return <GorjetaClientApp allowedLojas={access.lojas} usuario={access.email} isAdmin={access.isAdmin} />
}
