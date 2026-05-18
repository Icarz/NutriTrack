import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from 'recharts';

const GREEN = '#1D9E75';
const RED = '#D85A30';

function formatTick(date) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function formatTooltipLabel(date) {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function CustomDot(props) {
  const { cx, cy, index, totalCount } = props;
  if (cx == null || cy == null) return null;
  const isLast = index === totalCount - 1;
  if (isLast) {
    return (
      <circle cx={cx} cy={cy} r={6} fill={GREEN} stroke="#ffffff" strokeWidth={2} />
    );
  }
  return <circle cx={cx} cy={cy} r={4} fill={GREEN} />;
}

export default function WeightChart({ logs, targetWeight, startWeight }) {
  if (!logs || logs.length < 2) {
    return (
      <div className="flex items-center justify-center h-[160px] text-sm text-gray-400">
        Not enough data yet — log at least 2 visits to see the chart
      </div>
    );
  }

  const weights = logs.map((l) => Number(l.weight));
  const lowerCandidate = targetWeight != null ? Number(targetWeight) : Number(startWeight);
  const yMin = Math.floor(Math.min(lowerCandidate, ...weights)) - 2;
  const yMax = Math.ceil(Number(startWeight)) + 2;

  const totalCount = logs.length;

  return (
    <div>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={logs} margin={{ top: 10, right: 40, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="log_date"
            tickFormatter={formatTick}
            tick={{ fontSize: 10, fill: '#888' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 10, fill: '#888' }}
            tickCount={4}
            axisLine={false}
            tickLine={false}
            width={32}
          />
          <Tooltip
            contentStyle={{
              background: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: 6,
              padding: '6px 10px',
              fontSize: 12,
              boxShadow: 'none',
            }}
            formatter={(value) => [`${value} kg`, 'Weight']}
            labelFormatter={formatTooltipLabel}
          />
          {targetWeight != null && (
            <ReferenceLine
              y={Number(targetWeight)}
              stroke={RED}
              strokeDasharray="4 3"
              strokeOpacity={0.5}
              label={{
                value: 'target',
                position: 'right',
                fontSize: 9,
                fill: RED,
                opacity: 0.7,
              }}
            />
          )}
          <Line
            type="linear"
            dataKey="weight"
            stroke={GREEN}
            strokeWidth={2}
            isAnimationActive={false}
            dot={(p) => <CustomDot key={p.index} {...p} totalCount={totalCount} />}
            activeDot={{ r: 6, fill: GREEN }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-2 text-[11px] text-gray-500">
        <div className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            style={{ display: 'inline-block', width: 14, height: 2, background: GREEN }}
          />
          <span>Actual weight</span>
        </div>
        {targetWeight != null && (
          <div className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 14,
                height: 0,
                borderTop: `2px dashed ${RED}`,
              }}
            />
            <span>Target ({targetWeight} kg)</span>
          </div>
        )}
      </div>
    </div>
  );
}
