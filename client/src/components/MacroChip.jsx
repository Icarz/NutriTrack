const PALETTE = {
  P: 'bg-rose-100 text-rose-700',
  C: 'bg-amber-100 text-amber-700',
  F: 'bg-sky-100 text-sky-700',
};

export default function MacroChip({ label, value }) {
  const cls = PALETTE[label] || 'bg-gray-100 text-gray-700';
  const v = value == null || value === '' ? 0 : Number(value);
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${cls}`}>
      {label} {Math.round(v)}g
    </span>
  );
}
