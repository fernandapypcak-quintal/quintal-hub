// app/api/zig/route.ts
// Proxy server-side para a API ZIG
// Evita CORS e erros 500 ao chamar direto do browser

import { NextRequest, NextResponse } from 'next/server';
import { getUserAccess, hasDashboardAccess } from '@/lib/permissions';

const ZIG_TOKEN = '2ecab4ee4268947c2b964fbbd999bf87960cf3c9dd77dabc25db479af38223d6';
const ZIG_BASE  = 'https://api.zigcore.com.br/integration';
const ZIG_REDE  = '46ec43b2-f955-453e-840d-02e68e40a9c2';

const MAPA_LOJAS: Record<string, { loja: string; canal: string }> = {
  'Quintal do Espeto Carinás':          { loja: 'CARINAS',       canal: 'CASA' },
  'Delivery Carinás':                   { loja: 'CARINAS',       canal: 'DELIVERY' },
  'Quintal do Espeto Lapa ':            { loja: 'LAPA',          canal: 'CASA' },
  'Delivery Lapa':                      { loja: 'LAPA',          canal: 'DELIVERY' },
  'Quintal do Espeto  V. Mariana':      { loja: 'VILA MARIANA',  canal: 'CASA' },
  'Delivery V. Mariana':                { loja: 'VILA MARIANA',  canal: 'DELIVERY' },
  'Quintal do Espeto Chac Sto Antonio': { loja: 'CHÁCARA',       canal: 'CASA' },
  'Delivery Chac. Sto Antonio':         { loja: 'CHÁCARA',       canal: 'DELIVERY' },
  'Quintal do Espeto Santo André':      { loja: 'SANTO ANDRÉ',   canal: 'CASA' },
  'Delivery Santo André':               { loja: 'SANTO ANDRÉ',   canal: 'DELIVERY' },
  'Quintal do Espeto Pavão':            { loja: 'PAVÃO',         canal: 'CASA' },
  'Delivery Pavão':                     { loja: 'PAVÃO',         canal: 'DELIVERY' },
  'Quintal do Espeto  V. Madalena':     { loja: 'VILA MADALENA', canal: 'CASA' },
  'Delivery Vila Madalena':             { loja: 'VILA MADALENA', canal: 'DELIVERY' },
  'Quintal do Espeto Perdizes':         { loja: 'PERDIZES',      canal: 'CASA' },
  'Delivery Perdizes':                  { loja: 'PERDIZES',      canal: 'DELIVERY' },
  'Quintal do Espeto Tatuapé':          { loja: 'TATUAPÉ',       canal: 'CASA' },
  'Delivery Tatuapé':                   { loja: 'TATUAPÉ',       canal: 'DELIVERY' },
  'Quintal do Espeto Santana':          { loja: 'SANTANA',       canal: 'CASA' },
  'Delivery Santana':                   { loja: 'SANTANA',       canal: 'DELIVERY' },
};

const PAGAMENTOS_EXCLUIDOS = new Set(['BÔNUS', 'NOTAS MANUAIS + SERVIÇO']);

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function fmtDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function eventDateSP(eventDateStr: string) {
  if (!eventDateStr) return '';
  const match = eventDateStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return eventDateStr.slice(0, 10);
  const utc = new Date(Date.UTC(+match[1], +match[2]-1, +match[3], +match[4], +match[5]));
  const sp  = new Date(utc.getTime() - 3 * 60 * 60 * 1000);
  return `${sp.getFullYear()}-${String(sp.getMonth()+1).padStart(2,'0')}-${String(sp.getDate()).padStart(2,'0')}`;
}

async function zigGet(ep: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const r = await fetch(ZIG_BASE + ep, {
        headers: { Authorization: ZIG_TOKEN },
        signal: AbortSignal.timeout(10000),
      });
      if (r.ok) return r.json();
      if (r.status === 500 && i < retries - 1) {
        await new Promise(res => setTimeout(res, 500 * (i + 1)));
        continue;
      }
    } catch {}
  }
  return null;
}

function gerarChunks(inicio: Date, fim: Date) {
  const chunks = [];
  let atual = new Date(inicio);
  while (atual <= fim) {
    const chunkFim = new Date(atual);
    chunkFim.setDate(chunkFim.getDate() + 4);
    if (chunkFim > fim) chunkFim.setTime(fim.getTime());
    chunks.push({ di: fmtDate(atual), df: fmtDate(chunkFim) });
    atual = new Date(chunkFim);
    atual.setDate(atual.getDate() + 1);
  }
  return chunks;
}

export async function GET(req: NextRequest) {
  const access = await getUserAccess();
  if (!access) return NextResponse.json({ erro: 'Não autenticado' }, { status: 401 });
  if (!hasDashboardAccess(access, 'faturamento')) return NextResponse.json({ erro: 'Acesso negado' }, { status: 403 });

  try {
    const hoje  = new Date();
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    // Busca lojas
    const lojas = await zigGet(`/erp/lojas?rede=${ZIG_REDE}`);
    if (!lojas) return NextResponse.json({ erro: 'Erro ao buscar lojas ZIG' }, { status: 500 });

    const lojasMapeadas = lojas.filter((l: any) => MAPA_LOJAS[l.name]);
    const chunks = gerarChunks(inicio, ontem);

    // Busca todos os chunks sequencialmente por loja para evitar sobrecarga
    const vistos = new Set<string>();
    const rows: any[] = [];

    for (const loja of lojasMapeadas) {
      const mapa = MAPA_LOJAS[loja.name];
      for (const { di, df } of chunks) {
        const data = await zigGet(`/erp/faturamento?dtinicio=${di}&dtfim=${df}&loja=${loja.id}`);
        if (!data?.length) continue;

        for (const item of data) {
          const valor = (item.value || 0) / 100;
          if (valor <= 0) continue;
          if (PAGAMENTOS_EXCLUIDOS.has(item.paymentName)) continue;

          const dataSP = eventDateSP(item.eventDate);
          if (dataSP < fmtDate(inicio) || dataSP > fmtDate(ontem)) continue;

          const chave = `${String(item.eventId||'').toLowerCase()}|${String(item.paymentName||'').toUpperCase()}`;
          if (chave !== '|' && vistos.has(chave)) continue;
          if (chave !== '|') vistos.add(chave);

          const [ano, mes, dia] = dataSP.split('-').map(Number);
          rows.push({
            Data:           dataSP,
            Ano:            ano,
            Mes:            mes,
            Dia:            dia,
            Ano_Mes:        `${ano}-${String(mes).padStart(2,'0')}`,
            Ano_Mes_Label:  `${MESES[mes]}/${String(ano).slice(2)}`,
            Dia_Semana_Num: new Date(ano, mes-1, dia).getDay(),
            Loja:           mapa.loja,
            Canal:          mapa.canal,
            Valor:          valor,
          });
        }
      }
    }

    return NextResponse.json({ ok: true, total: rows.length, rows });
  } catch (e: any) {
    return NextResponse.json({ erro: e.message }, { status: 500 });
  }
}
