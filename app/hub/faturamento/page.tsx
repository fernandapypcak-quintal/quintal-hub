import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import FaturamentoClientApp from './ClientApp'

export default async function FaturamentoPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'faturamento')) redirect('/hub')

  return <FaturamentoClientApp allowedLojas={access.lojas} />
}
