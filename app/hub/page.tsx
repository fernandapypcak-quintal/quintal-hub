import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { DASHBOARDS, ADMIN_USERS } from '@/lib/dashboards'
import HubClient from './HubClient'

export default async function HubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email ?? ''

  // Busca permissões do Supabase (fallback: sem acesso)
  let permissao: string[] | '*' = []
  try {
    const admin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await admin
      .from('user_permissions')
      .select('dashboards')
      .eq('email', email)
      .single()

    if (data?.dashboards?.includes('*')) {
      permissao = '*'
    } else if (data?.dashboards?.length) {
      permissao = data.dashboards
    }
  } catch {}

  const allowedDashboards = permissao === '*'
    ? DASHBOARDS
    : DASHBOARDS.filter(d => (permissao as string[]).includes(d.id))

  const isAdmin = ADMIN_USERS.includes(email)
  return <HubClient user={email} dashboards={allowedDashboards} isAdmin={isAdmin} />
}
