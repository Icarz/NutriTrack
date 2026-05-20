const STATUS_STYLES = {
  active: { background: '#ECF2ED', color: '#2E8B5F' },
  new: { background: '#F1E8FA', color: '#6B36A8' },
  paused: { background: '#FBEFD6', color: '#92651A' },
  overdue: { background: '#FBE0DA', color: '#B43A2E' },
};

export default function Badge({ status }) {
  const s = STATUS_STYLES[status] || { background: '#EFEDE6', color: '#4F544C' };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        textTransform: 'capitalize',
        fontFamily: "'Inter', system-ui, sans-serif",
        background: s.background,
        color: s.color,
      }}
    >
      {status}
    </span>
  );
}
