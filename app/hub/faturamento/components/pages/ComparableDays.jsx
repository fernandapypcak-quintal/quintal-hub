// src/components/pages/ComparableDays.jsx
import { useMemo } from 'react';
import { useFilters } from '../../hooks/useFilters';
import InfoTip from '../ui/InfoTip';
import {
  sum, variation, daysInMonth, formatBRL, DOW_FULL, DOW_ABREV,
  acharDiaComparavel,
} from '../../utils/formatters';

function getPeriodo(data) {
  if (!data.length) return null;
  const keys = [...new Set(data.map(r => r.Ano_Mes))].sort();
  const key  = keys[keys.length - 1];
  const recs = data.filter(r => r.Ano_Mes === key);
  const [anoS, mesS] = key.split('-');
  const ano  = Number(anoS), mes = Number(mesS);
  const lastDay   = Math.max(...recs.map(r => r.Dia));
  const totalDays = daysInMonth(ano, mes);
  const label     = recs[0]?.Ano_Mes_Label || key;
  return { key, ano, mes, lastDay, totalDays, label };
}

export default function ComparableDays() {
  const { rawData, filters } = useFilters();

  const baseData = useMemo(() => rawData.filter(r => {
    if (filters.lojas.size > 0 && !filters.lojas.has(r.Loja)) return false;
    if (filters.canal !== 'Todos' && r.Canal !== filters.canal)  return false;
    return true;
  }), [rawData, filters]);

  const periodoData = useMemo(() => {
    let data = rawData;
    if (filters.ano !== 'Todos') data = data.filter(r => r.Ano === Number(filters.ano));
    if (filters.meses.size > 0)  data = data.filter(r => filters.meses.has(r.Mes));
    return data;
  }, [rawData, filters]);

  const periodo = useMemo(() => getPeriodo(periodoData), [periodoData]);

  const linhas = useMemo(() => {
    if (!periodo) return [];
    const { ano, mes, lastDay } = periodo;

    return Array.from({ length: lastDay }, (_, i) => {
      const dia = i + 1;
      const dow = new Date(ano, mes - 1, dia).getDay();
      const total = sum(baseData.filter(r => r.Ano === ano && r.Mes === mes && r.Dia === dia));

      const comp = acharDiaComparavel(ano, mes, dia);
      let totalComp = null, compLabel = null;
      if (comp) {
        totalComp = sum(baseData.filter(r => r.Ano === comp.ano && r.Mes === comp.mes && r.Dia === comp.dia));
        compLabel = `${String(comp.dia).padStart(2,'0')}/${String(comp.mes).padStart(2,'0')}/${comp.ano}`;
      }

      return {
        dia, dow, dowLabel: DOW_ABREV[dow], dowLabelFull: DOW_FULL[dow],
        total, totalComp, compLabel,
        ocorrenciaAproximada: comp?.ocorrenciaAproximada || false,
        var: totalComp !== null ? variation(total, totalComp) : null,
      };
    });
  }, [baseData, periodo]);

  const totalAtual = useMemo(() => linhas.reduce((s, l) => s + l.total, 0), [linhas]);
  const totalComparavel = useMemo(() => linhas.reduce((s, l) => s + (l.totalComp || 0), 0), [linhas]);
  const varTotal = variation(totalAtual, totalComparavel);

  if (!periodo) {
    return <div className="p-6 text-sm text-zinc-400">Sem dados para o período selecionado.</div>;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-brand-black">Dia Comparável — {periodo.label}</h1>
          <InfoTip text="Compara cada dia do mês com a mesma OCORRÊNCIA daquele dia da semana no ano anterior — ex: o 3º sábado de agosto/26 vs o 3º sábado de agosto/25 — em vez do mesmo dia do calendário. Faz mais sentido pro negócio, já que sábado se comporta como sábado independente da data exata." />
        </div>
        <p className="text-xs text-zinc-400 mt-1">
          Cada dia do mês comparado com a mesma posição do dia da semana no ano anterior (ex: 3º sábado vs 3º sábado), não com a mesma data.
        </p>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">{periodo.label}</div>
          <div className="text-xl font-bold text-brand-black">{formatBRL(totalAtual, true)}</div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Comparável {periodo.ano - 1}</div>
          <div className="text-xl font-bold text-zinc-400">{formatBRL(totalComparavel, true)}</div>
        </div>
        <div className="bg-surface-card border border-surface-border rounded-2xl p-4">
          <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">Variação</div>
          <div className={`text-xl font-bold ${varTotal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {varTotal >= 0 ? '+' : ''}{varTotal.toFixed(1).replace('.', ',')}%
          </div>
        </div>
      </div>

      {/* Tabela dia a dia */}
      <div className="bg-surface-card border border-surface-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border bg-surface-muted/30">
              <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Dia</th>
              <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Dia da Semana</th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Faturamento {periodo.ano}</th>
              <th className="text-left py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Dia Correspondente {periodo.ano - 1}</th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Faturamento {periodo.ano - 1}</th>
              <th className="text-right py-3 px-4 text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Variação</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map(l => (
              <tr key={l.dia} className="border-b border-surface-border/50 hover:bg-surface-muted/20 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-brand-black">{String(l.dia).padStart(2,'0')}/{String(periodo.mes).padStart(2,'0')}</td>
                <td className="py-2.5 px-4 text-zinc-500">{l.dowLabelFull}</td>
                <td className="py-2.5 px-4 text-right font-mono font-semibold text-brand-black">{l.total > 0 ? formatBRL(l.total, true) : '—'}</td>
                <td className="py-2.5 px-4 text-zinc-400">
                  {l.compLabel || '—'}
                  {l.ocorrenciaAproximada && <span className="ml-1 text-[10px] text-amber-600" title="Mês do ano anterior teve menos ocorrências desse dia da semana — usada a última disponível">≈</span>}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-zinc-400">{l.totalComp > 0 ? formatBRL(l.totalComp, true) : '—'}</td>
                <td className="py-2.5 px-4 text-right">
                  {l.var !== null && l.total > 0 && l.totalComp > 0 ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${l.var >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                      {l.var >= 0 ? '▲' : '▼'} {Math.abs(l.var).toFixed(1).replace('.', ',')}%
                    </span>
                  ) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-surface-muted/40 font-semibold">
              <td className="py-3 px-4 text-brand-black" colSpan={2}>TOTAL</td>
              <td className="py-3 px-4 text-right font-mono text-brand-black">{formatBRL(totalAtual, true)}</td>
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 text-right font-mono text-zinc-500">{formatBRL(totalComparavel, true)}</td>
              <td className="py-3 px-4 text-right">
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${varTotal >= 0 ? 'text-emerald-700 bg-emerald-50' : 'text-rose-700 bg-rose-50'}`}>
                  {varTotal >= 0 ? '▲' : '▼'} {Math.abs(varTotal).toFixed(1).replace('.', ',')}%
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
