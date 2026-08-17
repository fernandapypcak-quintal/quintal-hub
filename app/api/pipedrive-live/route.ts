// app/api/pipedrive-live/route.ts
// Busca leads de hoje DIRETAMENTE da API do Pipedrive
// Não passa pelo Apps Script — evita limite de UrlFetch

import { NextRequest, NextResponse } from 'next/server'
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions'

const PIPE_TOKEN  = process.env.PIPEDRIVE_TOKEN || ''
const PIPELINE_ID = 1

const STAGES: Record<string, string> = {
  '1':'[LEADS] Campanhas','86':'1º Contato SDR','93':'Follow UP SDR',
  '109':'RMKT','85':'Clientes Qualificados','35':'1º Contato Vendas',
  '3':'Em Negociação','2':'Orçamento','8':'Visitas',
  '7':'Ficha Técnica','4':'Aguardando Assinatura',
}

const UNIDADES: Record<string, string> = {
  '13':'Alto da Lapa','14':'Moema Carinás','15':'Moema Pavão',
  '16':'Perdizes','28':'Santana','72':'Santo André',
  '17':'Tatuapé','18':'Vila Madalena','19':'Vila Mariana',
  '78':'Chácara Sto. Antônio','184':'Holding',
}

const CARDAPIOS: Record<string, string> = {
  '50':'Quintal 01','51':'Quintal 02','52':'Quintal 03','53':'Quintal 04',
  '56':'Personalizado','168':'All Inclusive','159':'Quintal Black',
  '178':'Quintal do Seu Jeito','123':'Casamento','135':'Cardápio Kids',
}

// Campos customizados
const F_DATA_EVENTO = '52ef782a5a9fc5cfc89db9f53c8b6be1ee3cec50'
const F_QTD_PESSOAS = '65fd2f4c9ed19c6b3b403af3352995a9d45b0feb'
const F_UNIDADE     = 'f129133576f82d1d9fc5f52c6c519eb46a859ad7'
const F_CARDAPIO    = '0b15d0bff92d829650cfe6d79282491c952b83c0'
const F_RESPONSAVEL = '07454fc74f97ff8453fc4a935ff40f99ec2be583'
const F_TIPO_EVENTO = 'fde4e03fa8a8c6b170f9568382f9a20519d3c097'
const F_FORMA_PGTO  = 'f8469687c09648fb086fd8391be1855337365c7a'
const F_STATUS_CONT = '06c9a1a86dd1c7dbce9e583d453bc6b2ade9f8a9'
const F_INFO_EXTRAS = '062d95e1d9fa1497758e088d0c72dc00308d3b0b'
const F_CONF        = '247a415647a2668ba8b9defdb2fe54d4ff6cef8e'
const F_CNPJ        = '7062fde7376dcd5261c78c1d30e2028a388f7aad'
const F_RAZAO       = 'a4ba2939d11ddea8973152b09851c2ded19168f0'
const F_TEL_RESP    = '6ee70429a91477b3dfe2450065aca8d2e9d70843'

const FORMA_PGTO: Record<string, string> = {
  '59':'Cartão de Crédito','60':'Boleto Bancário','142':'Transferência',
  '143':'Pix','147':'Pagamento na unidade','148':'Permuta',
  '149':'Sem custo','152':'Faturado',
}

function fmtDate(val: any): string {
  if (!val) return ''
  const s = String(val)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.substring(0, 10)
  try {
    const d = new Date(s)
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0]
    }
  } catch {}
  return s
}

function convertDeal(d: any) {
  const unidadeId   = String(d[F_UNIDADE] || '')
  const unidadeNome = unidadeId.split(',').map((id: string) => UNIDADES[id.trim()] || id.trim()).filter(Boolean).join(', ')
  const cardapioId  = String(d[F_CARDAPIO] || '')
  const formaPgtoId = String(d[F_FORMA_PGTO] || '')

  return {
    id:                 d.id,
    titulo:             d.title || '',
    empresa:            d.org_id?.name || '',
    contato:            d.person_id?.name || '',
    email_contato:      d.person_id?.email?.[0]?.value || '',
    telefone_contato:   d.person_id?.phone?.[0]?.value || '',
    razao_social:       d[F_RAZAO] || '',
    cnpj_cpf:           d[F_CNPJ] || '',
    status:             d.status || '',
    stage_id:           String(d.stage_id || ''),
    stage_nome:         STAGES[String(d.stage_id)] || `Stage ${d.stage_id}`,
    valor:              d.value || 0,
    moeda:              d.currency || 'BRL',
    data_evento:        fmtDate(d[F_DATA_EVENTO]),
    qtd_pessoas:        d[F_QTD_PESSOAS] || '',
    unidade_id:         unidadeId,
    unidade_nome:       unidadeNome,
    cardapio_id:        cardapioId,
    cardapio_nome:      CARDAPIOS[cardapioId] || cardapioId,
    tipo_evento:        d[F_TIPO_EVENTO] || '',
    local_evento:       '',
    horario_inicio:     '',
    horario_fim:        '',
    responsavel_evento: d[F_RESPONSAVEL] || '',
    telefone_responsavel: d[F_TEL_RESP] || '',
    forma_pgto_id:      formaPgtoId,
    forma_pgto_nome:    FORMA_PGTO[formaPgtoId] || formaPgtoId,
    status_contrato:    d[F_STATUS_CONT] || '',
    conferido:          d[F_CONF] ? 'SIM' : '',
    info_extras:        d[F_INFO_EXTRAS] || '',
    vendedor:           d.user_id?.name || '',
    email_vendedor:     d.user_id?.email || '',
    add_time:           fmtDate(d.add_time),
    update_time:        fmtDate(d.update_time),
    won_time:           fmtDate(d.won_time),
    lost_time:          fmtDate(d.lost_time),
    close_time:         fmtDate(d.close_time),
    motivo_perda:       d.lost_reason || '',
    sync_time:          new Date().toISOString(),
  }
}

export async function GET(req: NextRequest) {
  const access = await getUserAccess()
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 })
  if (!hasDashboardAccess(access, 'comercial')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 })

  if (!PIPE_TOKEN) {
    return NextResponse.json({ erro: 'Token do Pipedrive não configurado (PIPEDRIVE_TOKEN)' }, { status: 500 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const unidade  = searchParams.get('unidade')  || ''
    const vendedor = searchParams.get('vendedor') || ''

    // Hoje no fuso de SP
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }) // YYYY-MM-DD

    // Busca os últimos 200 deals ordenados por add_time DESC
    const url = `https://api.pipedrive.com/v1/deals?status=all&limit=200&pipeline_id=${PIPELINE_ID}&sort=add_time%20DESC&api_token=${PIPE_TOKEN}`
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) })

    if (!res.ok) {
      return NextResponse.json({ erro: `Pipedrive retornou ${res.status}` }, { status: 500 })
    }

    const data = await res.json()
    if (!data.success) {
      return NextResponse.json({ erro: data.error || 'Erro Pipedrive' }, { status: 500 })
    }

    // Filtra só os de hoje
    let deals = (data.data || [])
      .filter((d: any) => String(d.add_time || '').substring(0, 10) === hoje)
      .map(convertDeal)

    // Filtros opcionais
    if (unidade)  deals = deals.filter((d: any) => String(d.unidade_id || '').split(',').map((x: string) => x.trim()).includes(unidade))
    if (vendedor) deals = deals.filter((d: any) => d.vendedor === vendedor)

    const agora = new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })

    return NextResponse.json({
      deals,
      total:          deals.length,
      data_referencia: hoje,
      atualizado_em:  agora,
    })

  } catch (e: any) {
    const msg = e.name === 'TimeoutError' ? 'Timeout ao buscar dados do Pipedrive' : e.message
    return NextResponse.json({ erro: msg }, { status: 500 })
  }
}
