import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import VendasClient from './VendasClient'

export default async function VendasPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'vendas')) redirect('/hub')
  return <VendasClient />
}
