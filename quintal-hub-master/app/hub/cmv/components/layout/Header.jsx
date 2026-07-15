import { useState } from 'react';
import { useCMV } from '../../hooks/useCMV';

const TITLES = {
  home:              'Visão Geral',
  rentabilidade:     'Rentabilidade',
  volume:            'Volume × Receita',
  desperdicio:       'Desperdício',
  variacao:          'Variação Semanal',
  delivery_rent:     'Delivery · Rentabilidade',
  delivery_volume:   'Delivery · Volume',
  delivery_variacao: 'Delivery · Variação',
};

const FILTROS_PAGINA = {
  home:              ['categoria', 'cat_contabil'],
  rentabilidade:     ['categoria', 'cat_contabil'],
  volume:            ['categoria', 'cat_contabil', 'semana'],
  desperdicio:       ['mes'],
  variacao:          ['categoria'],
  delivery_rent:     ['semana'],
  delivery_volume:   ['semana'],
  delivery_variacao: ['semana'],
};

export default function Header({ activePage, onMenuClick }) {
  const [filtrosOpen, setFiltrosOpen] = useState(false);
  const {
    opcoesLojas, opcoesCats, opcoesMeses,
    filtroLoja,    setFiltroLoja,
    filtroPeriodo, setFiltroPeriodo,
    filtroCat,     setFiltroCat,
    filtroMes,     setFiltroMes,
    filtroSemana,  setFiltroSemana,
    semanasDisponiveis,
    filtroCatContabil, setFiltroCatContabil,
    opcoesCatContabil,
  } = useCMV();

  const filtrosLocais = FILTROS_PAGINA[activePage] ?? [];

  const semLabels = Object.fromEntries([
    ['atual', 'Semana atual'],
    ['anterior', 'Semana passada'],
    ...(semanasDisponiveis || []).map(s => [s, s.replace(/^\d{4}-W/, 'Sem. ')])
  ]);

  // Conta filtros ativos
  const filtrosAtivos = [
    filtroLoja !== 'Todas',
    filtroPeriodo !== 'Todos',
    filtroCat !== 'Todas',
    filtroMes !== 'Todos',
    filtroSemana !== 'atual',
    filtroCatContabil !== 'Todas',
  ].filter(Boolean).length;

  return (
    <header className="bg-white border-b border-surface-border shrink-0">
      {/* Linha principal */}
      <div className="px-4 h-[54px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger mobile */}
          <button onClick={onMenuClick}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-muted shrink-0">
            <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
              <rect width="16" height="2" rx="1"/>
              <rect y="5" width="16" height="2" rx="1"/>
              <rect y="10" width="16" height="2" rx="1"/>
            </svg>
          </button>
          <h1 className="text-[15px] md:text-[17px] font-bold text-brand-black truncate">
            {TITLES[activePage] ?? 'Dashboard'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Filtros desktop — linha única */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-widest">Global</span>
              <Sel label="Loja"    value={filtroLoja}    onChange={setFiltroLoja}    opts={opcoesLojas}/>
              <Sel label="Período" value={filtroPeriodo} onChange={setFiltroPeriodo} opts={['Todos','Almoço','Jantar/Noite']}/>
            </div>
            {filtrosLocais.length > 0 && <div className="h-6 w-px bg-surface-border"/>}
            {filtrosLocais.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-300 uppercase tracking-widest">Filtrar</span>
                {filtrosLocais.includes('categoria') && (
                  <SelMulti label="Categoria" value={filtroCat} onChange={setFiltroCat} opts={opcoesCats}/>
                )}
                {filtrosLocais.includes('mes') && (
                  <Sel label="Mês" value={filtroMes} onChange={setFiltroMes} opts={opcoesMeses}/>
                )}
                {filtrosLocais.includes('cat_contabil') && (
                  <Sel label="Conta" value={filtroCatContabil} onChange={setFiltroCatContabil} opts={opcoesCatContabil || ['Todas']}/>
                )}
                {filtrosLocais.includes('semana') && (
                  <Sel label="Semana" value={filtroSemana} onChange={setFiltroSemana}
                    opts={['atual','anterior',...(semanasDisponiveis||[])]} labels={semLabels}/>
                )}
              </div>
            )}
          </div>

          {/* Botão filtros mobile */}
          <button onClick={() => setFiltrosOpen(o => !o)}
            className="md:hidden flex items-center gap-1.5 px-3 h-8 rounded-lg border text-[12px] font-medium transition-colors
              border-surface-border hover:border-zinc-400 text-brand-black relative">
            Filtros
            {filtrosAtivos > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-brand-black text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                {filtrosAtivos}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Painel filtros mobile */}
      {filtrosOpen && (
        <div className="md:hidden border-t border-surface-border bg-white px-4 py-3 space-y-3">
          <p className="text-[10px] font-semibold text-zinc-300 uppercase tracking-widest">Global</p>
          <div className="grid grid-cols-2 gap-2">
            <SelFull label="Loja"    value={filtroLoja}    onChange={setFiltroLoja}    opts={opcoesLojas}/>
            <SelFull label="Período" value={filtroPeriodo} onChange={setFiltroPeriodo} opts={['Todos','Almoço','Jantar/Noite']}/>
          </div>
          {filtrosLocais.length > 0 && (
            <>
              <p className="text-[10px] font-semibold text-zinc-300 uppercase tracking-widest pt-1">Filtrar</p>
              <div className="grid grid-cols-2 gap-2">
                {filtrosLocais.includes('categoria') && (
                  <SelFull label="Categoria" value={Array.isArray(filtroCat)?filtroCat[0]||'Todas':filtroCat}
                    onChange={v => setFiltroCat(v)} opts={opcoesCats}/>
                )}
                {filtrosLocais.includes('mes') && (
                  <SelFull label="Mês" value={filtroMes} onChange={setFiltroMes} opts={opcoesMeses}/>
                )}
                {filtrosLocais.includes('cat_contabil') && (
                  <SelFull label="Conta" value={filtroCatContabil} onChange={setFiltroCatContabil} opts={opcoesCatContabil||['Todas']}/>
                )}
                {filtrosLocais.includes('semana') && (
                  <SelFull label="Semana" value={filtroSemana} onChange={setFiltroSemana}
                    opts={['atual','anterior',...(semanasDisponiveis||[])]} labels={semLabels}/>
                )}
              </div>
            </>
          )}
          <button onClick={() => setFiltrosOpen(false)}
            className="w-full h-9 bg-brand-black text-white text-[13px] font-medium rounded-lg mt-2">
            Aplicar
          </button>
        </div>
      )}
    </header>
  );
}

function Sel({ label, value, onChange, opts, labels = {} }) {
  const isActive = value !== opts[0];
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className={`text-[12.5px] border rounded-lg px-2.5 h-8 focus:outline-none cursor-pointer transition-colors
          ${isActive ? 'border-brand-black bg-brand-black text-white font-semibold'
                     : 'border-surface-border bg-white text-brand-black hover:border-zinc-400'}`}>
        {opts.map(o => <option key={o} value={o}>{labels[o] || o}</option>)}
      </select>
    </div>
  );
}

function SelFull({ label, value, onChange, opts, labels = {} }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">{label}</span>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="text-[13px] border border-surface-border rounded-lg px-2.5 h-9 focus:outline-none bg-white text-brand-black w-full">
        {opts.map(o => <option key={o} value={o}>{labels?.[o] || o}</option>)}
      </select>
    </div>
  );
}

function SelMulti({ label, value, onChange, opts }) {
  const selected = value === 'Todas' ? [] : Array.isArray(value) ? value : [value];
  const isActive = selected.length > 0;

  function toggle(cat) {
    if (cat === 'Todas') { onChange('Todas'); return; }
    const next = selected.includes(cat)
      ? selected.filter(c => c !== cat)
      : [...selected, cat];
    onChange(next.length === 0 ? 'Todas' : next);
  }

  const labelDisplay = isActive
    ? selected.length === 1 ? selected[0] : `${selected.length} cats`
    : 'Todas';

  return (
    <div className="flex items-center gap-1.5 relative group">
      <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wide whitespace-nowrap">{label}</span>
      <div className={`relative text-[12.5px] border rounded-lg px-2.5 h-8 flex items-center gap-1.5 cursor-pointer min-w-[110px]
        ${isActive ? 'border-brand-black bg-brand-black text-white font-semibold'
                   : 'border-surface-border bg-white text-brand-black hover:border-zinc-400'}`}>
        <span className="flex-1 whitespace-nowrap truncate">{labelDisplay}</span>
        <span className="text-[10px] opacity-60">▾</span>
        <div className="absolute top-full left-0 mt-1 bg-white border border-surface-border rounded-xl shadow-lg z-50 min-w-[180px] py-1 hidden group-hover:block">
          <button onClick={() => onChange('Todas')}
            className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-muted transition-colors
              ${!isActive ? 'font-semibold text-brand-black' : 'text-zinc-500'}`}>
            Todas
          </button>
          <div className="border-t border-surface-border my-1"/>
          {opts.filter(o => o !== 'Todas').map(cat => (
            <button key={cat} onClick={() => toggle(cat)}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-muted transition-colors flex items-center gap-2
                ${selected.includes(cat) ? 'font-semibold text-brand-black' : 'text-zinc-500'}`}>
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 text-[9px]
                ${selected.includes(cat) ? 'bg-brand-black border-brand-black text-white' : 'border-zinc-300'}`}>
                {selected.includes(cat) ? '✓' : ''}
              </span>
              {cat}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
