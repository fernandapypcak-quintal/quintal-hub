import { APPS_SCRIPT_URL } from './config';

const n = v => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const s = v => String(v ?? '').trim();

// Normaliza período — compatível com valores antigos e novos
const normPeriodo = v => {
  const p = String(v || '').toLowerCase().trim().normalize('NFD').replace(/[̀-ͯ]/g,'');
  if (p.includes('almoco') || p.includes('almoço')) return 'Almoço';
  if (p.includes('jantar') || p.includes('noite')) return 'Jantar/Noite';
  return 'Todos';
};

// Normaliza loja — remove acentos inconsistentes e abreviações
const normLoja = v => {
  const m = {
    'TATUAPE': 'TATUAPÉ', 'TATUAPÉ': 'TATUAPÉ',
    'SANTO ANDRE': 'SANTO ANDRÉ', 'SANTO ANDRÉ': 'SANTO ANDRÉ',
    'V. MARIANA': 'VILA MARIANA', 'VILA MARIANA': 'VILA MARIANA',
    'CARINAS': 'CARINAS', 'CARINÃS': 'CARINAS',
    'CHACARA': 'CHÁCARA', 'CHÁCARA': 'CHÁCARA',
  };
  const k = String(v || '').toUpperCase().trim();
  return m[k] || k;
};

// ── Fetch genérico ────────────────────────────────────────────
export async function fetchTipo(tipo, params = {}) {
  try {
    const qs  = Object.entries(params).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');
    const url = `${APPS_SCRIPT_URL}?tipo=${tipo}${qs ? '&' + qs : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[loader] Falha ao buscar ${tipo}:`, e.message);
    return {};
  }
}

// ── Salva parâmetros ──────────────────────────────────────────
export async function saveParametros(params) {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify({ tipo: 'salvar_parametros', parametros: params }),
    });
    return await res.json();
  } catch (e) {
    console.warn('[loader] Falha ao salvar parâmetros:', e.message);
    return { erro: e.message };
  }
}

// ── Parsers ───────────────────────────────────────────────────
function parseFicha(r) {
  return {
    codPa:          s(r.cod_pa),
    skuZig:         s(r.sku_zig),
    nomePa:         s(r.nome_pa),
    categoria:      s(r.categoria),
    subcategoria:   s(r.subcategoria),
    cardapio:       s(r.cardapio) || 'Sim',
    catContabil:    s(r.cat_contabil),
    codComponente:  s(r.cod_componente),
    descComponente: s(r.desc_componente),
    qtd:            n(r.qtd),
    und:            s(r.und),
    custoUnit:      n(r.custo_unit),
    custoIngr:      n(r.custo_ingr),
    precoVenda:     n(r.preco_venda),
  };
}

function parseDesperdicio(r) {
  return {
    data:          s(r.data),
    mes:           s(r.mes).toLowerCase(),
    unidade:       s(r.unidade).toUpperCase(),
    funcionario:   s(r.funcionario),
    produto:       s(r.nome_produto || r.produto),
    quantidade:    n(r.quantidade),
    custoUnit:     n(r.custo_unit),
    custoTotal:    n(r.custo_total),
    classificacao: s(r.classificacao),
    justificativa: s(r.justificativa),
  };
}

function parseVenda(r) {
  return {
    transactionId:   s(r.transaction_id),
    transactionDate: s(r.transaction_date),
    eventDate:       s(r.event_date),
    productSku:      s(r.product_sku),
    productName:     s(r.product_name),
    productCategory: s(r.product_category),
    unitValue:       n(r.unit_value) / 100,
    count:           n(r.count),
    discountValue:   n(r.discount_value) / 100,
    loja:            normLoja(r.loja),
    canal:           s(r.canal),
    periodo:         s(r.periodo),
    semanaISO:       s(r.semana_iso),
  };
}

// ── Entry point ───────────────────────────────────────────────
export async function loadCMVData() {
  const [resFichas, resDesperdicio, resVendas, resParams, resHistory, resHistorico, resHistIng, resBonif] = await Promise.all([
    fetchTipo('fichas'),
    fetchTipo('desperdicio'),
    fetchTipo('vendas'),
    fetchTipo('parametros'),
    fetchTipo('history'),
    fetchTipo('historico'),
    fetchTipo('historico_ingredientes'),
    fetchTipo('bonificacoes'),
  ]);

  const fichas = (resFichas.fichas ?? [])
    .map(parseFicha)
    .filter(r => r.codPa && r.nomePa);

  const desperdicio = (resDesperdicio.desperdicio ?? [])
    .map(parseDesperdicio)
    .filter(r => r.unidade);

  const vendas = (resVendas.vendas ?? [])
    .map(parseVenda)
    .filter(r => r.productSku && r.count > 0);

  const parametros = resParams.parametros ?? { taxa_ifood: 24.8, embalagem_padrao: 3.0 };
  const history    = resHistory.history    ?? [];
  const historico  = (resHistorico.historico ?? []).map(r => ({
    data:         String(r.data         || '').slice(0,10),
    codPa:        String(r.cod_pa       || ''),
    nomePa:       String(r.nome_pa      || ''),
    categoria:    String(r.categoria    || ''),
    subcategoria: String(r.subcategoria || ''),
    catContabil:  String(r.cat_contabil || ''),
    cardapio:     String(r.cardapio     || 'Sim'),
    skuZig:       String(r.sku_zig      || ''),
    custoIngr:    parseFloat(r.custo_ingr)  || 0,
    precoVenda:   parseFloat(r.preco_venda) || 0,
    cmvPct:       parseFloat(r.cmv_pct)     || 0,
  }));

  const fichasComCusto = fichas.filter(r => r.custoIngr > 0);
  const fichasSemCusto = fichas.filter(r => r.custoIngr === 0);
  console.log(`[Loader] fichas com custo: ${fichasComCusto.length} | sem custo: ${fichasSemCusto.length} | exemplo sem custo:`, fichasSemCusto[0]);
  const vendasComSemana = vendas.filter(v => v.semanaISO);
  const semanasUnicas = [...new Set(vendas.map(v => v.semanaISO).filter(Boolean))].sort();
  console.log('[Loader] vendas com semanaISO:', vendasComSemana.length, '| semanas:', semanasUnicas);
  console.log(`[CMV] fichas=${fichas.length} desperdício=${desperdicio.length} vendas=${vendas.length} history=${history.length}`);
  const historicoIngredientes = (resHistIng.historico_ingredientes ?? []).map(r => ({
    data:           String(r.data           || '').slice(0,10),
    codPa:          String(r.cod_pa         || ''),
    nomePa:         String(r.nome_pa        || ''),
    categoria:      String(r.categoria      || ''),
    catContabil:    String(r.cat_contabil   || ''),
    codComponente:  String(r.cod_componente || ''),
    descComponente: String(r.desc_componente|| ''),
    qtd:            parseFloat(r.qtd)        || 0,
    und:            String(r.und            || ''),
    custoUnit:      parseFloat(r.custo_unit) || 0,
    custoIngr:      parseFloat(r.custo_ingr) || 0,
  }));

  const bonificacoes = (resBonif.bonificacoes ?? []).map(r => ({
    semanaISO:   String(r.semana_iso     || '').trim(),
    catContabil: String(r.conta_contabil || '').trim(),
    categoria:   String(r.categoria      || '').trim(),
    produto:     String(r.produto        || '').trim(),
    valor:       parseFloat(r.valor)     || 0,
    obs:         String(r.obs            || '').trim(),
  }));

  return { fichas, desperdicio, vendas, parametros, history, historico, historicoIngredientes, bonificacoes };
}
