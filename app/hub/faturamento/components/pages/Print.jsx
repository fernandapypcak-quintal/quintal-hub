// src/components/pages/Print.jsx
import { useMemo } from 'react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';
import { sum, variation, calcTendFat, daysInMonth, formatBRL } from '../../utils/formatters';

const MESES = ['','Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DOW_NAMES = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

function fmt(v) { return formatBRL(v, true); }
function pct(v) {
  if (v === null || v === undefined) return '—';
  return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
}
function clr(v) { return v >= 0 ? '#16a34a' : '#dc2626'; }

export default function PrintReport({ onClose }) {
  const { rawData } = useFilters();
  const { getMeta } = useMetas();

  const data = useMemo(() => {
    if (!rawData.length) return null;

    const keys = [...new Set(rawData.map(r => r.Ano_Mes))].sort();
    const key  = keys[keys.length - 1];
    const [anoS, mesS] = key.split('-');
    const ano = Number(anoS), mes = Number(mesS);
    const recs      = rawData.filter(r => r.Ano_Mes === key);
    const lastDay   = Math.max(...recs.map(r => r.Dia));
    const totalDays = daysInMonth(ano, mes);
    const recsAA     = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes && r.Dia <= lastDay);
    const recsAAFull = rawData.filter(r => r.Ano === ano-1 && r.Mes === mes);

    const total    = sum(recs);
    const casa     = sum(recs.filter(r => r.Canal === 'CASA'));
    const delivery = sum(recs.filter(r => r.Canal === 'DELIVERY'));
    const yoy      = variation(total, sum(recsAA));
    const tendFat  = calcTendFat(recs, lastDay, totalDays, ano, mes);
    const tendVsAA = variation(tendFat, sum(recsAAFull));

    const lojas = [...new Set(rawData.map(r => r.Loja))].sort();

    const porLoja = lojas.map(loja => {
      const lr       = recs.filter(r => r.Loja === loja);
      const lrAA     = recsAA.filter(r => r.Loja === loja);
      const lrAAFull = recsAAFull.filter(r => r.Loja === loja);
      const real = sum(lr);
      const tend = calcTendFat(lr, lastDay, totalDays, ano, mes);
      const meta = getMeta(key, loja);
      return {
        loja, real, tend, meta,
        yoy:      variation(real, sum(lrAA)),
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
    const recsOAA = rawData.filter(r => r.Ano === anoO-1 && r.Mes === mesO && r.Dia === diaO);
    const totalO  = sum(recsO);
    const casaO   = sum(recsO.filter(r => r.Canal === 'CASA'));
    const delO    = sum(recsO.filter(r => r.Canal === 'DELIVERY'));
    const yoyO    = variation(totalO, sum(recsOAA));
    const porLojaO = lojas.map(loja => {
      const v26 = sum(recsO.filter(r => r.Loja === loja));
      const v25 = sum(recsOAA.filter(r => r.Loja === loja));
      return { loja, v26, v25, var: variation(v26, v25) };
    }).filter(l => l.v26 > 0).sort((a,b) => b.v26 - a.v26);

    return { ano, mes, lastDay, totalDays, key,
      label: `${MESES[mes]}/${ano}`,
      total, casa, delivery, yoy, tendFat, tendVsAA,
      pctCasa: total>0?casa/total*100:0,
      pctDel:  total>0?delivery/total*100:0,
      porLoja,
      ontem: { dow: DOW_NAMES[ontemDate.getDay()], dia:diaO, mes:mesO, ano:anoO,
               total:totalO, totalAA:sum(recsOAA), yoy:yoyO,
               casa:casaO, delivery:delO, porLoja:porLojaO } };
  }, [rawData, getMeta]);

  if (!data) return null;

  const totalMeta = data.porLoja.reduce((s,l) => s+(l.meta||0), 0);

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<title>Relatório ${data.label} — Quintal do Espeto</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a;
         background: white; padding: 16px; }

  .header { display:flex; justify-content:space-between; align-items:center;
    border-bottom: 3px solid #1F3D2E; padding-bottom: 10px; margin-bottom: 14px; }
  .header h1 { font-size: 22px; font-weight: 800; color: #1F3D2E; }
  .header .sub { font-size: 12px; color: #666; margin-top: 2px; }
  .header .badge { background:#1F3D2E; color:white; padding:5px 12px;
    border-radius:6px; font-size:13px; font-weight:700; }

  .info-bar { background:#fffbeb; border:1px solid #fde68a; border-radius:6px;
    padding:6px 12px; font-size:12px; color:#92400e; margin-bottom:12px; }

  .section-title { font-size:15px; font-weight:700; color:#1F3D2E;
    border-left:4px solid #97A624; padding-left:8px; margin:16px 0 8px; }

  .kpi-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:8px; margin-bottom:12px; }
  .kpi { border:1px solid #e5e5e5; border-radius:8px; padding:11px 13px; }
  .kpi-label { font-size:10px; font-weight:700; color:#888; text-transform:uppercase;
    letter-spacing:0.5px; margin-bottom:4px; }
  .kpi-value { font-size:22px; font-weight:800; }
  .kpi-sub { font-size:10px; color:#888; margin-top:2px; }
  .kpi-var { font-size:12px; font-weight:700; margin-top:3px; }

  table { width:100%; border-collapse:collapse; font-size:13px; margin-bottom:14px; }
  th { background:#1F3D2E; color:white; font-weight:700; padding:6px 9px;
    text-align:right; font-size:10px; text-transform:uppercase; }
  th:first-child { text-align:left; }
  td { padding:5px 9px; text-align:right; border-bottom:1px solid #f0f0f0; }
  td:first-child { text-align:left; font-weight:600; }
  tr:nth-child(even) td { background:#fafafa; }
  .tfoot td { background:#f0f4ec !important; font-weight:700;
    border-top:2px solid #1F3D2E; }

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
  ⚠️ Dados até dia ${data.lastDay} de ${data.totalDays}. YoY e Tend Fat calculados com base nesse período.
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
<div class="section-title">2. Dia Anterior — ${data.ontem.dow}, ${data.ontem.dia}/${data.ontem.mes}/${data.ontem.ano}</div>
<div class="kpi-grid">
  <div class="kpi">
    <div class="kpi-label">Faturamento Total</div>
    <div class="kpi-value">${fmt(data.ontem.total)}</div>
    ${data.ontem.yoy !== null ? `<div class="kpi-var ${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)} vs mesmo dia ${data.ontem.ano-1}</div>` : ''}
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
    <div class="kpi-label">Mesmo dia ${data.ontem.ano-1}</div>
    <div class="kpi-value" style="color:#999;font-size:19px">${fmt(data.ontem.totalAA)}</div>
    ${data.ontem.yoy !== null ? `<div class="kpi-var ${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)}</div>` : '<div class="kpi-sub">sem dado anterior</div>'}
  </div>
</div>

<table>
  <thead>
    <tr>
      <th style="text-align:left">Loja</th>
      <th>${data.ontem.ano}</th>
      <th>${data.ontem.ano-1}</th>
      <th>Variação YoY</th>
      <th>Share</th>
    </tr>
  </thead>
  <tbody>
    ${data.ontem.porLoja.map(l => `
    <tr>
      <td>${l.loja}</td>
      <td style="font-weight:700">${fmt(l.v26)}</td>
      <td style="color:#999">${l.v25>0?fmt(l.v25):'—'}</td>
      <td class="${l.var>=0?'pos':'neg'}">${l.v25>0?pct(l.var):'—'}</td>
      <td>${data.ontem.total>0?(l.v26/data.ontem.total*100).toFixed(1).replace('.',',')+'%':'—'}</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot">
      <td>TOTAL</td>
      <td>${fmt(data.ontem.total)}</td>
      <td style="color:#666">${fmt(data.ontem.totalAA)}</td>
      <td class="${data.ontem.yoy>=0?'pos':'neg'}">${pct(data.ontem.yoy)}</td>
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
      <th>Realizado</th>
      <th>YoY (dia ${data.lastDay})</th>
      <th>Meta</th>
      <th>% Ating.</th>
      <th>Tend Fat</th>
      <th>Tend vs AA</th>
      <th>Peso</th>
    </tr>
  </thead>
  <tbody>
    ${data.porLoja.map((l,i) => `
    <tr>
      <td>#${i+1} ${l.loja}</td>
      <td style="font-weight:700">${fmt(l.real)}</td>
      <td class="${l.yoy>=0?'pos':'neg'}">${pct(l.yoy)}</td>
      <td>${l.meta > 0 ? fmt(l.meta) : '—'}</td>
      <td style="font-weight:800;color:${l.ating===null?'#999':l.ating>=100?'#16a34a':l.ating>=80?'#d97706':'#dc2626'}">
        ${l.ating !== null ? l.ating.toFixed(1).replace('.',',')+'%' : '—'}
      </td>
      <td style="font-weight:700">${fmt(l.tend)}</td>
      <td class="${l.tendVsAA>=0?'pos':'neg'}">${pct(l.tendVsAA)}</td>
      <td>${l.share.toFixed(1).replace('.',',')}%</td>
    </tr>`).join('')}
  </tbody>
  <tfoot>
    <tr class="tfoot">
      <td>TOTAL</td>
      <td>${fmt(data.total)}</td>
      <td class="${data.yoy>=0?'pos':'neg'}">${pct(data.yoy)}</td>
      <td>${totalMeta > 0 ? fmt(totalMeta) : '—'}</td>
      <td style="font-weight:800;color:${totalMeta>0&&data.total/totalMeta>=1?'#16a34a':totalMeta>0&&data.total/totalMeta>=0.8?'#d97706':'#dc2626'}">
        ${totalMeta > 0 ? (data.total/totalMeta*100).toFixed(1).replace('.',',')+'%' : '—'}
      </td>
      <td style="font-weight:700">${fmt(data.tendFat)}</td>
      <td class="${data.tendVsAA>=0?'pos':'neg'}">${pct(data.tendVsAA)}</td>
      <td>100%</td>
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
    const recs   = rawData.filter(r => r.Data === data);
    const dAA    = new Date(d); dAA.setFullYear(d.getFullYear() - 1);
    const dataAA = dAA.getFullYear() + '-' + String(dAA.getMonth()+1).padStart(2,'0') + '-' + String(dAA.getDate()).padStart(2,'0');
    const recsAA = rawData.filter(r => r.Data === dataAA);
    const porLoja = lojas.map(loja => ({
      loja,
      v26: sum(recs.filter(r => r.Loja === loja)),
      v25: sum(recsAA.filter(r => r.Loja === loja)),
    })).filter(l => l.v26 > 0 || l.v25 > 0);
    porLoja.forEach(l => { l.yoy = variation(l.v26, l.v25); });
    const total26 = sum(recs), total25 = sum(recsAA);
    return { data, dow, label: DOW_NAMES[dow],
      dataFmt: d.toLocaleDateString('pt-BR',{day:'numeric',month:'short',year:'numeric'}),
      ano: d.getFullYear(), porLoja, total26, total25, yoy: variation(total26, total25) };
  });

  const geradoEm = new Date().toLocaleString('pt-BR');

  function fmt(v) { return formatBRL(v, true); }
  function pct(v) {
    if (v === null || v === undefined) return '—';
    return (v >= 0 ? '+' : '') + v.toFixed(1).replace('.', ',') + '%';
  }

  const css = '* { margin:0; padding:0; box-sizing:border-box; } body { font-family: Arial, sans-serif; font-size: 10px; color: #1a1a1a; background: white; padding: 16px; } .header { display:flex; justify-content:space-between; align-items:center; border-bottom: 3px solid #1F3D2E; padding-bottom: 10px; margin-bottom: 14px; } .header h1 { font-size: 17px; font-weight: 800; color: #1F3D2E; } .header .sub { font-size: 9px; color: #666; margin-top: 2px; } .kpi-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:12px; } .kpi { border:1px solid #e5e5e5; border-radius:8px; padding:9px 11px; } .kpi-label { font-size:8px; font-weight:700; color:#888; text-transform:uppercase; margin-bottom:3px; } .kpi-value { font-size:20px; font-weight:800; } .kpi-var { font-size:9px; font-weight:700; margin-top:3px; } .section-title { font-size:12px; font-weight:700; color:#1F3D2E; border-left:4px solid #97A624; padding-left:8px; margin:14px 0 8px; } table { width:100%; border-collapse:collapse; font-size:10px; margin-bottom:16px; } th { background:#1F3D2E; color:white; font-weight:700; padding:5px 8px; text-align:right; font-size:8px; text-transform:uppercase; } th:first-child { text-align:left; } td { padding:4px 8px; text-align:right; border-bottom:1px solid #f0f0f0; } td:first-child { text-align:left; font-weight:600; } tr:nth-child(even) td { background:#fafafa; } .tfoot td { background:#f0f4ec !important; font-weight:700; border-top:2px solid #1F3D2E; } .pos { color:#16a34a; } .neg { color:#dc2626; } .no-print { margin-bottom:14px; display:flex; gap:8px; } .footer { margin-top:14px; padding-top:8px; border-top:1px solid #e5e5e5; font-size:8px; color:#999; display:flex; justify-content:space-between; } @media print { body { padding:8mm; } .no-print { display:none !important; } @page { size: A4 landscape; margin:8mm; } }';

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
        '<td style="font-weight:700">' + fmt(l.v26) + '</td>' +
        '<td style="color:#999">' + (l.v25>0?fmt(l.v25):'—') + '</td>' +
        '<td class="' + (l.yoy>=0?'pos':'neg') + '">' + (l.v25>0?pct(l.yoy):'—') + '</td>' +
        '<td>' + (d.total26>0?(l.v26/d.total26*100).toFixed(1).replace('.',',')+'%':'—') + '</td></tr>';
    }).join('');
    return '<div class="section-title">' + d.label + ' — ' + d.dataFmt + '</div>' +
      '<table><thead><tr>' +
      '<th style="text-align:left">Loja</th><th>' + d.ano + '</th><th>' + (d.ano-1) + '</th><th>Var. YoY</th><th>Share</th>' +
      '</tr></thead><tbody>' + rows + '</tbody>' +
      '<tfoot><tr class="tfoot">' +
      '<td>TOTAL</td><td>' + fmt(d.total26) + '</td>' +
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
