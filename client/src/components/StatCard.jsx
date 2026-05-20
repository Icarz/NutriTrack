export default function StatCard({ label, value, hint }) {
  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid var(--color-rule)',
        borderRadius: 12,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--color-stone)',
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 700,
          fontSize: 28,
          color: 'var(--color-ink)',
          marginTop: 6,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: 'var(--color-stone)', marginTop: 4 }}>{hint}</div>
      )}
    </div>
  );
}
