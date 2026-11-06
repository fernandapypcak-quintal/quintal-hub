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

  // Página Metas (3 faixas, grava na planilha): permissão 'comercial-metas' no admin do hub
  const podeEditarMetas = access.isAdmin || hasDashboardAccess(access, 'comercial-metas')

  return <ComercialClientApp allowedLojas={access.lojas} podeVerVendedores={podeVerVendedores} podeEditarMetas={podeEditarMetas} />
}
