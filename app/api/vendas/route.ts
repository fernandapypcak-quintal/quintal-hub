// app/api/vendas/route.ts
// Proxy server-side para o Apps Script de Vendas por Produto (ApiVendas.gs).
// - evita CORS
// - guarda a API_KEY do Apps Script só no servidor (env var)
// - aplica a permissão por unidade: usuário restrito só consegue consultar
//   as lojas liberadas pra ele, mesmo mexendo na URL na mão

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { isUnitAllowed } from '@/lib/units'

// Configurar na Vercel (Settings > Environment Variables):
//   VENDAS_GAS_URL -> URL /exec da implantação Web App do ApiVendas.gs
//   VENDAS_GAS_KEY -> mesmo valor da propriedade API_KEY do script
const GAS_URL = process.env.VENDAS_GAS_URL || ''
const GAS_KEY = process.env.VENDAS_GAS_KEY || ''

// Nomes exatamente como o Apps Script grava (array LOJAS do ZigVendasDiarias.gs)
const LOJAS_GAS = [
  'Carinás', 'Lapa', 'Tatuapé', 'Pavão', 'Chácara Sto Antônio',
  'Vila Mariana', 'Vila Madalena', 'Perdizes', 'Santana', 'Santo André',
]

const ACOES = new Set(['meta', 'resumo', 'detalhe', 'produto', 'produtoLoja', 'custos'])

export const maxDuration = 60

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ ok: false, erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'vendas')) return NextResponse.json({ ok: false, erro: 'Acesso negado' }, { status: 403 })
  if (!GAS_URL || !GAS_KEY) {
    return NextResponse.json({ ok: false, erro: 'VENDAS_GAS_URL / VENDAS_GAS_KEY não configuradas na Vercel' }, { status: 500 })
  }

  const params = new URLSearchParams(new URL(req.url).searchParams)
  params.delete('key')
  const acao = params.get('acao') || 'resumo'
  if (!ACOES.has(acao)) return NextResponse.json({ ok: false, erro: 'Ação inválida' }, { status: 400 })
  params.set('acao', acao)

  const restrito = access.lojas !== '*'
  const permitidas = restrito ? LOJAS_GAS.filter(n => isUnitAllowed(n, access.lojas)) : LOJAS_GAS
  if (restrito && permitidas.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Nenhuma unidade liberada para o seu usuário' }, { status: 403 })
  }

  if (restrito && acao !== 'meta') {
    const pedidas = (params.get('lojas') || '').split('|').map(s => s.trim()).filter(Boolean)
    const finais = pedidas.length ? pedidas.filter(p => permitidas.includes(p)) : permitidas
    if (finais.length === 0) {
      return NextResponse.json({ ok: false, erro: 'Sem acesso às unidades selecionadas' }, { status: 403 })
    }
    params.set('lojas', finais.join('|'))
  }

  params.set('key', GAS_KEY)

  try {
    const res = await fetch(`${GAS_URL}?${params.toString()}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(55000),
    })
    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      return NextResponse.json({ ok: false, erro: `Resposta inválida do Apps Script (${res.status}): ${text.slice(0, 200)}` }, { status: 502 })
    }

    if (data?.ok === false) {
      return NextResponse.json({ ok: false, erro: data.erro || 'Erro no Apps Script' }, { status: data.status || 500 })
    }

    if (acao === 'meta' && restrito && Array.isArray(data.lojas)) {
      data.lojas = data.lojas.filter((n: string) => permitidas.includes(n))
    }

    return NextResponse.json(data)
  } catch (e: any) {
    const msg = e?.name === 'TimeoutError' ? 'O Apps Script demorou demais para responder — tente um período menor' : (e?.message || 'Erro desconhecido')
    return NextResponse.json({ ok: false, erro: msg }, { status: 504 })
  }
}

