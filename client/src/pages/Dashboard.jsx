import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import ClientRow from '../components/ClientRow';
import { getClients } from '../api/clients';

export default function Dashboard() {
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const data = await getClients();
        setClients(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e?.response?.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        setError(e?.response?.data?.error || 'Failed to load clients');
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const stats = useMemo(() => {
    const total = clients.length;
    const activePlans = clients.filter((c) => c.has_active_plan).length;
    const withPct = clients
      .map((c) => (c.current_progress_pct != null ? Number(c.current_progress_pct) : null))
      .filter((v) => v != null && Number.isFinite(v));
    const avgProgress = withPct.length
      ? Math.round(withPct.reduce((s, v) => s + v, 0) / withPct.length)
      : null;
    const checkInsThisWeek = clients.reduce((s, c) => s + (c.logs_this_week || 0), 0);
    return { total, activePlans, avgProgress, checkInsThisWeek };
  }, [clients]);

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <button
            onClick={() => navigate('/clients/new')}
            className="bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800"
          >
            New client
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Total clients" value={stats.total} />
          <StatCard label="Active plans" value={stats.activePlans} />
          <StatCard
            label="Avg goal progress"
            value={stats.avgProgress == null ? '—' : `${stats.avgProgress}%`}
          />
          <StatCard label="Check-ins this week" value={stats.checkInsThisWeek} />
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="bg-white border border-gray-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-left">
              <tr>
                <th className="px-4 py-2">Client</th>
                <th className="px-4 py-2">Goal progress</th>
                <th className="px-4 py-2">Last check-in</th>
                <th className="px-4 py-2">Current weight</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              )}
              {!loading && clients.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No clients yet</td></tr>
              )}
              {clients.map((c) => <ClientRow key={c.id} client={c} />)}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
