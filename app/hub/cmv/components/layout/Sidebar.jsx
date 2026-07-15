import { useState } from 'react';
import { LayoutDashboard, BarChart3, Trash2, TrendingUp } from 'lucide-react';

const NAV_SALAO = [
  { id: 'home',        label: 'Visão Geral',      icon: LayoutDashboard },
  { id: 'rentabilidade', label: 'Rentabilidade',  icon: BarChart3 },
  { id: 'volume',      label: 'Volume × Receita', icon: TrendingUp },
  { id: 'desperdicio', label: 'Desperdício',       icon: Trash2 },
  { id: 'variacao',    label: 'Variação Semanal',  icon: BarChart3 },
];

const NAV_DELIVERY = [
  { id: 'delivery_rent',    label: 'Rentabilidade',  icon: BarChart3 },
  { id: 'delivery_volume',  label: 'Volume × Receita', icon: TrendingUp },
  { id: 'delivery_variacao',label: 'Variação Semanal', icon: BarChart3 },
];

export default function Sidebar({ activePage, onPageChange }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex flex-col bg-white border-r border-surface-border shrink-0 transition-all duration-300 h-full ${collapsed ? 'w-16' : 'w-56'}`}
      style={{minHeight:'100vh'}}>

      {/* Logo */}
      <div className={`flex items-center border-b border-surface-border bg-brand-black ${collapsed ? 'justify-center px-3 py-4' : 'px-4 py-3'}`}>
        {collapsed
          ? <img src="/logo.png" alt="Quintal do Espeto" className="w-8 h-8 object-contain"/>
          : <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Quintal do Espeto" className="h-9 w-9 object-contain flex-shrink-0"/>
              <div>
                <div className="text-white font-bold text-sm leading-tight">CMV</div>
                <div className="text-zinc-400 text-[10px] leading-tight">Quintal do Espeto</div>
              </div>
            </div>
        }
      </div>

      {/* Salão */}
      <div className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 pb-2">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Salão</span>
            <span className="w-1.5 h-1.5 rounded-full bg-brand-olive"/>
          </div>
        )}
        {NAV_SALAO.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button key={id} onClick={() => onPageChange(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all
                ${collapsed ? 'justify-center' : ''}
                ${active
                  ? 'bg-brand-black text-white'
                  : 'text-zinc-500 hover:text-brand-black hover:bg-surface-muted'}`}>
              <Icon size={15} />
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-olive" />}
            </button>
          );
        })}

        {/* Divisor Delivery */}
        <div className={`pt-4 pb-1 ${collapsed ? 'px-1' : 'px-3'}`}>
          {collapsed
            ? <div className="border-t border-surface-border"/>
            : <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-widest">Delivery</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"/>
              </div>
          }
        </div>

        {/* Delivery — ativo */}
        {NAV_DELIVERY.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button key={id} onClick={() => onPageChange(id)}
              title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all
                ${collapsed ? 'justify-center' : ''}
                ${active
                  ? 'bg-brand-black text-white'
                  : 'text-zinc-500 hover:text-brand-black hover:bg-surface-muted'}`}>
              <Icon size={15}/>
              {!collapsed && <span>{label}</span>}
              {!collapsed && active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400"/>}
            </button>
          );
        })}
      </div>

      {/* Collapse */}
      <div className="px-2 py-3 border-t border-surface-border">
        <button onClick={() => setCollapsed(c => !c)}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-zinc-400
            hover:text-zinc-700 hover:bg-surface-muted transition-all ${collapsed ? 'justify-center' : ''}`}>
          {collapsed
            ? <span>→</span>
            : <><span>←</span><span>Recolher</span></>}
        </button>
      </div>
    </aside>
  );
}
