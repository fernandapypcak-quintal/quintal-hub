import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import PromocoesClientApp from './ClientApp'

export default async function PromocoesPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'promocoes')) redirect('/hub')

  return <PromocoesClientApp allowedLojas={access.lojas} />
}
