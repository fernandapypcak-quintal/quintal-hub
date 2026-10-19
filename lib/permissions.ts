// lib/permissions.ts
// =============================================================
//  QUINTAL HUB — Acesso do usuário logado (dashboards + unidades)
//  Fonte única usada tanto pela página /hub quanto pelas páginas
//  server-side de cada dashboard interno (custos, relatorios,
//  faturamento, cmv, turnover, comercial).
// =============================================================

import { createServerClient } from '@supabase/ssr'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { ADMIN_USERS } from './dashboards'
import { ALL_UNIT_IDS, type UnitId } from './units'

export type UserAccess = {
  email: string
  dashboards: string[] | '*'
  lojas: UnitId[] | '*'
  // Áreas (BUs) do dashboard de custos. '*' = dashboard completo;
  // lista = gestor de área, vê só a página "Minha área" dessas áreas.
  bus: string[] | '*'
  isAdmin: boolean
}

async function getSessionEmail(): Promise<string | null> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email ?? null
}

function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// Busca as permissões do usuário logado direto no Supabase.
// Retorna null se não houver sessão.
export async function getUserAccess(): Promise<UserAccess | null> {
  const email = await getSessionEmail()
  if (!email) return null

  let dashboards: string[] | '*' = []
  let lojas: UnitId[] | '*' = '*' // sem linha configurada ainda = mantém comportamento anterior (todas as unidades)
  let bus: string[] | '*' = '*'

  try {
    // Tenta ler a coluna "bus"; se ela ainda não existir (migration não
    // rodada), lê sem ela pra não derrubar o acesso de ninguém.
    let { data, error } = await getAdminClient()
      .from('user_permissions')
      .select('dashboards, lojas, bus')
      .eq('email', email)
      .single()
    if (error && /bus/i.test(error.message || '')) {
      ;({ data } = await getAdminClient()
        .from('user_permissions')
        .select('dashboards, lojas')
        .eq('email', email)
        .single() as any)
    }

    if (data?.dashboards?.includes('*')) dashboards = '*'
    else if (data?.dashboards?.length) dashboards = data.dashboards

    if (data?.lojas === undefined || data?.lojas === null) {
      // coluna nova ainda não preenchida pra esse usuário -> não restringe
      lojas = '*'
    } else if (Array.isArray(data.lojas) && data.lojas.includes('*')) {
      lojas = '*'
    } else if (Array.isArray(data.lojas)) {
      lojas = data.lojas.filter((id: string) => (ALL_UNIT_IDS as string[]).includes(id)) as UnitId[]
    }

    const rawBus = (data as any)?.bus
    if (Array.isArray(rawBus) && !rawBus.includes('*') && rawBus.length) {
      bus = rawBus.map((b: any) => String(b))
    }
  } catch {}

  return { email, dashboards, lojas, bus, isAdmin: ADMIN_USERS.includes(email) }
}

export function hasDashboardAccess(access: UserAccess, dashboardId: string): boolean {
  return access.dashboards === '*' || access.dashboards.includes(dashboardId)
}
