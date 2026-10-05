// src/components/ui/ExportPorLoja.jsx
// Exporta o faturamento por loja (Salão e Delivery separados) pros meses
// selecionados no filtro. Respeita filtro de ano, meses e lojas — mas
// IGNORA o filtro de canal de propósito, já que a ideia é sempre trazer
// Salão e Delivery lado a lado.
//
// Abas do Excel:
//   • "Por Loja"    — uma linha por Mês × Loja, com subtotal por mês
//   • "Consolidado" — soma dos meses selecionados por loja (só se >1 mês)
import { useState } from 'react';
import { Download } from 'lucide-react';
import { useFilters } from '../../hooks/useFilters';
import { useMetas } from '../../hooks/useMetas';

const FMT_BRL = '"R$" #,##0.00';
const FMT_PCT = '0.0%';

const HEADERS = [
  'Mês', 'Loja', 'Dados até dia', 'Salão', 'Delivery', 'Total',
  '% Delivery', 'Meta', '% Ating.', 'Total AA (mesmo corte)', 'YoY %',
];
// Índices de coluna por formato
const COLS_BRL = [3, 4, 5, 7, 9];
const COLS_PCT = [6, 8, 10];

const soma = (recs) => recs.reduce((s, r) => s + (r.Valor || 0), 0);
const div  = (a, b) => (b ? a / b : null);

function linhaExcel(mes, loja, ateDia, salao, delivery, total, meta, aa) {
  return [
    mes, loja, ateDia,
    salao, delivery, total,
    div(delivery, total),
    meta || null,
    meta ? total / meta : null,
    aa || null,
    aa ? total / aa - 1 : null,
  ];
}

function montarAba(XLSX, linhas, linhasTotal) {
  const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...linhas]);
  linhas.forEach((_, i) => {
    const r = i + 1;
    COLS_BRL.forEach((c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = FMT_BRL;
    });
    COLS_PCT.forEach((c) => {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number') cell.z = FMT_PCT;
    });
  });
  ws['!cols'] = [
    { wch: 9 }, { wch: 16 }, { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
    { wch: 11 }, { wch: 16 }, { wch: 10 }, { wch: 22 }, { wch: 9 },
  ];
  ws['!autofilter'] = { ref: `A1:K${linhas.length + 1}` };
  return ws;
}

export default function ExportPorLoja() {
  const { rawData, filters } = useFilters();
  const { getMeta } = useMetas();
  const [gerando, setGerando] = useState(false);

  async function exportar() {
    if (!rawData.length) return;
    setGerando(true);
    try {
      const mod  = await import('xlsx');
      const XLSX = mod.utils ? mod : mod.default; // ESM ou CJS, conforme o bundler

      const base = rawData.filter((r) => filters.lojas.size === 0 || filters.lojas.has(r.Loja));

      // Meses a exportar: os selecionados no filtro (respeitando o ano).
      // Sem mês selecionado → só o mês mais recente (igual a página).
      let meses = [...new Set(
        base
          .filter((r) => filters.ano === 'Todos' || r.Ano === Number(filters.ano))
          .filter((r) => filters.meses.size === 0 || filters.meses.has(r.Mes))
          .map((r) => r.Ano_Mes)
      )].sort();
      if (filters.meses.size === 0 && meses.length) meses = [meses[meses.length - 1]];
      if (!meses.length) { alert('Nenhum dado para os filtros selecionados.'); return; }

      const linhas = [];
      const consolidado = {}; // loja → somas
      const labels = [];

      meses.forEach((anoMes) => {
        const [ano, mes] = anoMes.split('-').map(Number);
        const recs = base.filter((r) => r.Ano_Mes === anoMes);
        if (!recs.length) return;
        const label   = recs[0].Ano_Mes_Label || anoMes;
        const lastDay = Math.max(...recs.map((r) => r.Dia));
        labels.push(label);

        const porLoja = [...new Set(recs.map((r) => r.Loja))].map((loja) => {
          const rl       = recs.filter((r) => r.Loja === loja);
          const salao    = soma(rl.filter((r) => r.Canal === 'CASA'));
          const delivery = soma(rl.filter((r) => r.Canal === 'DELIVERY'));
          const total    = soma(rl);
          // AA cortado no mesmo dia do mês atual (igual ao YoY da tela)
          const aa = soma(base.filter((r) =>
            r.Ano === ano - 1 && r.Mes === mes && r.Loja === loja && r.Dia <= lastDay
          ));
          const meta = getMeta(anoMes, loja) || 0;
          return { loja, salao, delivery, total, aa, meta };
        }).sort((a, b) => b.total - a.total);

        porLoja.forEach((l) => {
          linhas.push(linhaExcel(label, l.loja, lastDay, l.salao, l.delivery, l.total, l.meta, l.aa));
          const c = consolidado[l.loja] || (consolidado[l.loja] = { salao: 0, delivery: 0, total: 0, meta: 0, aa: 0 });
          c.salao += l.salao; c.delivery += l.delivery; c.total += l.total; c.meta += l.meta; c.aa += l.aa;
        });

        const t = porLoja.reduce((acc, l) => {
          acc.salao += l.salao; acc.delivery += l.delivery; acc.total += l.total; acc.meta += l.meta; acc.aa += l.aa;
          return acc;
        }, { salao: 0, delivery: 0, total: 0, meta: 0, aa: 0 });
        linhas.push(linhaExcel(label, `TOTAL ${label}`, lastDay, t.salao, t.delivery, t.total, t.meta, t.aa));
        linhas.push([]); // linha em branco entre meses
      });
      if (linhas.length && linhas[linhas.length - 1].length === 0) linhas.pop();

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, montarAba(XLSX, linhas), 'Por Loja');

      if (labels.length > 1) {
        const periodo = `${labels[0]} a ${labels[labels.length - 1]}`;
        const cons = Object.entries(consolidado)
          .sort(([, a], [, b]) => b.total - a.total)
          .map(([loja, c]) => linhaExcel(periodo, loja, '', c.salao, c.delivery, c.total, c.meta, c.aa));
        const tc = Object.values(consolidado).reduce((acc, c) => {
          acc.salao += c.salao; acc.delivery += c.delivery; acc.total += c.total; acc.meta += c.meta; acc.aa += c.aa;
          return acc;
        }, { salao: 0, delivery: 0, total: 0, meta: 0, aa: 0 });
        cons.push(linhaExcel(periodo, 'TOTAL', '', tc.salao, tc.delivery, tc.total, tc.meta, tc.aa));
        XLSX.utils.book_append_sheet(wb, montarAba(XLSX, cons), 'Consolidado');
      }

      const sufixo = (labels.length > 1 ? `${labels[0]}_a_${labels[labels.length - 1]}` : labels[0]).replace(/\//g, '-');
      XLSX.writeFile(wb, `faturamento_por_loja_${sufixo}.xlsx`);
    } catch (e) {
      console.error('[ExportPorLoja]', e);
      alert('Não foi possível gerar o Excel: ' + e.message);
    } finally {
      setGerando(false);
    }
  }

  return (
    <button
      onClick={exportar}
      disabled={gerando || !rawData.length}
      title="Exportar faturamento por loja (Salão e Delivery separados) dos meses selecionados"
      className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl border border-surface-border text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-50"
    >
      <Download size={13} />
      <span>{gerando ? 'Gerando…' : 'Exportar Excel'}</span>
    </button>
  );
}
