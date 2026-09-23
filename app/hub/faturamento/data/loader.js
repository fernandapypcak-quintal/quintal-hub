// src/data/loader.js
// Estratégia: planilha legada (histórico antigo) + ZIG cache (histórico recente,
// via planilha) + ZIG AO VIVO (últimos dias, direto da API, sem cache) mesclados.
//
// RESILIÊNCIA (23/09/2026): a entrega do Apps Script (redirect pro
// script.googleusercontent.com/echo) falha de vez em quando com 404, sem
// relação com o nosso código. Pra o dashboard não cair em tela de erro:
//   1. Cada chamada tenta de novo até 3x, com espera crescente.
//   2. A última resposta boa de cada tipo fica salva no navegador; se a
//      rede falhar de vez, usa essa cópia (e avisa via getStatusCarga()).
//   3. As chamadas saem escalonadas (não todas no mesmo milissegundo).
const URL = 'https://script.google.com/macros/s/AKfycbyEoeYAWVUGc8n-_J61Sd91XDhkRPJOaVQnvUbk_-UcWyuaRtoyvFwtqMMcFq8_H80vwA/exec';

const MESES = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

// Data de corte FIXA: planilha tem histórico até 17/05/2026,
// ZIG (zig_faturamento) começa em 18/05/2026.
const DATA_CORTE_ZIG = '2026-05-18';

// Quantos dias mais recentes buscar direto da API.
const DIAS_JANELA_VIVA = 3;

// ── Resiliência ─────────────────────────────────────────────────────────────
const CACHE_PREFIX = 'fat_cache_v1:';
const TENTATIVAS   = 3;

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function salvarLocal(chave, obj) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_PREFIX + chave, JSON.stringify({ salvoEm: Date.now(), obj }));
  } catch (e) {
    // Quota cheia ou storage bloqueado — segue sem cópia local, sem quebrar nada
    console.warn(`[loader] não deu pra salvar cópia local de "${chave}" (${e.message})`);
  }
}

function lerLocal(chave) {
  if (typeof window === 'undefined') return null;
  try {
    const s = localStorage.getItem(CACHE_PREFIX + chave);
    return s ? JSON.parse(s) : null;
  } catch {
    return null;
  }
}

// Fetch com retry. Trata como falha: erro de rede, HTTP != 200 (o 404 do
// echo), JSON inválido, resposta {erro: ...} do Apps Script, e resposta
// que não passa na validação (ex: lista vazia quando não devia).
// Exportado pra outros hooks (metas, compradores, etc.) poderem usar também.
export async function fetchComRetry(url, { tentativas = TENTATIVAS, validar } = {}) {
  let ultimoErro;
  for (let t = 1; t <= tentativas; t++) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      if (j && j.erro) throw new Error(`Apps Script: ${j.erro}`);
      if (validar && !validar(j)) throw new Error('resposta vazia/inválida');
      return j;
    } catch (e) {
      ultimoErro = e;
      if (t < tentativas) {
        const ms = 1500 * t; // 1,5s, depois 3s
        console.warn(`[loader] ${url.split('?')[1] || url}: tentativa ${t}/${tentativas} falhou (${e.message}) — tentando de novo em ${ms / 1000}s`);
        await esperar(ms);
      }
    }
  }
  throw ultimoErro;
}

// Busca com retry e, se falhar de vez, cai na última cópia boa salva no navegador.
async function buscarComFallback(chave, url, validar) {
  try {
    const json = await fetchComRetry(url, { validar });
    salvarLocal(chave, json);
    return { json, origem: 'rede' };
  } catch (e) {
    const local = lerLocal(chave);
    if (local && local.obj) {
      console.warn(`[loader] ${chave}: falhou (${e.message}) — usando cópia local de ${new Date(local.salvoEm).toLocaleString('pt-BR')}`);
      return { json: local.obj, origem: 'local', salvoEm: local.salvoEm };
    }
    throw e;
  }
}

// Status da última carga — pra tela poder mostrar um aviso tipo
// "mostrando dados de 10:15, reconectando…" quando usar cópia local.
let statusCarga = { usandoCopiaLocal: false, copiaDe: null, tipos: [] };
export function getStatusCarga() {
  return statusCarga;
}

// ── Parse ───────────────────────────────────────────────────────────────────
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

function fmtLocal(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function getDataOntem() {
  const d = new Date(); d.setDate(d.getDate() - 1);
  return fmtLocal(d);
}
function getDataHoje() {
  return fmtLocal(new Date());
}
function getDataInicioJanelaViva() {
  const d = new Date(); d.setDate(d.getDate() - (DIAS_JANELA_VIVA - 1));
  return fmtLocal(d);
}

// ── Carga principal ─────────────────────────────────────────────────────────
// modoAoVivo = true  → inclui dados de hoje (ZIG em tempo real)
// modoAoVivo = false → só até ontem D-1 (padrão, dados fechados)
export async function loadData(modoAoVivo = false) {
  const dataHoje  = getDataHoje();
  const dataOntem = getDataOntem();
  const dataInicioJanelaViva = getDataInicioJanelaViva();

  console.log(`[loader] Modo: ${modoAoVivo ? '🔴 AO VIVO' : '📋 FECHADO (D-1)'} | Corte: ${dataOntem} | Janela viva desde: ${dataInicioJanelaViva}`);

  // Chamadas escalonadas (400ms entre cada) em vez de todas no mesmo instante.
  // Planilha e ZIG cache têm cópia local de segurança; o ao vivo não (se
  // falhar, já existe o fallback abaixo pro cache da planilha).
  const [resPlanilha, resZig, resZigLive] = await Promise.allSettled([
    buscarComFallback('dados', `${URL}?tipo=dados`, (j) => j?.dados?.length > 0),
    esperar(400).then(() => buscarComFallback('zig', `${URL}?tipo=zig`, (j) => j?.zig?.length > 0)),
    esperar(800).then(() => fetchComRetry(`${URL}?tipo=zigLive&dias=${DIAS_JANELA_VIVA}`, {
      tentativas: 2,
      validar: (j) => Array.isArray(j?.zig),
    })),
  ]);

  const jsonPlanilha = resPlanilha.status === 'fulfilled' ? resPlanilha.value.json : null;
  const jsonZig      = resZig.status === 'fulfilled' ? resZig.value.json : null;
  const jsonZigLive  = resZigLive.status === 'fulfilled' ? resZigLive.value : null;

  // Registra se alguma parte veio da cópia local
  const locais = [resPlanilha, resZig]
    .filter((r) => r.status === 'fulfilled' && r.value.origem === 'local')
    .map((r) => r.value);
  statusCarga = {
    usandoCopiaLocal: locais.length > 0,
    copiaDe: locais.length ? Math.min(...locais.map((l) => l.salvoEm)) : null,
    tipos: [
      resPlanilha.status === 'fulfilled' && resPlanilha.value.origem === 'local' ? 'dados' : null,
      resZig.status === 'fulfilled' && resZig.value.origem === 'local' ? 'zig' : null,
    ].filter(Boolean),
  };
  if (statusCarga.usandoCopiaLocal) {
    console.warn(`[loader] ⚠️ Mostrando cópia local (${statusCarga.tipos.join(', ')}) de ${new Date(statusCarga.copiaDe).toLocaleString('pt-BR')} — Apps Script indisponível no momento`);
  }

  // Dados da planilha: histórico até 17/05/2026 (antes do corte fixo da ZIG)
  let dadosPlanilha = [];
  if (jsonPlanilha?.dados?.length) {
    dadosPlanilha = jsonPlanilha.dados
      .map(parseRowPlanilha)
      .filter(isValid)
      .filter((r) => r.Data < DATA_CORTE_ZIG);
    console.log(`[loader] Planilha: ${dadosPlanilha.length} registros`);
  }

  // ZIG via cache: a partir de 18/05/2026, EXCLUINDO a janela viva
  let dadosZigCache = [];
  if (jsonZig?.zig?.length) {
    dadosZigCache = jsonZig.zig
      .map(parseRowZig)
      .filter(isValid)
      .filter((r) => r.Data >= DATA_CORTE_ZIG)
      .filter((r) => r.Data < dataInicioJanelaViva);
    console.log(`[loader] ZIG (cache/planilha): ${dadosZigCache.length} registros`);
  } else {
    console.warn('[loader] ZIG cache indisponível (rede e cópia local) — seguindo só com dados ao vivo');
  }

  // ZIG AO VIVO: janela recente direto da API
  let dadosZigLive = [];
  if (jsonZigLive?.zig?.length) {
    const liveParsed = jsonZigLive.zig
      .map(parseRowZig)
      .filter(isValid)
      .filter((r) => r.Data >= DATA_CORTE_ZIG);
    dadosZigLive = modoAoVivo ? liveParsed : liveParsed.filter((r) => r.Data < dataHoje);
    console.log(`[loader] ZIG AO VIVO: ${dadosZigLive.length} registros (${modoAoVivo ? 'ao vivo' : 'fechado'})`);
  } else {
    console.warn('[loader] ZIG ao vivo falhou — usando o cache da planilha para a janela recente');
    if (jsonZig?.zig?.length) {
      const fallback = jsonZig.zig
        .map(parseRowZig)
        .filter(isValid)
        .filter((r) => r.Data >= dataInicioJanelaViva);
      dadosZigLive = modoAoVivo ? fallback : fallback.filter((r) => r.Data < dataHoje);
    }
  }

  if (!dadosPlanilha.length && !dadosZigCache.length && !dadosZigLive.length) {
    throw new Error('Sem dados disponíveis');
  }

  const total = [...dadosPlanilha, ...dadosZigCache, ...dadosZigLive];
  console.log(`[loader] Total: ${total.length} registros`);
  return total;
}
