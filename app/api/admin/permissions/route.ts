// app/api/admin/permissions/route.ts
// Lê e salva permissões na tabela user_permissions do Supabase

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { DASHBOARDS, ADMIN_USERS } from '@/lib/dashboards'

async function getSessionUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — retorna permissões da tabela + lista de dashboards
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.email || !ADMIN_USERS.includes(user.email)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const { data, error } = await getAdminClient()
    .from('user_permissions')
    .select('email, dashboards, is_admin')

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  // Converte para o formato USER_PERMISSIONS
  const permissions: Record<string, string[] | '*'> = {}
  for (const row of data || []) {
    permissions[row.email] = row.dashboards?.includes('*') ? '*' : (row.dashboards || [])
  }

  return NextResponse.json({
    permissions,
    dashboards: DASHBOARDS.map(d => ({ id: d.id, name: d.name, color: d.color })),
  })
}

// POST — salva permissões de um usuário
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user?.email || !ADMIN_USERS.includes(user.email)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()
  const { email, permissao, isAdmin } = body

  if (!email) return NextResponse.json({ erro: 'Email obrigatório' }, { status: 400 })

  const dashboards = permissao === '*' ? ['*'] : (permissao || [])

  const { error } = await getAdminClient()
    .from('user_permissions')
    .upsert({
      email,
      dashboards,
      is_admin: isAdmin ?? false,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
