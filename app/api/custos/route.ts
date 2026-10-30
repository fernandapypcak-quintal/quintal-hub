// app/api/custos/route.ts
// Proxy server-side para o Apps Script do Custos — evita CORS

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

const GAS_URL = 'https://script.google.com/macros/s/AKfycbxVXc8MXLItuTmgRP8v2dlQj4UNyQSEHfX-snfAPfL5JBgrjhNIOsb4DikFrDm7H8OX/exec'

// Aumenta timeout do Vercel para 60s (necessário para Apps Script pesados)
export const maxDuration = 60

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'custos')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  try {
    const { searchParams } = new URL(req.url)
    const tipo = searchParams.get('tipo') || ''

    // ── Permissão por área (v27) ─────────────────────────────
    // Gestor de área (access.bus = lista) só chama os endpoints da página
    // "Minha área", e sempre de uma área dele.
    if (access.bus !== '*') {
      const PERMITIDOS = ['gestor', 'nf_lista', 'pagamentos_bu', 'registrar_divergencia_bu', 'registrar_obs_nf', 'bus', 'dre', 'receitas_lista', 'fornecedores_bu', 'lancamentos', 'registrar_lancamento', 'registrar_excluir_lancamento', 'report_gestor']
      if (!PERMITIDOS.includes(tipo)) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
      const areaPedida = tipo === 'registrar_divergencia_bu' ? searchParams.get('bu_atual') : searchParams.get('bu')
      // report_gestor: só totais por área, sem detalhe — liberado pra qualquer gestor
      if (tipo !== 'bus' && tipo !== 'report_gestor' && (!areaPedida || !access.bus.includes(areaPedida))) {
        return NextResponse.json({ erro: 'Acesso negado a essa área' }, { status: 403 })
      }
    } else if (access.lojas !== '*') {
      // Acesso restrito por loja: nada dos dados do grupo inteiro (notas por área)
      const DO_GRUPO = ['gestor', 'nf_lista', 'pagamentos_bu', 'nf_resumo', 'conciliacao', 'pagamentos_fora', 'dre', 'receitas_lista', 'receitas_resumo', 'fornecedores_bu', 'lancamentos']
      if (DO_GRUPO.includes(tipo)) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })
    }

    // v27.13: quem registrou correção/observação vem do login, não do navegador
    if (tipo.startsWith('registrar_')) searchParams.set('usuario', access.email)

    const params = searchParams.toString()

    const res = await fetch(`${GAS_URL}${params ? '?' + params : ''}`, {
      signal: AbortSignal.timeout(55000),
    })

    if (!res.ok) {
      const text = await res.text()
      return NextResponse.json({ erro: `GAS ${res.status}: ${text.slice(0,200)}` }, { status: 500 })
    }

    const data = await res.json()
    // Quem tem acesso restrito por loja não recebe o resumo de notas do grupo
    if (tipo === 'tudo' && access.lojas !== '*' && data && typeof data === 'object') delete (data as any).nf_resumo
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
