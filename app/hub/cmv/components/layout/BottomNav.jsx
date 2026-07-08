import { LayoutDashboard, BarChart3, TrendingUp, Trash2, Truck } from 'lucide-react';

const NAV = [
  { id: 'home',             label: 'Geral',       icon: LayoutDashboard },
  { id: 'rentabilidade',    label: 'Rentab.',     icon: BarChart3 },
  { id: 'volume',           label: 'Volume',      icon: TrendingUp },
  { id: 'desperdicio',      label: 'Desperd.',    icon: Trash2 },
  { id: 'delivery_rent',    label: 'Delivery',    icon: Truck },
];

export default function BottomNav({ activePage, onPageChange }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: '#0D0D0D', borderTop: '1px solid #222',
      display: 'flex', alignItems: 'stretch', height: 60,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV.map(({ id, label, icon: Icon }) => {
        const active = activePage === id;
        return (
          <button key={id} onClick={() => onPageChange(id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer',
            background: 'transparent', color: active ? '#97A624' : '#666',
            transition: 'color 0.15s',
          }}>
            <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
