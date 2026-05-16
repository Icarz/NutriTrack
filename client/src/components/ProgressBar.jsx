export default function ProgressBar({ pct }) {
  const value = pct == null ? null : Math.max(0, Math.min(100, pct));
  const color = value == null ? 'bg-gray-300' : value >= 50 ? 'bg-emerald-500' : 'bg-amber-500';
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 h-2 bg-gray-200 rounded">
        <div
          className={`h-2 rounded ${color}`}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
      <span className="text-xs text-gray-600 w-10 text-right">
        {value == null ? '—' : `${value}%`}
      </span>
    </div>
  );
}
