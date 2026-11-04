import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import ReservasClientApp from './ClientApp'

export default async function ReservasPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'reservas')) redirect('/hub')

  // Aba "Metas por casa": liberação à parte (sub-permissão 'reservas-metas' na tela de admin)
  const podeVerMetas = access.isAdmin || hasDashboardAccess(access, 'reservas-metas')

  return <ReservasClientApp podeVerMetas={podeVerMetas} />
}
