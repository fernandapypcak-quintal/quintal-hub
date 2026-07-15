// app/api/admin/users/route.ts
// Gerenciamento de usuários via Supabase Admin API
// Só acessível por usuários com permissão '*'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { USER_PERMISSIONS, ADMIN_USERS } from '@/lib/dashboards'

// Verifica se o usuário logado tem permissão de admin
async function isAdmin(req: NextRequest): Promise<boolean> {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return false
  return ADMIN_USERS.includes(user.email)
}

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// GET — lista todos os usuários
export async function GET(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const { data, error } = await getAdminClient().auth.admin.listUsers()
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  const users = data.users.map(u => ({
    id:          u.id,
    email:       u.email || '',
    created_at:  u.created_at,
    last_sign_in: u.last_sign_in_at || null,
    permissao:   USER_PERMISSIONS[u.email || ''] ?? [],
    isAdmin:     ADMIN_USERS.includes(u.email || ''),
  }))

  return NextResponse.json({ users })
}

// POST — cria novo usuário
export async function POST(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()
  const { email, senha } = body

  if (!email || !senha) {
    return NextResponse.json({ erro: 'Email e senha são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true,
  })

  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email } })
}

// PATCH — atualiza senha de um usuário
export async function PATCH(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()
  const { userId, senha } = body

  if (!userId || !senha) {
    return NextResponse.json({ erro: 'userId e senha são obrigatórios' }, { status: 400 })
  }

  const { error } = await getAdminClient().auth.admin.updateUserById(userId, { password: senha })
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}

// DELETE — remove usuário
export async function DELETE(req: NextRequest) {
  if (!await isAdmin(req)) {
    return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
  }

  const body = await req.json()
  const { userId } = body

  if (!userId) {
    return NextResponse.json({ erro: 'userId é obrigatório' }, { status: 400 })
  }

  const { error } = await getAdminClient().auth.admin.deleteUser(userId)
  if (error) return NextResponse.json({ erro: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
