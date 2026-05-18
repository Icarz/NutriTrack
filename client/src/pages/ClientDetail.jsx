import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import WeightChart from '../components/WeightChart';
import GoalProgressBar from '../components/GoalProgressBar';
import Badge from '../components/Badge';
import { getClient } from '../api/clients';
import { getActivePlan } from '../api/plans';
import { getLogs } from '../api/logs';
import { getGoal } from '../api/goals';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PREVIEW_DAYS = 4;

function initials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase() || '?';
}

function fmtDate(iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', opts);
}

async function safe404(promise) {
  try {
    return await promise;
  } catch (e) {
    if (e?.response?.status === 404) return null;
    throw e;
  }
}

export default function ClientDetail() {
  const { id: clientId } = useParams();

  const [client, setClient] = useState(null);
  const [logs, setLogs] = useState([]);
  const [logSummary, setLogSummary] = useState(null);
  const [goal, setGoal] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const c = await getClient(clientId);
        if (cancelled) return;
        setClient(c);

        const [l, g, p] = await Promise.all([
          safe404(getLogs(clientId)),
          safe404(getGoal(clientId)),
          safe404(getActivePlan(clientId)),
        ]);
        if (cancelled) return;
        const logsArr = Array.isArray(l) ? l : l?.logs || [];
        setLogs(logsArr);
        setLogSummary(l?.summary || null);
        setGoal(g);
        setActivePlan(p);
      } catch (e) {
        if (!cancelled) {
          if (e?.response?.status === 404) setError('not_found');
          else setError(e.response?.data?.error || e.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) return <LoadingSkeleton />;

  if (error === 'not_found' || !client) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6 flex flex-col items-center justify-center">
          <p className="text-gray-700 mb-3">Client not found</p>
          <Link to="/dashboard" className="text-blue-600 hover:underline">
            Back to dashboard
          </Link>
        </main>
      </div>
    );
  }

  const startWeight = Number(client.start_weight);
  const latestLog = logs[0] || null;
  const currentWeight =
    latestLog && latestLog.weight != null ? Number(latestLog.weight) : startWeight;
  const lostKg = startWeight - currentWeight;
  const status = logSummary?.is_overdue && client.status === 'active' ? 'overdue' : client.status;
  const progressPct = logSummary?.progress_pct != null ? Number(logSummary.progress_pct) : null;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1200px]">
        {error && error !== 'not_found' && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        {/* 1. HEADER */}
        <section className="bg-white border rounded p-5 mb-6">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-sm font-medium">
                {initials(client.name)}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-base font-medium">{client.name}</span>
                  <Badge status={status} />
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  {[
                    client.gender,
                    client.age != null ? `${client.age}y` : null,
                    client.height_cm != null ? `${client.height_cm} cm` : null,
                    client.created_at ? `Started ${fmtDate(client.created_at)}` : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/clients/${clientId}/edit`}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
              >
                Edit profile
              </Link>
              <Link
                to={`/clients/${clientId}/log`}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
              >
                Log visit
              </Link>
              <Link
                to={`/clients/${clientId}/plan/new`}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
                New plan
              </Link>
            </div>
          </div>
        </section>

        {logSummary?.is_overdue && (
          <div
            role="alert"
            className="mb-6 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded text-sm"
          >
            Last visit was {logSummary.days_since_last_log} days ago — consider scheduling a check-in
          </div>
        )}

        {/* 2. STAT CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatBox label="Start weight" value={`${client.start_weight ?? '—'} kg`} />
          <StatBox
            label="Current weight"
            value={`${latestLog ? currentWeight : (client.start_weight ?? '—')} kg`}
            sub={
              latestLog && lostKg > 0
                ? `−${lostKg.toFixed(1)} kg lost`
                : null
            }
            subColor="text-green-700"
          />
          <StatBox
            label="Target weight"
            value={goal?.target_weight != null ? `${goal.target_weight} kg` : '—'}
            sub={goal?.target_date ? `By ${fmtDate(goal.target_date)}` : null}
          />
          <StatBox
            label="Goal progress"
            value={progressPct != null ? `${Math.round(progressPct)}%` : '0%'}
            valueColor={progressPct != null && progressPct >= 50 ? 'text-green-700' : 'text-amber-700'}
          />
        </div>

        {/* 3. WEIGHT CHART */}
        <section className="bg-white border rounded p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Weight over time</h2>
            <span className="text-xs text-gray-500">Last {logs.length} sessions</span>
          </div>
          <WeightChart
            logs={[...logs].reverse()}
            targetWeight={goal?.target_weight ?? null}
            startWeight={client.start_weight}
          />
        </section>

        {/* 4. TWO-COLUMN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="bg-white border rounded p-5">
            <h2 className="text-lg font-semibold mb-4">Goal breakdown</h2>
            <GoalProgressBar
              startWeight={client.start_weight}
              currentWeight={latestLog?.weight ?? client.start_weight}
              targetWeight={goal?.target_weight ?? null}
              targetDate={goal?.target_date ?? null}
              createdAt={client.created_at}
              showDetails={true}
            />
            <div className="mt-5 pt-5 border-t">
              <h3 className="text-sm font-medium mb-3">Macro targets</h3>
              <MacroBars activePlan={activePlan} goal={goal} />
            </div>
          </section>

          <section className="bg-white border rounded p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h2 className="text-lg font-semibold">Visit log</h2>
              <Link
                to={`/clients/${clientId}/log`}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
              >
                Log visit
              </Link>
            </div>
            <VisitLog logs={logs} />
          </section>
        </div>

        {/* 5. ACTIVE PLAN PREVIEW */}
        <section className="bg-white border rounded p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-semibold">Current diet plan</h2>
            {activePlan && (
              <div className="flex gap-2">
                <Link
                  to={`/clients/${clientId}/plan/${activePlan.id}`}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View full plan
                </Link>
                <Link
                  to={`/clients/${clientId}/plan/new`}
                  className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
                >
                  New plan
                </Link>
              </div>
            )}
          </div>
          {activePlan ? (
            <PlanPreview plan={activePlan} />
          ) : (
            <EmptyPlanState clientId={clientId} />
          )}
        </section>
      </main>
    </div>
  );
}

function StatBox({ label, value, sub, subColor, valueColor }) {
  return (
    <div className="bg-white border rounded p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className={`text-2xl font-semibold mt-1 ${valueColor || 'text-gray-900'}`}>
        {value}
      </div>
      {sub && <div className={`text-xs mt-1 ${subColor || 'text-gray-500'}`}>{sub}</div>}
    </div>
  );
}

const MACROS = [
  { key: 'protein', label: 'Protein', goalKey: 'protein_g', color: '#7C3AED' },
  { key: 'carbs', label: 'Carbs', goalKey: 'carbs_g', color: '#1D9E75' },
  { key: 'fat', label: 'Fat', goalKey: 'fat_g', color: '#BA7517' },
  { key: 'fiber', label: 'Fiber', goalKey: 'fiber_g', color: '#0F5132' },
];

function MacroBars({ activePlan, goal }) {
  const averages = activePlan?.weekly_averages || activePlan?.macro_averages || null;
  if (!averages || !goal) {
    return <div className="text-sm text-gray-400">No data yet</div>;
  }
  return (
    <div className="space-y-2">
      {MACROS.map((m) => {
        const avg = Number(averages[m.key] ?? averages[`${m.key}_g`] ?? 0);
        const target = Number(goal[m.goalKey] ?? 0);
        if (!target) return null;
        const pct = Math.min(100, (avg / target) * 100);
        const over = m.key === 'carbs' && avg > target;
        const fill = over ? '#DC2626' : m.color;
        return (
          <div key={m.key} className="flex items-center gap-2 text-xs">
            <div className="w-[52px] text-gray-600">{m.label}</div>
            <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
              <div className="h-full rounded" style={{ width: `${pct}%`, background: fill }} />
            </div>
            <div className="w-[88px] text-right tabular-nums text-gray-600">
              {avg.toFixed(0)}g / {target}g
            </div>
          </div>
        );
      })}
    </div>
  );
}

function VisitLog({ logs }) {
  if (!logs || logs.length === 0) {
    return <div className="text-sm text-gray-400 text-center py-8">No visits logged yet</div>;
  }
  const items = logs.slice(0, 8);
  return (
    <ul className="space-y-3">
      {items.map((l, idx) => {
        const delta = l.weight_delta != null ? Number(l.weight_delta) : null;
        const measurements = [
          l.waist_cm != null ? `Waist ${l.waist_cm}` : null,
          l.hips_cm != null ? `Hips ${l.hips_cm}` : null,
        ]
          .filter(Boolean)
          .join(' · ');
        const note = (l.session_notes || '').slice(0, 60);
        return (
          <li key={l.id} className="flex items-start gap-3">
            <span
              className={`mt-1.5 inline-block w-2 h-2 rounded-full ${
                idx === 0 ? 'bg-green-600' : 'bg-gray-300'
              }`}
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs text-gray-500">{fmtDate(l.log_date)}</span>
                <span className="text-sm">
                  {l.weight != null && (
                    <span className="font-semibold tabular-nums">{l.weight} kg</span>
                  )}
                  {delta != null && (
                    <span
                      className={`ml-2 text-[11px] px-1.5 py-0.5 rounded ${
                        delta < 0
                          ? 'bg-green-100 text-green-800'
                          : delta > 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {delta > 0 ? '+' : ''}
                      {delta.toFixed(1)} kg
                    </span>
                  )}
                </span>
              </div>
              {measurements && (
                <div className="text-xs text-gray-500 mt-0.5">{measurements}</div>
              )}
              {note && (
                <div className="text-xs text-gray-600 mt-0.5 truncate">
                  {note}
                  {l.session_notes && l.session_notes.length > 60 ? '…' : ''}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function PlanPreview({ plan }) {
  return (
    <>
      <p className="text-sm text-gray-500 mb-3">
        Week of <span className="font-medium">{fmtDate(plan.week_start)}</span>
      </p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: PREVIEW_DAYS }, (_, i) => {
          const dayBucket = plan.meals?.find((d) => d.day === i);
          const dayMeals = (dayBucket?.meals || []).slice(0, 4);
          return (
            <div key={i} className="border rounded p-3 min-h-[140px]">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                {DAY_NAMES[i]}
              </div>
              {dayMeals.length === 0 ? (
                <div className="text-xs text-gray-400 italic">Rest day</div>
              ) : (
                <ul className="space-y-1.5">
                  {dayMeals.map((m) => (
                    <li key={m.id} className="text-xs">
                      <div className="font-medium truncate">{m.description}</div>
                      <div className="text-gray-500 tabular-nums">
                        {Math.round(Number(m.calories) || 0)} kcal
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function EmptyPlanState({ clientId }) {
  return (
    <div className="text-center py-12">
      <div className="text-5xl mb-3 opacity-50" aria-hidden="true">
        🥗
      </div>
      <p className="text-gray-500 mb-4">No diet plan yet</p>
      <Link
        to={`/clients/${clientId}/plan/new`}
        className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
      >
        Create first plan
      </Link>
    </div>
  );
}

function LoadingSkeleton() {
  const box = 'bg-gray-100 animate-pulse rounded';
  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1200px]">
        <div className={`${box} h-24 mb-6`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className={`${box} h-24`} />
          <div className={`${box} h-24`} />
          <div className={`${box} h-24`} />
          <div className={`${box} h-24`} />
        </div>
        <div className={`${box} h-48 mb-6`} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className={`${box} h-64`} />
          <div className={`${box} h-64`} />
        </div>
        <div className={`${box} h-56`} />
      </main>
    </div>
  );
}
