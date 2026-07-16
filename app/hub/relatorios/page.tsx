import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import RelatoriosClientApp from './ClientApp'

export default async function RelatoriosPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'relatorios')) redirect('/hub')

  return <RelatoriosClientApp allowedLojas={access.lojas} />
}
