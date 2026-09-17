import { redirect } from 'next/navigation'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import ComercialClientApp from './ClientApp'

export default async function ComercialPage() {
  const access = await getUserAccess()
  if (!access) redirect('/login')
  if (!hasDashboardAccess(access, 'comercial')) redirect('/hub')

  // Página de Vendedores mostra comissão — acesso à parte, não é liberado
  // só por ter acesso ao dashboard Comercial. Pra liberar alguém: adiciona
  // 'comercial-vendedores' na coluna "dashboards" da linha dessa pessoa na
  // tabela user_permissions (Supabase), ou marca a pessoa como admin.
  const podeVerVendedores = access.isAdmin || hasDashboardAccess(access, 'comercial-vendedores')

  return <ComercialClientApp allowedLojas={access.lojas} podeVerVendedores={podeVerVendedores} />
}
