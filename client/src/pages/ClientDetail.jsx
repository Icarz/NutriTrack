import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getClient } from '../api/clients';
import { getActivePlan } from '../api/plans';

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PREVIEW_DAYS = 4;

function formatWeekStart(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ClientDetail() {
  const { id: clientId } = useParams();
  const [client, setClient] = useState(null);
  const [activePlan, setActivePlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [c, p] = await Promise.all([getClient(clientId), getActivePlan(clientId)]);
        if (cancelled) return;
        setClient(c);
        setActivePlan(p);
      } catch (e) {
        if (!cancelled) setError(e.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6">Loading…</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1200px]">
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to clients
        </Link>

        <header className="mt-2 mb-6">
          <h1 className="text-2xl font-bold">{client?.name || 'Client'}</h1>
          {client && (
            <p className="text-sm text-gray-600 mt-1">
              {client.email || 'No email'}
              {client.age ? ` · ${client.age}y` : ''}
              {client.gender ? ` · ${client.gender}` : ''}
            </p>
          )}
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

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

function PlanPreview({ plan }) {
  return (
    <>
      <p className="text-sm text-gray-500 mb-3">
        Week of <span className="font-medium">{formatWeekStart(plan.week_start)}</span>
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
