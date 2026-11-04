import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import MetasPorCasaClientApp from './ClientApp'

// Página própria (permissão separada do dashboard de Reservas): metas por casa,
// casas críticas e meta da supervisora.
export default async function ReservasMetasPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'reservas-metas')) redirect('/hub')

  return <MetasPorCasaClientApp />
}
