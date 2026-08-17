// src/components/pages/Print.jsx
import { useMemo } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { useCompradores } from '../../hooks/useCompradores';
import { sum, variation, calcTendFat, daysInMonth, formatBRL, acharDiaComparavel, recsComparaveis } from '../../utils/formatters';

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DOW_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function fmt(v) { return formatBRL(v, true); }
function pct(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
}
function clr(v) { return v >= 0 ? '#16a34a' : '#dc2626'; }

export default function PrintReport({ onClose, mesAno }) {
  const { rawData } = useFilters();
  const { getMeta } = useMetas();
  const { getPessoas } = useCompradores();

  const data = useMemo(() => {
    if (!rawData.length) return null;

    const keys = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const key  = (mesAno && keys.includes(mesAno)) ? mesAno : keys[keys.length - 1];
    const [anoS, mesS] = key.split('-');
    const ano = Number(anoS), mes = Number(mesS);
    const recs      = rawData.filter(r => r.Ano_Mes === key);
    const lastDay   = Math.max(...recs.map(r => r.Dia));
    const totalDays = daysInMonth(ano, mes);
    // FIX: em vez de simplesmente pegar Dia <= lastDay do ano anterior (que
    // ignora se cada dia cai no mesmo dia da semana), usa o "dia comparável"
    // — mesma ocorrência do dia da semana no mês do ano anterior — pra cada
    // dia 1..lastDay. Assim um sábado é comparado com sábado, não com
    // qualquer dia que caia no mesmo número.
    const recsAA     = recsComparaveis(rawData, ano, mes, lastDay);
    const recsAAFull = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes);

    const total    = sum(recs);
    const casa     = sum(recs.filter(r => r.Canal === 'CASA'));
    const delivery = sum(recs.filter(r => r.Canal === 'DELIVERY'));
    const totalAA  = sum(recsAA);
    const casaAA     = sum(recsAA.filter(r => r.Canal === 'CASA'));
    const deliveryAA = sum(recsAA.filter(r => r.Canal === 'DELIVERY'));
    const yoy      = variation(total, totalAA);
    const yoyCasa     = variation(casa, casaAA);
    const yoyDelivery = variation(delivery, deliveryAA);
    const tendFat  = calcTendFat(recs, lastDay, totalDays, ano, mes);
    const tendVsAA = variation(tendFat, sum(recsAAFull));

    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();

    const porLoja = lojas.map(loja => {
      const lr       = recs.filter(r => r.Loja === loja);
      const lrAA     = recsAA.filter(r => r.Loja === loja);
      const lrAAFull = recsAAFull.filter(r => r.Loja === loja);
      const real = sum(lr);
      const casaLoja     = sum(lr.filter(r => r.Canal === 'CASA'));
      const deliveryLoja = sum(lr.filter(r => r.Canal === 'DELIVERY'));
      const realAA       = sum(lrAA);
      const casaAALoja     = sum(lrAA.filter(r => r.Canal === 'CASA'));
      const deliveryAALoja = sum(lrAA.filter(r => r.Canal === 'DELIVERY'));
      const tend = calcTendFat(lr, lastDay, totalDays, ano, mes);
      const meta = getMeta(key, loja);
      return {
        loja, real, tend, meta,
        casa: casaLoja, delivery: deliveryLoja, realAA,
        casaAA: casaAALoja, deliveryAA: deliveryAALoja,
        yoy:      variation(real, realAA),
        yoyCasa:     variation(casaLoja, casaAALoja),
        yoyDelivery: variation(deliveryLoja, deliveryAALoja),
        tendVsAA: variation(tend, sum(lrAAFull)),
        ating:    meta > 0 ? real/meta*100 : null,
        share:    total > 0 ? real/total*100 : 0,
      };
    }).sort((a,b) => (b.ating??-1) - (a.ating??-1));

    // Dia anterior — usa o último dia disponível nos dados (respeita D-1 e filtros)
    const datasDisponiveis = rawData.map(r => r.Data).filter(Boolean).sort();
    const ultimaData = datasDisponiveis[datasDisponiveis.length - 1]; // ex: "2026-06-30"
    const ontemDate = ultimaData ? new Date(ultimaData + 'T12:00:00') : (() => { const d = new Date(); d.setDate(d.getDate()-1); return d; })();
    const diaO    = ontemDate.getDate();
    const mesO    = ontemDate.getMonth() + 1;
    const anoO    = ontemDate.getFullYear();
    const recsO   = rawData.filter(r => r.Ano === anoO   && r.Mes === mesO && r.Dia === diaO);
    // FIX: em vez do mesmo número de dia do ano anterior (que pode cair num
    // dia da semana diferente), usa o "dia comparável" — mesma ocorrência
    // do dia da semana no mês do ano anterior.
    const compOntem = acharDiaComparavel(anoO, mesO, diaO);
    const recsOAA = compOntem
      ? rawData.filter(r => r.Ano === compOntem.ano && r.Mes === compOntem.mes && r.Dia === compOntem.dia)
      : [];
    const totalO   = sum(recsO);
    const casaO    = sum(recsO.filter(r => r.Canal === 'CASA'));
    const delO     = sum(recsO.filter(r => r.Canal === 'DELIVERY'));
    const totalOAA = sum(recsOAA);
    const casaOAA  = sum(recsOAA.filter(r => r.Canal === 'CASA'));
    const delOAA   = sum(recsOAA.filter(r => r.Canal === 'DELIVERY'));
    const yoyO    = variation(totalO, totalOAA);
    const yoyCasaO = variation(casaO, casaOAA);
    const yoyDelO  = variation(delO, delOAA);
    const porLojaO = lojas.map(loja => {
      const lrO   = recsO.filter(r => r.Loja === loja);
      const lrOAA = recsOAA.filter(r => r.Loja === loja);
      const v26   = sum(lrO);
      const casa26 = sum(lrO.filter(r => r.Canal === 'CASA'));
      const del26  = sum(lrO.filter(r => r.Canal === 'DELIVERY'));
      const v25   = sum(lrOAA);
      const casa25 = sum(lrOAA.filter(r => r.Canal === 'CASA'));
      const del25  = sum(lrOAA.filter(r => r.Canal === 'DELIVERY'));
      const pessoas = getPessoas(anoO, mesO, null, diaO, loja);
      return { loja, v26, casa26, del26, v25, casa25, del25,
        var: variation(v26, v25),
        varCasa: variation(casa26, casa25),
        varDel:  variation(del26, del25),
        pessoas, ticket: pessoas > 0 ? v26 / pessoas : null };
    }).filter(l => l.v26 > 0).sort((a,b) => b.v26 - a.v26);

    const pessoasTotalO = getPessoas(anoO, mesO, null, diaO, null);

    return { ano, mes, lastDay, totalDays, key,
      label: `${MESES[mes]}/${ano}`,
      total, casa, delivery, totalAA, casaAA, deliveryAA, yoy, yoyCasa, yoyDelivery, tendFat, tendVsAA,
      pctCasa: total>0?casa/total*100:0,
      pctDel:  total>0?delivery/total*100:0,
      porLoja,
      ontem: { dow: DOW_NAMES[ontemDate.getDay()], dia:diaO, mes:mesO, ano:anoO,
               total:totalO, totalAA:totalOAA, yoy:yoyO,
               casa:casaO, delivery:delO, casaAA:casaOAA, deliveryAA:delOAA,
               yoyCasa:yoyCasaO, yoyDelivery:yoyDelO, porLoja:porLojaO,
               pessoas: pessoasTotalO, ticket: pessoasTotalO > 0 ? totalO / pessoasTotalO : null,
               compData: compOntem, compLabel: compOntem
                 ? `${String(compOntem.dia).padStart(2,'0')}/${String(compOntem.mes).padStart(2,'0')}/${compOntem.ano}`
                 : null } };
  }, [rawData, getMeta, mesAno, getPessoas]);

  if (!data) return null;

  const totalMeta = data.porLoja.reduce((s,l) => s+(l.meta||0), 0);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório ${data.label} — Quintal do Espeto</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 14px; color: #1a1a1a;
         background: white; padding: 14px; line-height:1.25; }

  .header { display:flex; justify-content:space-between; align-items:center;
    border-bottom: 3px solid #1F3D2E; padding-bottom: 7px; margin-bottom: 10px; }
  .header h1 { font-size: 22px; font-weight: 800; color: #1F3D2E; }
  .header .sub { font-size: 12px; color: #666; margin-top: 1px; }
  .header .badge { background:#1F3D2E; color:white; padding:4px 11px;
    border-radius:6px; font-size:13px; font-weight:700; }

  .info-bar { background:#fffbeb; border:1px solid #fde68a; border-radius:6px;
    padding:4px 12px; font-size:12px; color:#92400e; margin-bottom:9px; }

  .section-title { font-size:15px; font-weight:700; color:#1F3D2E;
    border-left:4px solid #97A624; padding-left:8px; margin:11px 0 6px;
    page-break-after: avoid; break-after: avoid-page;
    page-break-inside: avoid; break-inside: avoid; }

  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:7px; margin-bottom:9px; }
  .kpi { border:1px solid #e5e5e5; border-radius:7px; padding:7px 11px; }
  .kpi-label { font-size:10px; font-weight:700; color:#888; text-transform:uppercase;
    letter-spacing:0.5px; margin-bottom:2px; }
  .kpi-value { font-size:21px; font-weight:800; }
  .kpi-sub { font-size:10px; color:#888; margin-top:1px; }
  .kpi-var { font-size:12px; font-weight:700; margin-top:2px; }

  table { width:100%; border-collapse:collapse; font-size:14px; margin-bottom:10px; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; break-inside: avoid; }
  th { background:#1F3D2E; color:white; font-weight:700; padding:4px 8px;
    text-align:right; font-size:10px; text-transform:uppercase; }
  th:first-child { text-align:left; }
  td { padding:3px 8px; text-align:right; border-bottom:1px solid #f0f0f0; }
  td:first-child { text-align:left; font-weight:600; }
  tr:nth-child(even) td { background:#fafafa; }
  .tfoot td { background:#f0f4ec !important; font-weight:700;
    border-top:2px solid #1F3D2E; }

  .subrow td { background:#fcfcfc !important; text-align:left; font-size:11px;
    color:#666; padding:1px 8px 4px 24px; border-bottom:1px solid #f0f0f0; }
  .subrow b { color:#444; }

  .pos { color:#16a34a; } .neg { color:#dc2626; }

  .footer { margin-top:14px; padding-top:8px; border-top:1px solid #e5e5e5;
    font-size:10px; color:#999; display:flex; justify-content:space-between; }

  @media print {
    body { padding:8mm; }
    .no-print { display:none !important; }
    @page { size: A4 landscape; margin:8mm; }
  }
</style>
</head>
<body>

<div class="no-print" style="margin-bottom:14px;display:flex;gap:8px;">
  <button onclick="window.print()"
    style="background:#1F3D2E;color:white;border:none;padding:7px 18px;
    border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">
    🖨️ Imprimir / Salvar PDF
  </button>
  <button onclick="window.close()"
    style="background:#f5f5f5;color:#333;border:1px solid #ddd;padding:7px 14px;
    border-radius:6px;font-size:12px;cursor:pointer;">
    Fechar
  </button>
</div>

<!-- HEADER -->
<div class="header">
  <div>
    <h1>Quintal do Espeto</h1>
    <div class="sub">Relatório de Faturamento · Gerado em ${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div>
  </div>
  <div class="badge">${data.label} · dados até dia ${data.lastDay}</div>
</div>

<div class="info-bar">
  ⚠️ Dados até dia ${data.lastDay} de ${data.totalDays}. YoY e Tend Fat calculados com base nesse período, comparando cada dia com o "dia comparável" do ano anterior (mesma ocorrência do dia da semana no mês, não a mesma data).
</div>

<!-- 1. VISÃO GERAL -->
<div class="section-title">1. Visão Geral — ${data.label}</div>
<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-label">Faturamento Total</div>
    <div class="kpi-value">${fmt(data.total)}</div>
    <div class="kpi-var ${data.yoy>=0?'pos':'neg'}">${pct(data.yoy)} YoY até dia ${data.lastDay}</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Salão</div>
    <div class="kpi-value">${fmt(data.casa)}</div>
    <div class="kpi-sub">${data.pctCasa.toFixed(1).replace('.',',')}% do total</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Delivery</div>
    <div class="kpi-value">${fmt(data.delivery)}</div>
    <div class="kpi-sub">${data.pctDel.toFixed(1).replace('.',',')}% do total</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Projeção do Mês (Tend Fat)</div>
    <div class="kpi-value">${fmt(data.tendFat)}</div>
    <div class="kpi-var ${data.tendVsAA>=0?'pos':'neg'}">${pct(data.tendVsAA)} vs ${MESES[data.mes]}/${data.ano-1}</div>
  </div>
</div>

<!-- 2. DIA ANTERIOR -->
<div class="section-title">2. Dia Anterior — ${data.ontem.dow}, ${data.ontem.dia}/${data.ontem.mes}/${data.ontem.ano} <span style="font-weight:400;color:#888;font-size:12px">(comparado com ${data.ontem.compLabel || 'dia correspondente ' + (data.ontem.ano-1)})</span></div>
<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-label">Faturamento Total</div>
    <div class="kpi-value">${fmt(data.ontem.total)}</div>
    ${data.ontem.yoy !== null ? `<div class="kpi-var ${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)} vs dia comparável ${data.ontem.compLabel || ''}</div>` : ''}
  </div>
  <div class="kpi">
    <div class="kpi-label">Salão</div>
    <div class="kpi-value">${fmt(data.ontem.casa)}</div>
    <div class="kpi-sub">${data.ontem.total>0?(data.ontem.casa/data.ontem.total*100).toFixed(1).replace('.',',')+'%':''} do total</div>
  </div>
  <div class="kpi">
    <div class="kpi-label">Delivery</div>
    <div class="kpi-value">${fmt(data.ontem.delivery)}</div>
    <div class="kpi-sub">${data.ontem.total>0?(data.ontem.delivery/data.ontem.total*100).toFixed(1).replace('.',',')+'%':''} do total</div>
  </div>
  <div class="kpi" style="border-left:3px solid #1F3D2E">
    <div class="kpi-label">Dia Comparável ${data.ontem.compLabel || (data.ontem.ano-1)}</div>
    <div class="kpi-value" style="color:#999;font-size:19px">${fmt(data.ontem.totalAA)}</div>
    ${data.ontem.yoy !== null ? `<div class="kpi-var ${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)}</div>` : '<div class="kpi-sub">sem dado anterior</div>'}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="text-align:left">Loja</th>
      <th>Salão ${data.ontem.ano}</th>
      <th>Salão ${data.ontem.ano-1}</th>
      <th>YoY Salão</th>
      <th>Delivery ${data.ontem.ano}</th>
      <th>Delivery ${data.ontem.ano-1}</th>
      <th>YoY Delivery</th>
      <th>Total ${data.ontem.ano}</th>
      <th>Total ${data.ontem.ano-1}</th>
      <th>YoY Total</th>
      <th>Ticket Médio</th>
      <th>Share</th>
    </tr>
  </thead>
  <tbody>
    ${data.ontem.porLoja.map(l => `
    <tr>
      <td>${l.loja}</td>
      <td>${fmt(l.casa26)}</td>
      <td style="color:#999">${l.casa25>0?fmt(l.casa25):'—'}</td>
      <td class="${l.varCasa>=0?'pos':'neg'}">${l.casa25>0?pct(l.varCasa):'—'}</td>
      <td>${fmt(l.del26)}</td>
      <td style="color:#999">${l.del25>0?fmt(l.del25):'—'}</td>
      <td class="${l.varDel>=0?'pos':'neg'}">${l.del25>0?pct(l.varDel):'—'}</td>
      <td style="font-weight:700">${fmt(l.v26)}</td>
      <td style="color:#999">${l.v25>0?fmt(l.v25):'—'}</td>
      <td class="${l.var>=0?'pos':'neg'}">${l.v25>0?pct(l.var):'—'}</td>
      <td>${l.ticket !== null ? fmt(l.ticket) : '—'}</td>
      <td>${data.ontem.total>0?(l.v26/data.ontem.total*100).toFixed(1).replace('.',',')+'%':'—'}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot">
      <td>TOTAL</td>
      <td>${fmt(data.ontem.casa)}</td>
      <td style="color:#666">${fmt(data.ontem.casaAA)}</td>
      <td class="${data.ontem.yoyCasa>=0?'pos':'neg'}">${pct(data.ontem.yoyCasa)}</td>
      <td>${fmt(data.ontem.delivery)}</td>
      <td style="color:#666">${fmt(data.ontem.deliveryAA)}</td>
      <td class="${data.ontem.yoyDelivery>=0?'pos':'neg'}">${pct(data.ontem.yoyDelivery)}</td>
      <td>${fmt(data.ontem.total)}</td>
      <td style="color:#666">${fmt(data.ontem.totalAA)}</td>
      <td class="${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)}</td>
      <td>${data.ontem.ticket !== null ? fmt(data.ontem.ticket) : '—'}</td>
      <td>100%</td>
    </tr>
  </tfoot>
</table>

<!-- 3. RANKING POR LOJA -->
<div class="section-title">3. Ranking por Loja — ${data.label}</div>
<table>
  <thead>
    <tr>
      <th style="text-align:left"># Loja</th>
      <th>Salão ${data.ano}</th>
      <th>Salão ${data.ano-1}</th>
      <th>YoY Salão</th>
      <th>Delivery ${data.ano}</th>
      <th>Delivery ${data.ano-1}</th>
      <th>YoY Delivery</th>
      <th>Total ${data.ano}</th>
      <th>Total ${data.ano-1}</th>
      <th>YoY Total</th>
      <th>Meta</th>
      <th>% Ating.</th>
      <th>Tend Fat</th>
      <th>Tend vs AA</th>
    </tr>
  </thead>
  <tbody>
    ${data.porLoja.map((l,i) => `
    <tr>
      <td>#${i+1} ${l.loja}</td>
      <td>${fmt(l.casa)}</td>
      <td style="color:#999">${l.casaAA>0?fmt(l.casaAA):'—'}</td>
      <td class="${l.yoyCasa>=0?'pos':'neg'}">${l.casaAA>0?pct(l.yoyCasa):'—'}</td>
      <td>${fmt(l.delivery)}</td>
      <td style="color:#999">${l.deliveryAA>0?fmt(l.deliveryAA):'—'}</td>
      <td class="${l.yoyDelivery>=0?'pos':'neg'}">${l.deliveryAA>0?pct(l.yoyDelivery):'—'}</td>
      <td style="font-weight:700">${fmt(l.real)}</td>
      <td style="color:#999">${l.realAA>0?fmt(l.realAA):'—'}</td>
      <td class="${l.yoy>=0?'pos':'neg'}">${pct(l.yoy)}</td>
      <td>${l.meta > 0 ? fmt(l.meta) : '—'}</td>
      <td style="font-weight:800;color:${l.ating===null?'#999':l.ating>=100?'#16a34a':l.ating>=80?'#d97706':'#dc2626'}">
        ${l.ating !== null ? l.ating.toFixed(1).replace('.',',')+'%' : '—'}
      </td>
      <td style="font-weight:700">${fmt(l.tend)}</td>
      <td class="${l.tendVsAA>=0?'pos':'neg'}">${pct(l.tendVsAA)}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot">
      <td>TOTAL</td>
      <td>${fmt(data.casa)}</td>
      <td style="color:#666">${fmt(data.casaAA)}</td>
      <td class="${data.yoyCasa>=0?'pos':'neg'}">${pct(data.yoyCasa)}</td>
      <td>${fmt(data.delivery)}</td>
      <td style="color:#666">${fmt(data.deliveryAA)}</td>
      <td class="${data.yoyDelivery>=0?'pos':'neg'}">${pct(data.yoyDelivery)}</td>
      <td>${fmt(data.total)}</td>
      <td style="color:#666">${fmt(data.totalAA)}</td>
      <td class="${data.yoy>=0?'pos':'neg'}">${pct(data.yoy)}</td>
      <td>${totalMeta > 0 ? fmt(totalMeta) : '—'}</td>
      <td style="font-weight:800;color:${totalMeta>0&&data.total/totalMeta>=1?'#16a34a':totalMeta>0&&data.total/totalMeta>=0.8?'#d97706':'#dc2626'}">
        ${totalMeta > 0 ? (data.total/totalMeta*100).toFixed(1).replace('.',',')+'%' : '—'}
      </td>
      <td style="font-weight:700">${fmt(data.tendFat)}</td>
      <td class="${data.tendVsAA>=0?'pos':'neg'}">${pct(data.tendVsAA)}</td>
    </tr>
  </tfoot>
</table>

<!-- FOOTER -->
<div class="footer">
  <span>Quintal do Espeto · Dashboard de Faturamento</span>
  <span>Gerado em ${new Date().toLocaleString('pt-BR')}</span>
</div>

</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  onClose?.();
  return null;
}

export function PrintWeekend({ onClose }) {
  const { rawData } = useFilters();

  if (!rawData.length) { onClose?.(); return null; }

  const datas = [...new Set(rawData.map(r => r.Data))].filter(Boolean).sort().reverse();
  const diasFds = [];
  for (const dt of datas) {
    const d = new Date(dt + 'T12:00:00');
    const dow = d.getDay();
    if ((dow === 5 || dow === 6 || dow === 0) && !diasFds.find(x => x.data === dt)) {
      diasFds.push({ data: dt, dow, d });
    }
    if (diasFds.length === 3) break;
  }
  diasFds.sort((a,b) => a.data.localeCompare(b.data));

  if (!diasFds.length) { onClose?.(); return null; }

  const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
  const DOW_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

  const dias = diasFds.map(({ data, dow, d }) => {
    const recs = rawData.filter(r => r.Data === data);
    // FIX: em vez de simplesmente subtrair 1 ano da data (que pode cair num
    // dia da semana diferente), usa o "dia comparável" — mesma ocorrência
    // desse dia da semana no mês (ex: 3º sábado vs 3º sábado do ano anterior).
    const comp = acharDiaComparavel(d.getFullYear(), d.getMonth() + 1, d.getDate());
    const dataAA = comp ? `${comp.ano}-${String(comp.mes).padStart(2,'0')}-${String(comp.dia).padStart(2,'0')}` : null;
    const recsAA = dataAA ? rawData.filter(r => r.Data === dataAA) : [];
    const porLoja = lojas.map(loja => {
      const lr   = recs.filter(r => r.Loja === loja);
      const lrAA = recsAA.filter(r => r.Loja === loja);
      const v26 = sum(lr), v25 = sum(lrAA);
      const casa26 = sum(lr.filter(r => r.Canal === 'CASA'));
      const del26  = sum(lr.filter(r => r.Canal === 'DELIVERY'));
      const casa25 = sum(lrAA.filter(r => r.Canal === 'CASA'));
      const del25  = sum(lrAA.filter(r => r.Canal === 'DELIVERY'));
      return { loja, v26, v25, casa26, del26, casa25, del25 };
    }).filter(l => l.v26 > 0 || l.v25 > 0);
    porLoja.forEach(l => {
      l.yoy = variation(l.v26, l.v25);
      l.yoyCasa = variation(l.casa26, l.casa25);
      l.yoyDel  = variation(l.del26, l.del25);
    });
    const total26 = sum(recs), total25 = sum(recsAA);
    const casaTot26 = sum(recs.filter(r => r.Canal === 'CASA'));
    const delTot26  = sum(recs.filter(r => r.Canal === 'DELIVERY'));
    const casaTot25 = sum(recsAA.filter(r => r.Canal === 'CASA'));
    const delTot25  = sum(recsAA.filter(r => r.Canal === 'DELIVERY'));
    return { data, dow, label: DOW_NAMES[dow],
      dataFmt: d.toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'}),
      ano: d.getFullYear(), porLoja, total26, total25, yoy: variation(total26, total25),
      casaTot26, delTot26, casaTot25, delTot25,
      yoyCasaTot: variation(casaTot26, casaTot25), yoyDelTot: variation(delTot26, delTot25) };
  });

  const geradoEm = new Date().toLocaleString('pt-BR');

  function fmt(v) { return formatBRL(v, true); }
  function pct(v) {
    if (v === null || v === undefined) return '—';
    return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
  }

  const css = '* { margin:0; padding:0; box-sizing:border-box; } body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: white; padding: 14px; line-height:1.25; } .header { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #1F3D2E; padding-bottom: 7px; margin-bottom: 10px; } .header h1 { font-size: 17px; font-weight: 800; color: #1F3D2E; } .header .sub { font-size: 9px; color: #666; margin-top: 2px; } .kpi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; margin-bottom:9px; } .kpi { border:1px solid #e5e5e5; border-radius:7px; padding:7px 11px; } .kpi-label { font-size:8px; font-weight:700; color:#888; text-transform:uppercase; margin-bottom:2px; } .kpi-value { font-size:19px; font-weight:800; } .kpi-var { font-size:9px; font-weight:700; margin-top:2px; } .section-title { font-size:12px; font-weight:700; color:#1F3D2E; border-left:4px solid #97A624; padding-left:8px; margin:11px 0 6px; page-break-after: avoid; break-after: avoid-page; page-break-inside: avoid; break-inside: avoid; } table { width:100%; border-collapse:collapse; font-size:11px; margin-bottom:10px; } thead { display: table-header-group; } tr { page-break-inside: avoid; break-inside: avoid; } th { background:#1F3D2E; color:white; font-weight:700; padding:4px 7px; text-align:right; font-size:8px; text-transform:uppercase; } th:first-child { text-align:left; } td { padding:3px 7px; text-align:right; border-bottom:1px solid #f0f0f0; } td:first-child { text-align:left; font-weight:600; } tr:nth-child(even) td { background:#fafafa; } .tfoot td { background:#f0f4ec !important; font-weight:700; border-top:2px solid #1F3D2E; } .pos { color:#16a34a; } .neg { color:#dc2626; } .no-print { margin-bottom:14px; display:flex; gap:8px; } .footer { margin-top:14px; padding-top:8px; border-top:1px solid #e5e5e5; font-size:8px; color:#999; display:flex; justify-content:space-between; } @media print { body { padding:8mm; } .no-print { display:none !important; } @page { size: A4 landscape; margin:8mm; } }';

  const kpiCards = dias.map(function(d) {
    return '<div class="kpi">' +
      '<div class="kpi-label">' + d.label + ' · ' + d.dataFmt + '</div>' +
      '<div class="kpi-value">' + fmt(d.total26) + '</div>' +
      (d.yoy !== null ? '<div class="kpi-var ' + (d.yoy>=0?'pos':'neg') + '">' + pct(d.yoy) + ' vs ' + d.label + ' ' + (d.ano-1) + '</div>' : '') +
      '</div>';
  }).join('');

  const tables = dias.map(function(d) {
    const rows = d.porLoja.map(function(l) {
      return '<tr><td>' + l.loja + '</td>' +
        '<td>' + fmt(l.casa26) + '</td>' +
        '<td style="color:#999">' + (l.casa25>0?fmt(l.casa25):'—') + '</td>' +
        '<td class="' + (l.yoyCasa>=0?'pos':'neg') + '">' + (l.casa25>0?pct(l.yoyCasa):'—') + '</td>' +
        '<td>' + fmt(l.del26) + '</td>' +
        '<td style="color:#999">' + (l.del25>0?fmt(l.del25):'—') + '</td>' +
        '<td class="' + (l.yoyDel>=0?'pos':'neg') + '">' + (l.del25>0?pct(l.yoyDel):'—') + '</td>' +
        '<td style="font-weight:700">' + fmt(l.v26) + '</td>' +
        '<td style="color:#999">' + (l.v25>0?fmt(l.v25):'—') + '</td>' +
        '<td class="' + (l.yoy>=0?'pos':'neg') + '">' + (l.v25>0?pct(l.yoy):'—') + '</td>' +
        '<td>' + (d.total26>0?(l.v26/d.total26*100).toFixed(1).replace('.',',')+'%':'—') + '</td></tr>';
    }).join('');
    return '<div class="section-title">' + d.label + ' — ' + d.dataFmt + '</div>' +
      '<table><thead><tr>' +
      '<th style="text-align:left">Loja</th>' +
      '<th>Salão ' + d.ano + '</th><th>Salão ' + (d.ano-1) + '</th><th>YoY Salão</th>' +
      '<th>Delivery ' + d.ano + '</th><th>Delivery ' + (d.ano-1) + '</th><th>YoY Delivery</th>' +
      '<th>Total ' + d.ano + '</th><th>Total ' + (d.ano-1) + '</th><th>YoY Total</th><th>Share</th>' +
      '</tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr class="tfoot">' +
      '<td>TOTAL</td>' +
      '<td>' + fmt(d.casaTot26) + '</td>' +
      '<td style="color:#666">' + (d.casaTot25>0?fmt(d.casaTot25):'—') + '</td>' +
      '<td class="' + (d.yoyCasaTot>=0?'pos':'neg') + '">' + pct(d.yoyCasaTot) + '</td>' +
      '<td>' + fmt(d.delTot26) + '</td>' +
      '<td style="color:#666">' + (d.delTot25>0?fmt(d.delTot25):'—') + '</td>' +
      '<td class="' + (d.yoyDelTot>=0?'pos':'neg') + '">' + pct(d.yoyDelTot) + '</td>' +
      '<td>' + fmt(d.total26) + '</td>' +
      '<td style="color:#666">' + (d.total25>0?fmt(d.total25):'—') + '</td>' +
      '<td class="' + (d.yoy>=0?'pos':'neg') + '">' + pct(d.yoy) + '</td>' +
      '<td>100%</td></tr></tfoot></table>';
  }).join('');

  const html = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>' +
    '<title>FDS Quintal do Espeto</title>' +
    '<style>' + css + '</style></head><body>' +
    '<div class="no-print">' +
    '<button onclick="window.print()" style="background:#1F3D2E;color:white;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Imprimir</button> ' +
    '<button onclick="window.close()" style="background:#f5f5f5;color:#333;border:1px solid #ddd;padding:7px 14px;border-radius:6px;font-size:12px;cursor:pointer;">Fechar</button>' +
    '</div>' +
    '<div class="header"><div>' +
    '<h1>Quintal do Espeto — Final de Semana</h1>' +
    '<div class="sub">Gerado em ' + geradoEm + '</div></div>' +
    '<div style="background:#1F3D2E;color:white;padding:4px 10px;border-radius:6px;font-size:10px;font-weight:700;">' +
    dias.map(function(d){ return d.label; }).join(' · ') + '</div></div>' +
    '<div class="kpi-row">' + kpiCards + '</div>' +
    tables +
    '<div class="footer"><span>Quintal do Espeto · Final de Semana</span><span>' + geradoEm + '</span></div>' +
    '</body></html>';

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  onClose?.();
  return null;
}

// ── IMPRESSÃO ANUAL ──────────────────────────────────────────────────────────
// ── IMPRESSÃO DE DIA COMPARÁVEL ──────────────────────────────────────────────
// Compara cada dia do mês selecionado com a mesma OCORRÊNCIA daquele dia da
// semana no ano anterior (ex: 3º sábado de agosto/26 vs 3º sábado de
// agosto/25), em vez do mesmo dia do calendário.
export function PrintComparableDays({ onClose }) {
  const { rawData } = useFilters();

  if (!rawData.length) { onClose?.(); return null; }

  const keys = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
  const key  = keys[keys.length - 1];
  const [anoS, mesS] = key.split('-');
  const ano = Number(anoS), mes = Number(mesS);
  const recsMes = rawData.filter(r => r.Ano_Mes === key);
  const lastDay = Math.max(...recsMes.map(r => r.Dia));
  const label   = recsMes[0]?.Ano_Mes_Label || key;

  const DOW_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

  const dias = Array.from({ length: lastDay }, (_, i) => {
    const dia = i + 1;
    const dow = new Date(ano, mes - 1, dia).getDay();
    const total = sum(rawData.filter(r => r.Ano === ano && r.Mes === mes && r.Dia === dia));

    const comp = acharDiaComparavel(ano, mes, dia);
    let totalComp = 0, compLabel = '—', ocorrenciaAproximada = false;
    if (comp) {
      totalComp = sum(rawData.filter(r => r.Ano === comp.ano && r.Mes === comp.mes && r.Dia === comp.dia));
      compLabel = String(comp.dia).padStart(2,'0') + '/' + String(comp.mes).padStart(2,'0') + '/' + comp.ano;
      ocorrenciaAproximada = comp.ocorrenciaAproximada;
    }

    return {
      dia, dow, dowLabel: DOW_NAMES[dow],
      total, totalComp, compLabel, ocorrenciaAproximada,
      var: variation(total, totalComp),
    };
  });

  const totalAtual = dias.reduce((s, d) => s + d.total, 0);
  const totalComparavel = dias.reduce((s, d) => s + d.totalComp, 0);
  const varTotal = variation(totalAtual, totalComparavel);

  const css = `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: white; padding: 14px; line-height:1.25; }
    .no-print { margin-bottom: 14px; display: flex; gap: 8px; }
    @media print { .no-print { display: none; } body { padding: 8mm; } @page { size: A4 landscape; margin: 8mm; } }
    .header { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #1F3D2E; padding-bottom: 7px; margin-bottom: 10px; }
    .header h1 { font-size: 20px; font-weight: 800; color: #1F3D2E; }
    .header .sub { font-size: 11px; color: #666; margin-top: 1px; }
    .header .badge { background:#1F3D2E; color:white; padding:4px 11px; border-radius:6px; font-size:12px; font-weight:700; }
    .kpi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; }
    .kpi { border:1px solid #e5e5e5; border-radius:8px; padding:9px 13px; }
    .kpi-label { font-size:10px; font-weight:700; color:#888; text-transform:uppercase; margin-bottom:3px; }
    .kpi-value { font-size:20px; font-weight:800; }
    .kpi-var { font-size:12px; font-weight:700; margin-top:2px; }
    table { width:100%; border-collapse:collapse; font-size:13px; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; }
    th { background:#1F3D2E; color:white; font-weight:700; padding:5px 8px; text-align:right; font-size:10px; text-transform:uppercase; }
    th:first-child, th:nth-child(2) { text-align:left; }
    td { padding:4px 8px; text-align:right; border-bottom:1px solid #f0f0f0; }
    td:first-child, td:nth-child(2) { text-align:left; font-weight:600; }
    tr:nth-child(even) td { background:#fafafa; }
    .tfoot td { background:#f0f4ec !important; font-weight:700; border-top:2px solid #1F3D2E; }
    .pos { color:#16a34a; } .neg { color:#dc2626; }
    .aprox { color:#d97706; font-size:10px; }
    .footer { margin-top:14px; padding-top:8px; border-top:1px solid #e5e5e5; font-size:10px; color:#999; display:flex; justify-content:space-between; }
  `;

  const rows = dias.map(d => `
    <tr>
      <td>${String(d.dia).padStart(2,'0')}/${String(mes).padStart(2,'0')}</td>
      <td>${d.dowLabel}</td>
      <td style="font-weight:700">${d.total>0?fmt(d.total):'—'}</td>
      <td style="font-weight:400;color:#666">${d.compLabel}${d.ocorrenciaAproximada?' <span class="aprox">≈</span>':''}</td>
      <td style="color:#999">${d.totalComp>0?fmt(d.totalComp):'—'}</td>
      <td class="${d.var>=0?'pos':'neg'}">${(d.total>0&&d.totalComp>0)?pct(d.var):'—'}</td>
    </tr>`).join('');

  function fmt(v) { return formatBRL(v, true); }
  function pct(v) { if (v===null||v===undefined) return '—'; return (v>=0?'+':'') + v.toFixed(1).replace('.',',') + '%'; }

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
    <title>Dia Comparável ${label} — Quintal do Espeto</title>
    <style>${css}</style></head><body>
    <div class="no-print">
      <button onclick="window.print()" style="background:#1F3D2E;color:white;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Imprimir / Salvar PDF</button>
      <button onclick="window.close()" style="background:#f5f5f5;color:#333;border:1px solid #ddd;padding:7px 14px;border-radius:6px;font-size:12px;cursor:pointer;">Fechar</button>
    </div>
    <div class="header">
      <div>
        <h1>Quintal do Espeto — Dia Comparável</h1>
        <div class="sub">Cada dia comparado com a mesma ocorrência do dia da semana no ano anterior (ex: 3º sábado vs 3º sábado) · Gerado em ${new Date().toLocaleString('pt-BR')}</div>
      </div>
      <div class="badge">${label}</div>
    </div>
    <div class="kpi-grid">
      <div class="kpi"><div class="kpi-label">${label}</div><div class="kpi-value">${fmt(totalAtual)}</div></div>
      <div class="kpi"><div class="kpi-label">Comparável ${ano-1}</div><div class="kpi-value" style="color:#888">${fmt(totalComparavel)}</div></div>
      <div class="kpi"><div class="kpi-label">Variação</div><div class="kpi-value ${varTotal>=0?'pos':'neg'}">${pct(varTotal)}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Dia</th><th>Dia da Semana</th><th>Faturamento ${ano}</th>
        <th>Dia Correspondente ${ano-1}</th><th>Faturamento ${ano-1}</th><th>Variação</th>
      </tr></thead>
      <tbody>${rows}</tbody>
      <tfoot><tr class="tfoot">
        <td>TOTAL</td><td></td>
        <td>${fmt(totalAtual)}</td><td></td>
        <td>${fmt(totalComparavel)}</td>
        <td class="${varTotal>=0?'pos':'neg'}">${pct(varTotal)}</td>
      </tr></tfoot>
    </table>
    <div class="footer">
      <span>Quintal do Espeto · Dia Comparável</span>
      <span>${new Date().toLocaleString('pt-BR')}</span>
    </div>
    </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  onClose?.();
  return null;
}

export function PrintAnual({ ano, onClose }) {
  const { rawData } = useFilters();
  const { getMeta } = useMetas();

  const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  const data = useMemo(() => {
    if (!rawData.length) return null;

    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();
    const meses = [1,2,3,4,5,6,7,8,9,10,11,12];

    // Para cada loja, monta vetor de 12 meses
    const porLoja = lojas.map(loja => {
      const mesesData = meses.map(mes => {
        const key = `${ano}-${String(mes).padStart(2,'0')}`;
        const recs   = rawData.filter(r => r.Loja === loja && r.Ano === ano   && r.Mes === mes);
        const recsAA = rawData.filter(r => r.Loja === loja && r.Ano === ano-1 && r.Mes === mes);
        const total   = sum(recs);
        const totalAA = sum(recsAA);
        const meta    = getMeta(key, loja);
        return {
          mes, label: MESES_SHORT[mes-1],
          total, totalAA,
          yoy:   variation(total, totalAA),
          ating: meta > 0 ? total/meta*100 : null,
          meta,
        };
      });
      const totalAno   = mesesData.reduce((s,m) => s + m.total, 0);
      const totalAnoAA = mesesData.reduce((s,m) => s + m.totalAA, 0);
      return { loja, meses: mesesData, totalAno, totalAnoAA, yoyAno: variation(totalAno, totalAnoAA) };
    }).filter(l => l.totalAno > 0);

    // Totais por mês (todas as lojas)
    const totaisMes = meses.map(mes => {
      const total   = rawData.filter(r => r.Ano === ano   && r.Mes === mes).reduce((s,r) => s + r.Valor, 0);
      const totalAA = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes).reduce((s,r) => s + r.Valor, 0);
      return { mes, label: MESES_SHORT[mes-1], total, totalAA, yoy: variation(total, totalAA) };
    });
    const totalGeral   = totaisMes.reduce((s,m) => s + m.total, 0);
    const totalGeralAA = totaisMes.reduce((s,m) => s + m.totalAA, 0);

    return { porLoja, totaisMes, totalGeral, totalGeralAA, yoyGeral: variation(totalGeral, totalGeralAA) };
  }, [rawData, ano]);

  if (!data) return null;

  const geradoEm = new Date().toLocaleDateString('pt-BR', { day:'numeric', month:'long', year:'numeric' });

  const css = `
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: #fff; padding: 20px; }
    .no-print { margin-bottom: 16px; display: flex; gap: 8px; }
    @media print { .no-print { display: none; } body { padding: 0; } }
    h1 { font-size: 18px; font-weight: 800; color: #1F3D2E; }
    .sub { font-size: 11px; color: #666; margin-top: 3px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 2px solid #1F3D2E; padding-bottom: 12px; }
    .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
    .kpi { background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 8px; padding: 10px 14px; flex: 1; }
    .kpi-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; color: #888; margin-bottom: 4px; }
    .kpi-val { font-size: 18px; font-weight: 800; color: #1F3D2E; }
    .kpi-var { font-size: 11px; margin-top: 2px; }
    .pos { color: #16a34a; } .neg { color: #dc2626; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 10px; }
    th { background: #1F3D2E; color: white; padding: 5px 6px; text-align: right; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
    th:first-child { text-align: left; }
    td { padding: 4px 6px; text-align: right; border-bottom: 1px solid #f0f0f0; }
    td:first-child { text-align: left; font-weight: 600; }
    tr:nth-child(even) td { background: #fafafa; }
    tfoot td { font-weight: 800; background: #f0f4ec !important; border-top: 2px solid #1F3D2E; font-size: 11px; }
    .section-title { font-size: 13px; font-weight: 800; color: #1F3D2E; margin: 20px 0 8px; border-left: 4px solid #97A624; padding-left: 8px; }
    .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; color: #999; font-size: 9px; }
    .highlight { color: #97A624; font-weight: 800; }
    .na { color: #ccc; }
  `;

  // Tabela principal: lojas × meses
  const headerMeses = MESES_SHORT.map(m => `<th>${m}</th>`).join('') + `<th>TOTAL ${ano}</th><th>TOTAL ${ano-1}</th><th>YoY</th>`;

  const linhasLojas = data.porLoja.map(l => {
    const cells = l.meses.map(m => {
      if (m.total === 0) return '<td class="na">—</td>';
      return `<td>${fmt(m.total)}</td>`;
    }).join('');
    const yoyClass = l.yoyAno >= 0 ? 'pos' : 'neg';
    return `<tr>
      <td>${l.loja}</td>
      ${cells}
      <td class="highlight">${fmt(l.totalAno)}</td>
      <td style="color:#888">${l.totalAnoAA > 0 ? fmt(l.totalAnoAA) : '—'}</td>
      <td class="${yoyClass}">${l.yoyAno !== null ? pct(l.yoyAno) : '—'}</td>
    </tr>`;
  }).join('');

  const totalCells = data.totaisMes.map(m => {
    const yoyClass = m.yoy >= 0 ? 'pos' : 'neg';
    return `<td class="${yoyClass}">${fmt(m.total)}</td>`;
  }).join('');

  const tabelaPrincipal = `
    <table>
      <thead><tr><th>LOJA</th>${headerMeses}</tr></thead>
      <tbody>${linhasLojas}</tbody>
      <tfoot><tr>
        <td>TOTAL REDE</td>
        ${totalCells}
        <td class="highlight">${fmt(data.totalGeral)}</td>
        <td style="color:#888">${data.totalGeralAA > 0 ? fmt(data.totalGeralAA) : '—'}</td>
        <td class="${data.yoyGeral >= 0 ? 'pos' : 'neg'}">${pct(data.yoyGeral)}</td>
      </tr></tfoot>
    </table>`;

  // Tabela YoY por mês
  const linhasYoY = data.porLoja.map(l => {
    const cells = l.meses.map(m => {
      if (m.total === 0) return '<td class="na">—</td>';
      const cls = m.yoy >= 0 ? 'pos' : 'neg';
      return `<td class="${cls}">${pct(m.yoy)}</td>`;
    }).join('');
    const yoyClass = l.yoyAno >= 0 ? 'pos' : 'neg';
    return `<tr>
      <td>${l.loja}</td>
      ${cells}
      <td class="${yoyClass}">${pct(l.yoyAno)}</td>
    </tr>`;
  }).join('');

  const tabelaYoY = `
    <div class="section-title">Variação YoY — ${ano} vs ${ano-1}</div>
    <table>
      <thead><tr><th>LOJA</th>${MESES_SHORT.map(m => `<th>${m}</th>`).join('')}<th>ANO</th></tr></thead>
      <tbody>${linhasYoY}</tbody>
    </table>`;

  // Tabela atingimento de meta
  const linhasMeta = data.porLoja.map(l => {
    const cells = l.meses.map(m => {
      if (m.meta === 0 || !m.meta) return '<td class="na">—</td>';
      const cls = (m.ating ?? 0) >= 100 ? 'pos' : (m.ating ?? 0) >= 80 ? '' : 'neg';
      return `<td class="${cls}">${m.ating?.toFixed(1)}%</td>`;
    }).join('');
    return `<tr><td>${l.loja}</td>${cells}<td>—</td></tr>`;
  }).join('');

  const tabelaMeta = `
    <div class="section-title">Atingimento de Meta — ${ano}</div>
    <table>
      <thead><tr><th>LOJA</th>${MESES_SHORT.map(m => `<th>${m}</th>`).join('')}<th>ANO</th></tr></thead>
      <tbody>${linhasMeta}</tbody>
    </table>`;

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/>
    <title>Faturamento Anual ${ano} — Quintal do Espeto</title>
    <style>${css}</style></head><body>
    <div class="no-print">
      <button onclick="window.print()" style="background:#1F3D2E;color:white;border:none;padding:7px 18px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Imprimir / Salvar PDF</button>
      <button onclick="window.close()" style="background:#f5f5f5;color:#333;border:1px solid #ddd;padding:7px 14px;border-radius:6px;font-size:12px;cursor:pointer;">Fechar</button>
    </div>
    <div class="header">
      <div>
        <h1>Quintal do Espeto — Faturamento ${ano}</h1>
        <div class="sub">Relatório anual por casa · Gerado em ${geradoEm}</div>
      </div>
    </div>
    <div class="kpi-row">
      <div class="kpi">
        <div class="kpi-label">Total ${ano}</div>
        <div class="kpi-val">${fmt(data.totalGeral)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Total ${ano-1}</div>
        <div class="kpi-val" style="color:#888">${data.totalGeralAA > 0 ? fmt(data.totalGeralAA) : '—'}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">YoY ${ano} vs ${ano-1}</div>
        <div class="kpi-val ${data.yoyGeral >= 0 ? 'pos' : 'neg'}">${pct(data.yoyGeral)}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Casas ativas</div>
        <div class="kpi-val">${data.porLoja.length}</div>
      </div>
    </div>
    <div class="section-title">Faturamento por Casa — ${ano}</div>
    ${tabelaPrincipal}
    ${tabelaYoY}
    ${tabelaMeta}
    <div class="footer">
      <span>Quintal do Espeto · Faturamento Anual ${ano}</span>
      <span>${geradoEm}</span>
    </div>
    </body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url  = URL.createObjectURL(blob);
  window.open(url, '_blank');
  onClose?.();
  return null;
}

// ── EXPORTAÇÃO EXCEL ANUAL ────────────────────────────────────────────────────
export function exportarExcelAnual(rawData, getMeta, ano) {
  const MESES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  const meses = [1,2,3,4,5,6,7,8,9,10,11,12];

  const lojas = [...new Set(rawData.map(r => r.Loja))].sort();

  // ── Aba 1: Faturamento por Casa ──────────────────────────────────────────
  const headerFat = ['Loja', ...MESES_LABEL.map(m => `${m}/${String(ano).slice(2)}`), `TOTAL ${ano}`,
                     ...MESES_LABEL.map(m => `${m}/${String(ano-1).slice(2)}`), `TOTAL ${ano-1}`, 'YoY %'];

  const rowsFat = lojas.map(loja => {
    const mesesAno = meses.map(mes => {
      return rawData.filter(r => r.Loja === loja && r.Ano === ano && r.Mes === mes).reduce((s,r) => s + r.Valor, 0);
    });
    const mesesAnoAnt = meses.map(mes => {
      return rawData.filter(r => r.Loja === loja && r.Ano === ano-1 && r.Mes === mes).reduce((s,r) => s + r.Valor, 0);
    });
    const totalAno    = mesesAno.reduce((s,v) => s+v, 0);
    const totalAnoAnt = mesesAnoAnt.reduce((s,v) => s+v, 0);
    const yoy = totalAnoAnt > 0 ? ((totalAno - totalAnoAnt) / totalAnoAnt * 100) : null;
    return [loja, ...mesesAno, totalAno, ...mesesAnoAnt, totalAnoAnt, yoy];
  }).filter(r => r[13] > 0); // só lojas com faturamento no ano

  // Linha de totais
  const totaisAno    = meses.map(mes => rawData.filter(r => r.Ano === ano   && r.Mes === mes).reduce((s,r) => s+r.Valor, 0));
  const totaisAnoAnt = meses.map(mes => rawData.filter(r => r.Ano === ano-1 && r.Mes === mes).reduce((s,r) => s+r.Valor, 0));
  const totalGeralAno    = totaisAno.reduce((s,v)=>s+v,0);
  const totalGeralAnoAnt = totaisAnoAnt.reduce((s,v)=>s+v,0);
  const yoyGeral = totalGeralAnoAnt > 0 ? ((totalGeralAno - totalGeralAnoAnt) / totalGeralAnoAnt * 100) : null;
  rowsFat.push(['TOTAL REDE', ...totaisAno, totalGeralAno, ...totaisAnoAnt, totalGeralAnoAnt, yoyGeral]);

  // ── Aba 2: YoY por mês ───────────────────────────────────────────────────
  const headerYoY = ['Loja', ...MESES_LABEL.map(m => `${m} YoY%`), 'Ano YoY%'];
  const rowsYoY = lojas.map(loja => {
    const yoyMeses = meses.map(mes => {
      const atual = rawData.filter(r => r.Loja === loja && r.Ano === ano   && r.Mes === mes).reduce((s,r) => s+r.Valor,0);
      const ant   = rawData.filter(r => r.Loja === loja && r.Ano === ano-1 && r.Mes === mes).reduce((s,r) => s+r.Valor,0);
      return ant > 0 ? ((atual-ant)/ant*100) : null;
    });
    const totalAtual = rawData.filter(r => r.Loja === loja && r.Ano === ano  ).reduce((s,r) => s+r.Valor,0);
    const totalAnt   = rawData.filter(r => r.Loja === loja && r.Ano === ano-1).reduce((s,r) => s+r.Valor,0);
    const yoyAno = totalAnt > 0 ? ((totalAtual-totalAnt)/totalAnt*100) : null;
    return [loja, ...yoyMeses, yoyAno];
  }).filter(r => {
    const total = rawData.filter(x => x.Loja === r[0] && x.Ano === ano).reduce((s,x) => s+x.Valor,0);
    return total > 0;
  });

  // ── Aba 3: Atingimento de Meta ──────────────────────────────────────────
  const headerMeta = ['Loja', ...MESES_LABEL.map(m => `${m} Meta`), ...MESES_LABEL.map(m => `${m} Real`), ...MESES_LABEL.map(m => `${m} Ating%`)];
  const rowsMeta = lojas.map(loja => {
    const metasMes  = meses.map(mes => getMeta(`${ano}-${String(mes).padStart(2,'0')}`, loja) || 0);
    const reaisMes  = meses.map(mes => rawData.filter(r => r.Loja === loja && r.Ano === ano && r.Mes === mes).reduce((s,r) => s+r.Valor,0));
    const atings    = meses.map((mes, i) => metasMes[i] > 0 ? (reaisMes[i]/metasMes[i]*100) : null);
    return [loja, ...metasMes, ...reaisMes, ...atings];
  }).filter(r => r.slice(1, 13).some(v => v > 0));

  // ── Monta workbook com XLSX ───────────────────────────────────────────────
  // Importa XLSX dinamicamente
  import('https://cdn.sheetjs.com/xlsx-0.20.0/package/xlsx.mjs').then(XLSX => {
    const wb = XLSX.utils.book_new();

    // Função helper para criar sheet com formatação
    function makeSheet(header, rows) {
      const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
      // Largura das colunas
      ws['!cols'] = [{ wch: 20 }, ...Array(header.length - 1).fill({ wch: 12 })];
      return ws;
    }

    XLSX.utils.book_append_sheet(wb, makeSheet(headerFat,  rowsFat),  `Faturamento ${ano}`);
    XLSX.utils.book_append_sheet(wb, makeSheet(headerYoY,  rowsYoY),  `YoY ${ano}`);
    XLSX.utils.book_append_sheet(wb, makeSheet(headerMeta, rowsMeta), `Metas ${ano}`);

    // Download
    XLSX.writeFile(wb, `Quintal_Faturamento_${ano}.xlsx`);
  });
}
