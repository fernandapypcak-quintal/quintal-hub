import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import ReservasClientApp from './ClientApp'

export default async function ReservasPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'reservas')) redirect('/hub')

  return <ReservasClientApp />
}
