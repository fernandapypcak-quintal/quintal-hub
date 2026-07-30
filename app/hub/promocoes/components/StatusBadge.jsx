// app/hub/promocoes/components/StatusBadge.jsx
export default function StatusBadge({ cmvPct }) {
  if (!isFinite(cmvPct)) {
    return <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-zinc-50 text-zinc-400 border-zinc-100">—</span>
  }
  const status = cmvPct >= 0.80 ? 'Crítico' : cmvPct >= 0.35 ? 'Atenção' : 'OK'
  const cls = cmvPct >= 0.80
    ? 'bg-red-50 text-brand-crimson border-red-100'
    : cmvPct >= 0.35
    ? 'bg-amber-50 text-amber-700 border-amber-100'
    : 'bg-green-50 text-brand-olive border-green-100'
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls}`}>
      {status}
    </span>
  )
}
