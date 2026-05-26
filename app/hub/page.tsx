import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DASHBOARDS, USER_PERMISSIONS, DEFAULT_PERMISSION } from '@/lib/dashboards'
import HubClient from './HubClient'

export default async function HubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const email = user.email ?? ''
  const permissions = USER_PERMISSIONS[email] ?? DEFAULT_PERMISSION
  const allowedDashboards = permissions === '*'
    ? DASHBOARDS
    : DASHBOARDS.filter(d => (permissions as string[]).includes(d.id))

  return <HubClient user={email} dashboards={allowedDashboards} />
}
