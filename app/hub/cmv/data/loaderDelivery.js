// ── LOADER DELIVERY ────────────────────────────────────────
// Custo → ficha técnica principal (cruzamento por SKU ZIG)
// Preço de venda → ZIG (lojas "Delivery *" já têm preço delivery)

import { fetchTipo } from './loader';

const n = v => parseFloat(String(v ?? '').replace(',', '.')) || 0;
const s = v => String(v ?? '').trim();

export async function loadDeliveryData(fichas = [], semana = null) {
  // Mapa SKU ZIG → dados da ficha técnica
  const custoPorSku = {};
  fichas.forEach(f => {
    if (f.skuZig && !custoPorSku[f.skuZig]) {
      custoPorSku[f.skuZig] = {
        custo:        f.custoIngr,
        nomePa:       f.nomePa,
        categoria:    f.categoria,
        subcategoria: f.subcategoria,
      };
    }
  });

  // Busca vendas delivery
  const res    = await fetchTipo('vendas_delivery');
  console.log('[Delivery raw] res keys:', Object.keys(res || {}), '| vendas type:', typeof res?.vendas, '| length:', res?.vendas?.length);
  const todasVendas = (res.vendas ?? []).filter(r => (r.product_sku || r.productSku) && (r.count > 0));
  console.log('[Delivery raw] total vendas filtradas:', todasVendas.length, '| exemplo:', JSON.stringify(todasVendas[0])?.slice(0,150));

  // Determina semana a usar — igual ao salão
  const semsDisp = [...new Set(todasVendas.map(v => String(v.semana_iso || v.semanaISO || '').trim()).filter(Boolean))].sort();
  console.log('[Delivery raw] semanas:', semsDisp);
  console.log('[Delivery raw] semanas encontradas:', semsDisp);
  const semAtual = semsDisp[semsDisp.length - 1] || '';
  const semAnt   = semsDisp[semsDisp.length - 2] || semAtual;
  const semTarget = semana === 'anterior' ? semAnt : semana && semana !== 'atual' ? semana : semAtual;

  const vendas = semTarget
    ? todasVendas.filter(v => String(v.semana_iso || '').trim() === semTarget)
    : todasVendas;

  console.log('[Delivery] semana:', semTarget, '| vendas filtradas:', vendas.length, '| semanas disponíveis:', semsDisp.length);

  // Agrupa por SKU
  const porProduto = new Map();
  vendas.forEach(v => {
    const sku    = s(v.product_sku || v.productSku);
    const preco  = n(v.unit_value  || v.unitValue);
    const desc   = n(v.discount_value || v.discountValue);
    const qtd    = n(v.count);
    const ficha  = custoPorSku[sku];
    const custo  = ficha ? ficha.custo : 0;
    const receita = Math.max(0, preco - desc) * qtd;

    if (!porProduto.has(sku)) {
      porProduto.set(sku, {
        skuZig:       sku,
        nomePa:       ficha?.nomePa       || s(v.productName) || s(v.product_name) || `SKU: ${sku}`,
        categoria:    ficha?.categoria    || s(v.productCategory),
        subcategoria: ficha?.subcategoria || '',
        qtdTotal:     0,
        receitaTotal: 0,
        custoTotal:   0,
        custoUnit:    custo,
        temFicha:     !!ficha,
      });
    }

    const p = porProduto.get(sku);
    p.qtdTotal    += qtd;
    p.receitaTotal += receita;
    p.custoTotal   += custo * qtd;
  });

  porProduto.forEach(p => {
    p.cmvReal   = p.receitaTotal > 0 ? p.custoTotal / p.receitaTotal : 0;
    p.precoMedio = p.qtdTotal > 0 ? p.receitaTotal / p.qtdTotal : 0;
    p.margemPct  = p.receitaTotal > 0 ? (p.receitaTotal - p.custoTotal) / p.receitaTotal : 0;
  });

  const lista        = [...porProduto.values()].sort((a, b) => b.custoTotal - a.custoTotal);
  const comFicha     = lista.filter(r => r.temFicha);
  const semFicha     = lista.filter(r => !r.temFicha).length;
  const receitaTotal = lista.reduce((s, r) => s + r.receitaTotal, 0);
  const custoTotal   = lista.reduce((s, r) => s + r.custoTotal, 0);
  const recComFicha  = comFicha.reduce((s, r) => s + r.receitaTotal, 0);
  const custoComFicha = comFicha.reduce((s, r) => s + r.custoTotal, 0);
  const cmvGeral     = recComFicha > 0 ? custoComFicha / recComFicha : 0;

  console.log(`[Delivery] ${vendas.length} vendas | ${lista.length} produtos | com ficha: ${comFicha.length} | sem ficha: ${semFicha} | CMV: ${(cmvGeral*100).toFixed(1)}%`);

  return { vendas, porProduto: lista, receitaTotal, custoTotal, recComFicha, custoComFicha, cmvGeral, semFicha };
}
