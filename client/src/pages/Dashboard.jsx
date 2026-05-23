import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import ClientRow from '../components/ClientRow';
import { SkeletonStatCards, SkeletonClientRow } from '../components/Skeleton';
import { getClients } from '../api/clients';

const FILTER_KEYS = ['all', 'active', 'new', 'paused', 'overdue'];

const SORT_DEFAULT = 'default';
const SORT_NAME_ASC = 'name_asc';
const SORT_NAME_DESC = 'name_desc';
const SORT_LAST_LOG_ASC = 'last_log_asc';

function compareDefault(a, b) {
  const aOver = a.is_overdue ? 1 : 0;
  const bOver = b.is_overdue ? 1 : 0;
  if (aOver !== bOver) return bOver - aOver;
  const ad = a.last_log_date ? new Date(a.last_log_date).getTime() : 0;
  const bd = b.last_log_date ? new Date(b.last_log_date).getTime() : 0;
  return ad - bd;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState(SORT_DEFAULT);

  useEffect(() => {
    document.title = 'Dashboard | NutriTrack';
  }, []);

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
        setError(e?.response?.data?.error || t('dashboard.loadFailed'));
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const stats = useMemo(() => {
    const total = clients.length;
    const activePlans = clients.filter((c) => c.has_active_plan).length;
    const withGoals = clients.filter(
      (c) => c.current_progress_pct !== null && c.current_progress_pct !== undefined
    );
    const avgProgress = withGoals.length
      ? Math.round(
          withGoals.reduce((s, c) => s + Number(c.current_progress_pct), 0) / withGoals.length
        )
      : 0;
    const checkInsThisWeek = clients.reduce((s, c) => s + (c.logs_this_week ?? 0), 0);
    return { total, activePlans, avgProgress, checkInsThisWeek };
  }, [clients]);

  const visibleClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clients.filter((c) => {
      if (q && !c.name?.toLowerCase().includes(q)) return false;
      if (filter === 'all') return true;
      if (filter === 'overdue') return !!c.is_overdue;
      return c.status === filter;
    });

    if (sort === SORT_NAME_ASC) {
      rows = [...rows].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sort === SORT_NAME_DESC) {
      rows = [...rows].sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    } else if (sort === SORT_LAST_LOG_ASC) {
      rows = [...rows].sort((a, b) => {
        const aOver = a.is_overdue ? 1 : 0;
        const bOver = b.is_overdue ? 1 : 0;
        if (aOver !== bOver) return bOver - aOver;
        const ad = a.last_log_date ? new Date(a.last_log_date).getTime() : 0;
        const bd = b.last_log_date ? new Date(b.last_log_date).getTime() : 0;
        return ad - bd;
      });
    } else {
      rows = [...rows].sort(compareDefault);
    }
    return rows;
  }, [clients, search, filter, sort]);

  const cycleClientSort = () =>
    setSort((s) => (s === SORT_NAME_ASC ? SORT_NAME_DESC : SORT_NAME_ASC));
  const setLastLogSort = () => setSort(SORT_LAST_LOG_ASC);

  const sortIndicator = (cols) => {
    if (cols === 'name') {
      if (sort === SORT_NAME_ASC) return ' ↑';
      if (sort === SORT_NAME_DESC) return ' ↓';
      return '';
    }
    if (cols === 'last_log' && sort === SORT_LAST_LOG_ASC) return ' ↑';
    return '';
  };

  return (
    <div className="flex bg-gray-50 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
          <button
            onClick={() => navigate('/clients/new')}
            className="bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800"
          >
            {t('dashboard.newClient')}
          </button>
        </div>

        {loading ? (
          <SkeletonStatCards />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label={t('dashboard.totalClients')} value={stats.total} />
            <StatCard label={t('dashboard.activePlans')} value={stats.activePlans} />
            <StatCard label={t('dashboard.avgGoalProgress')} value={`${stats.avgProgress}%`} />
            <StatCard label={t('dashboard.checkInsThisWeek')} value={stats.checkInsThisWeek} />
          </div>
        )}

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            {FILTER_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={
                  filter === key
                    ? 'px-3 py-1 text-sm rounded-full bg-gray-900 text-white'
                    : 'px-3 py-1 text-sm rounded-full bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'
                }
              >
                {t(`dashboard.filters.${key}`)}
              </button>
            ))}
          </div>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('dashboard.searchPlaceholder')}
            className="px-3 py-1.5 text-sm border border-gray-200 rounded w-64 max-w-full"
          />
        </div>

        {!loading && clients.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded p-12 text-center">
            <div className="text-5xl mb-3 opacity-60" aria-hidden="true">👥</div>
            <h2 className="text-lg font-semibold text-gray-800">{t('dashboard.noClientsYet')}</h2>
            <p className="text-sm text-gray-500 mt-1 mb-4">
              {t('dashboard.noClientsSubtext')}
            </p>
            <button
              onClick={() => navigate('/clients/new')}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              {t('dashboard.addClient')}
            </button>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 text-left">
                <tr>
                  <th
                    className="px-4 py-2 cursor-pointer select-none"
                    onClick={cycleClientSort}
                  >
                    {t('dashboard.columns.client')}{sortIndicator('name')}
                  </th>
                  <th className="px-4 py-2">{t('dashboard.columns.goalProgress')}</th>
                  <th
                    className="px-4 py-2 cursor-pointer select-none"
                    onClick={setLastLogSort}
                  >
                    {t('dashboard.columns.lastCheckIn')}{sortIndicator('last_log')}
                  </th>
                  <th className="px-4 py-2">{t('dashboard.columns.currentWeight')}</th>
                  <th className="px-4 py-2">{t('dashboard.columns.status')}</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  Array.from({ length: 6 }).map((_, i) => <SkeletonClientRow key={i} />)}
                {!loading && visibleClients.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                      {t('dashboard.noClientsMatch')}
                    </td>
                  </tr>
                )}
                {!loading &&
                  visibleClients.map((c) => <ClientRow key={c.id} client={c} />)}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
