const STATUS_COLORS = {
  active: 'bg-emerald-100 text-emerald-800',
  new: 'bg-purple-100 text-purple-800',
  paused: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
};

export default function Badge({ status }) {
  const cls = STATUS_COLORS[status] || 'bg-gray-100 text-gray-800';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>
      {status}
    </span>
  );
}
