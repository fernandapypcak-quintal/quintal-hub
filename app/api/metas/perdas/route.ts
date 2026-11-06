// app/api/metas/perdas/route.ts
// Indicador "Desconto, estorno e desperdício" do Metas Regionais.
// Lê o mesmo Apps Script do Relatório de Descontos, mas devolve SÓ o
// total em R$ por unidade/mês: quem vê Metas não precisa (nem deve)
// receber as linhas detalhadas (cliente, funcionário etc.).
//
// Total = descontos (valor) + estornos (valor unitário × quantidade).
// Desperdício já está dentro desses dois (é identificado pelo motivo).

import { NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'
import { unitIdFromString, isUnitAllowed } from '@/lib/units'

// Mesmo Web App de app/api/relatorios/route.ts
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw8w6Uwzg6WhkMJdn5SGSbW9iUyJgfRdFNKGfiGBSr-84vDNjS2vka245wPqohjsPvOjg/exec'

export const maxDuration = 60

async function buscar(tipo: string): Promise<any[]> {
  const res = await fetch(`${GAS_URL}?tipo=${tipo}`, { signal: AbortSignal.timeout(28000) })
  if (!res.ok) throw new Error(`GAS ${res.status}`)
  const data = await res.json()
  if (data && data.erro) throw new Error(String(data.erro))
  return Array.isArray(data) ? data : []
}

const num = (v: unknown) => Number(v || 0) || 0

export async function GET() {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'metas')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  try {
    // sequencial de propósito: chamadas paralelas no mesmo Apps Script disputam lock
    const descontos = await buscar('descontos')
    const estornos = await buscar('estornos')

    // { 'YYYY-MM': { unitId: { descontos, estornos, total } } }
    const porMes: Record<string, Record<string, { descontos: number; estornos: number; total: number }>> = {}
    const somar = (dataStr: string, unidadeRaw: string, campo: 'descontos' | 'estornos', valor: number) => {
      const anoMes = String(dataStr || '').slice(0, 7)
      if (!/^\d{4}-\d{2}$/.test(anoMes)) return
      const id = unitIdFromString(unidadeRaw)
      if (!id || !isUnitAllowed(id, access.lojas)) return
      porMes[anoMes] ??= {}
      porMes[anoMes][id] ??= { descontos: 0, estornos: 0, total: 0 }
      porMes[anoMes][id][campo] += valor
      porMes[anoMes][id].total += valor
    }

    descontos.forEach((r) => somar(r.data, r.unidade || r.loja, 'descontos', num(r.valor_r)))
    estornos.forEach((r) => somar(r.data, r.unidade || r.loja, 'estornos', num(r.valor_r) * (num(r.quantidade) || 1)))

    return NextResponse.json({ porMes })
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 })
  }
}
