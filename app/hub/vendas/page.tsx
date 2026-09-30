import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import VendasClientApp from './ClientApp'

export default async function VendasPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'vendas')) redirect('/hub')

  return <VendasClientApp />
}
