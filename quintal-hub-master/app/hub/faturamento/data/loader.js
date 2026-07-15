// src/data/loader.js
// Estratégia: planilha legada (histórico antigo) + ZIG cache (histórico recente,
// via planilha) + ZIG AO VIVO (últimos dias, direto da API, sem cache) mesclados.
const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Data de corte FIXA: planilha tem histórico até 17/05/2026,
// ZIG (zig_faturamento) começa em 18/05/2026.
const DATA_CORTE_ZIG = '2026-05-18';

// Quantos dias mais recentes buscar direto da API (sem depender do cache
// da planilha / do trigger de 5min). Cobre o período onde normalmente
// rolam ajustes/edições manuais.
const DIAS_JANELA_VIVA = 3;

function toDate(v) {
  if (!v) return '';
  const s = String(v).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const br = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = s.match(/(\d{4}-\d{2}-\d{2})/);
  return iso ? iso[1] : '';
}

function parseRowPlanilha(r) {
  const ano = Number(r.Ano);
  const mes = Number(r.Mes);
  const dia = Number(r.Dia);
  return {
    Data:           toDate(r.Data),
    Ano:            ano,
    Mes:            mes,
    Dia:            dia,
    Ano_Mes:        `${ano}-${String(mes).padStart(2,'0')}`,
    Ano_Mes_Label:  `${MESES[mes]}/${String(ano).slice(2)}`,
    Dia_Semana_Num: Number(r.Dia_Semana_Num),
    Loja:           String(r.Loja || '').trim(),
    Canal:          String(r.Canal || '').trim().toUpperCase(),
    Valor:          parseFloat(String(r.Valor).replace(',','.')) || 0,
  };
}

function parseRowZig(r) {
  const s   = String(r.Data || '').trim().slice(0,10);
  const [ano, mes, dia] = s.split('-').map(Number);
  const dow = new Date(ano, mes-1, dia).getDay();
  return {
    Data:           s,
    Ano:            ano,
    Mes:            mes,
    Dia:            dia,
    Ano_Mes:        `${ano}-${String(mes).padStart(2,'0')}`,
    Ano_Mes_Label:  `${MESES[mes]}/${String(ano).slice(2)}`,
    Dia_Semana_Num: dow,
    Loja:           String(r.Loja || '').trim(),
    Canal:          String(r.Canal || '').trim().toUpperCase(),
    Valor:          parseFloat(r.Valor) || 0,
  };
}

function isValid(r) {
  return r.Data && r.Loja && r.Canal &&
    r.Ano > 2000 && r.Mes >= 1 && r.Mes <= 12 &&
    r.Dia >= 1   && r.Dia <= 31 && r.Valor > 0;
}

function getDataOntem() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getDataInicioJanelaViva() {
  const d = new Date();
  d.setDate(d.getDate() - (DIAS_JANELA_VIVA - 1));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// modoAoVivo = true  → inclui dados de hoje (ZIG em tempo real)
// modoAoVivo = false → só até ontem D-1 (padrão, dados fechados)
export async function loadData(modoAoVivo = false) {
  const dataHoje  = getDataHoje();
  const dataOntem = getDataOntem();
  const dataInicioJanelaViva = getDataInicioJanelaViva();

  console.log(`[loader] Modo: ${modoAoVivo ? '🔴 AO VIVO' : '📋 FECHADO (D-1)'} | Corte: ${dataOntem} | Janela viva desde: ${dataInicioJanelaViva}`);

  // Busca planilha, ZIG (cache) e ZIG AO VIVO em paralelo
  const [resPlanilha, resZig, resZigLive] = await Promise.allSettled([
    fetch(`${URL}?tipo=dados`).then(r => r.json()),
    fetch(`${URL}?tipo=zig`).then(r => r.json()),
    fetch(`${URL}?tipo=zigLive&dias=${DIAS_JANELA_VIVA}`).then(r => r.json()),
  ]);

  // Dados da planilha: histórico até 17/05/2026 (antes do corte fixo da ZIG)
  let dadosPlanilha = [];
  if (resPlanilha.status === 'fulfilled' && resPlanilha.value?.dados?.length) {
    dadosPlanilha = resPlanilha.value.dados
      .map(parseRowPlanilha)
      .filter(isValid)
      .filter(r => r.Data < DATA_CORTE_ZIG); // tudo antes de 18/05/2026
    console.log(`[loader] Planilha: ${dadosPlanilha.length} registros`);
  }

  // Dados da ZIG via cache (planilha zig_faturamento): a partir de 18/05/2026,
  // mas EXCLUINDO a janela viva — essa parte vem fresca direto da API abaixo.
  let dadosZigCache = [];
  if (resZig.status === 'fulfilled' && resZig.value?.zig?.length) {
    dadosZigCache = resZig.value.zig
      .map(parseRowZig)
      .filter(isValid)
      .filter(r => r.Data >= DATA_CORTE_ZIG)
      .filter(r => r.Data < dataInicioJanelaViva); // deixa a janela recente pro live
    console.log(`[loader] ZIG (cache/planilha): ${dadosZigCache.length} registros`);
  } else {
    console.warn('[loader] ZIG cache indisponível — seguindo só com dados ao vivo para o histórico recente ainda não coberto');
  }

  // Dados da ZIG AO VIVO: direto da API, sem passar pela planilha.
  // Cobre a janela recente (hoje + últimos DIAS_JANELA_VIVA-1 dias).
  let dadosZigLive = [];
  if (resZigLive.status === 'fulfilled' && resZigLive.value?.zig?.length) {
    const liveParsed = resZigLive.value.zig
      .map(parseRowZig)
      .filter(isValid)
      .filter(r => r.Data >= DATA_CORTE_ZIG);

    dadosZigLive = modoAoVivo
      ? liveParsed
      : liveParsed.filter(r => r.Data < dataHoje); // fechado D-1: exclui hoje

    console.log(`[loader] ZIG AO VIVO: ${dadosZigLive.length} registros (${modoAoVivo ? 'ao vivo' : 'fechado'})`);
  } else {
    console.warn('[loader] ZIG ao vivo falhou — usando fallback do cache da planilha para a janela recente');
    // Fallback: se a chamada ao vivo falhar (rede, timeout, etc.), não perde
    // a janela recente — usa o que a planilha tinha mesmo.
    if (resZig.status === 'fulfilled' && resZig.value?.zig?.length) {
      const fallback = resZig.value.zig
        .map(parseRowZig)
        .filter(isValid)
        .filter(r => r.Data >= dataInicioJanelaViva);
      dadosZigLive = modoAoVivo ? fallback : fallback.filter(r => r.Data < dataHoje);
    }
  }

  if (!dadosPlanilha.length && !dadosZigCache.length && !dadosZigLive.length) {
    throw new Error('Sem dados disponíveis');
  }

  const total = [...dadosPlanilha, ...dadosZigCache, ...dadosZigLive];
  console.log(`[loader] Total: ${total.length} registros`);
  return total;
}
