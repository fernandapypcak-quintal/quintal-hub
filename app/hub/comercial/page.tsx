import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import ComercialClientApp from './ClientApp'

export default async function ComercialPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'comercial')) redirect('/hub')

  return <ComercialClientApp allowedLojas={access.lojas} />
}
