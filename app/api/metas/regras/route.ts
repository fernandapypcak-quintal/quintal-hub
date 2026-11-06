// app/api/metas/regras/route.ts
// Regras do Metas Regionais (tabela metas_vigencias).
//   GET    → quem tem acesso ao dashboard 'metas'
//   PUT    → grava uma vigência   (permissão 'metas-regras' ou admin)
//   DELETE → exclui uma vigência  (permissão 'metas-regras' ou admin)
//
// Proteção do histórico: vigência que já começou (mês de início antes do
// mês atual) só pode ser alterada/excluída por admin. Os demais criam uma
// vigência nova a partir do mês atual ou de um mês futuro.
//
// Se a tabela estiver vazia ou fora do ar, o GET devolve as regras
// padrão de lib/metas/config.ts — o dashboard nunca fica sem regra.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getUserAccess, hasDashboardAccess, type UserAccess } from '@/lib/permissions'
import { VIGENCIAS_PADRAO, validarVigencia, type VigenciaMetas } from '@/lib/metas/config'

const TABELA = 'metas_vigencias'
const HIST = 'metas_vigencias_hist'

function db() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function podeEditar(access: UserAccess) {
  return access.isAdmin || hasDashboardAccess(access, 'metas-regras')
}

function mesAtual(): string {
  const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date())
  return `${p.find((x) => x.type === 'year')!.value}-${p.find((x) => x.type === 'month')!.value}`
}

type Linha = {
  vigente_desde: string
  nome: string
  indicadores: any
  regionais: any
  unidades_criticas: any
  regra_criticas: any
  updated_at?: string
  updated_by?: string | null
}

function paraVigencia(l: Linha): VigenciaMetas & { atualizadoEm?: string; atualizadoPor?: string | null } {
  return {
    vigenteDesde: l.vigente_desde,
    nome: l.nome,
    indicadores: l.indicadores,
    regionais: l.regionais,
    unidadesCriticas: l.unidades_criticas || [],
    regraCriticas: l.regra_criticas ?? null,
    atualizadoEm: l.updated_at,
    atualizadoPor: l.updated_by ?? null,
  }
}

function paraLinha(v: VigenciaMetas, email: string): Linha {
  return {
    vigente_desde: v.vigenteDesde,
    nome: v.nome.trim(),
    indicadores: v.indicadores,
    regionais: v.regionais,
    unidades_criticas: v.unidadesCriticas || [],
    regra_criticas: v.regraCriticas ?? null,
    updated_at: new Date().toISOString(),
    updated_by: email,
  }
}

async function lerTodas(): Promise<Linha[]> {
  const { data, error } = await db().from(TABELA).select('*').order('vigente_desde')
  if (error) throw new Error(error.message)
  return (data || []) as Linha[]
}

/** Na primeira gravação, o banco recebe as regras padrão para não perder o histórico. */
async function garantirSemente(email: string) {
  const atuais = await lerTodas()
  if (atuais.length > 0) return
  const { error } = await db().from(TABELA).insert(VIGENCIAS_PADRAO.map((v) => paraLinha(v, `${email} (cópia das regras padrão)`)))
  if (error) throw new Error(error.message)
}

async function registrarHistorico(vigenteDesde: string, acao: 'salvar' | 'excluir', dados: unknown, email: string) {
  await db().from(HIST).insert({ vigente_desde: vigenteDesde, acao, dados, feito_por: email })
}

export async function GET() {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'metas')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  const base = { podeEditar: podeEditar(access), isAdmin: access.isAdmin, mesAtual: mesAtual() }
  try {
    const linhas = await lerTodas()
    if (linhas.length === 0) return NextResponse.json({ ...base, origem: 'padrao', vigencias: VIGENCIAS_PADRAO })
    return NextResponse.json({ ...base, origem: 'banco', vigencias: linhas.map(paraVigencia) })
  } catch (e: any) {
    console.error('[metas/regras] GET:', e.message)
    return NextResponse.json({
      ...base,
      origem: 'padrao',
      aviso: 'Não consegui ler as regras salvas: usando as regras padrão.',
      vigencias: VIGENCIAS_PADRAO,
    })
  }
}

export async function PUT(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!podeEditar(access)) return NextResponse.json({ erro: 'Você não tem permissão para editar as regras' }, { status: 403 })

  try {
    const body = await req.json()
    const vigencia: VigenciaMetas = body.vigencia
    const original: string | null = body.vigenteDesdeOriginal || null
    const erros = validarVigencia(vigencia)
    if (erros.length) return NextResponse.json({ erro: erros.join(' '), erros }, { status: 400 })

    const atual = mesAtual()
    if (!access.isAdmin) {
      if (vigencia.vigenteDesde < atual) {
        return NextResponse.json({ erro: `A vigência precisa começar em ${atual} ou depois: meses passados ficam protegidos.` }, { status: 400 })
      }
      if (original && original < atual) {
        return NextResponse.json({ erro: 'Essa vigência já começou e está protegida. Crie uma vigência nova a partir deste mês.' }, { status: 400 })
      }
    }

    await garantirSemente(access.email)

    if (original && original !== vigencia.vigenteDesde) {
      const existente = (await lerTodas()).find((l) => l.vigente_desde === vigencia.vigenteDesde)
      if (existente) return NextResponse.json({ erro: `Já existe uma vigência começando em ${vigencia.vigenteDesde}.` }, { status: 400 })
      const { error: delErr } = await db().from(TABELA).delete().eq('vigente_desde', original)
      if (delErr) throw new Error(delErr.message)
    }

    const { error } = await db().from(TABELA).upsert(paraLinha(vigencia, access.email), { onConflict: 'vigente_desde' })
    if (error) throw new Error(error.message)
    await registrarHistorico(vigencia.vigenteDesde, 'salvar', vigencia, access.email)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    console.error('[metas/regras] PUT:', e.message)
    const semTabela = /metas_vigencias/.test(e.message) && /does not exist|schema cache/i.test(e.message)
    return NextResponse.json(
      { erro: semTabela ? 'A tabela de regras ainda não foi criada no banco (rode supabase/migration_metas_vigencias.sql).' : e.message },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!podeEditar(access)) return NextResponse.json({ erro: 'Você não tem permissão para editar as regras' }, { status: 403 })

  try {
    const vigenteDesde = new URL(req.url).searchParams.get('vigenteDesde') || ''
    if (!access.isAdmin && vigenteDesde < mesAtual()) {
      return NextResponse.json({ erro: 'Essa vigência já começou e não pode ser excluída.' }, { status: 400 })
    }
    await garantirSemente(access.email)
    const todas = await lerTodas()
    if (todas.length <= 1) return NextResponse.json({ erro: 'Não dá para excluir a única vigência.' }, { status: 400 })
    const alvo = todas.find((l) => l.vigente_desde === vigenteDesde)
    if (!alvo) return NextResponse.json({ erro: 'Vigência não encontrada.' }, { status: 404 })

    const { error } = await db().from(TABELA).delete().eq('vigente_desde', vigenteDesde)
    if (error) throw new Error(error.message)
    await registrarHistorico(vigenteDesde, 'excluir', paraVigencia(alvo), access.email)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
