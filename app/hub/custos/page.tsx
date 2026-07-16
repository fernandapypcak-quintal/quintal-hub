import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import CustosClientApp from './ClientApp'

export default async function CustosPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'custos')) redirect('/hub')

  return <CustosClientApp allowedLojas={access.lojas} />
}
