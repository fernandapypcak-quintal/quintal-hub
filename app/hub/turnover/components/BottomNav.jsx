export default function BottomNav({ pagina, setPagina }) {
  const NAV = [
    { id: 'rh',    label: 'Turnover & HC',     icone: '👥' },
    { id: 'custo', label: 'Custos com Pessoas', icone: '💰' },
  ];
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
      background: '#0D0D0D', borderTop: '1px solid #222',
      display: 'flex', alignItems: 'stretch', height: 60,
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {NAV.map(({ id, label, icone }) => {
        const active = pagina === id;
        return (
          <button key={id} onClick={() => setPagina(id)} style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 3, border: 'none', cursor: 'pointer',
            background: active ? '#1a1a1a' : 'transparent',
            color: active ? '#97A624' : '#666', transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 20 }}>{icone}</span>
            <span style={{ fontSize: 9, fontWeight: active ? 700 : 400, letterSpacing: '0.02em' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
