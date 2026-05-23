import { useEffect, useState } from 'react';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  resetPassword,
} from '../api/admin';

const PLAN_FILTERS = ['all', 'trial', 'solo', 'growth', 'suspended'];

function formatLastActive(date) {
  if (!date) return { text: 'Never', color: 'text-gray-400' };
  const days = Math.floor((Date.now() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (days <= 0) return { text: 'Today', color: 'text-green-600' };
  if (days <= 7) return { text: `${days}d ago`, color: 'text-green-600' };
  if (days <= 30) return { text: `${days}d ago`, color: 'text-amber-600' };
  return { text: new Date(date).toLocaleDateString(), color: 'text-gray-400' };
}

function num(v) {
  return !v ? '—' : v;
}

const PLAN_COLORS = {
  trial: 'bg-amber-100 text-amber-800',
  solo: 'bg-green-100 text-green-800',
  growth: 'bg-purple-100 text-purple-800',
};

function PlanBadge({ plan }) {
  const cls = PLAN_COLORS[plan] || 'bg-gray-100 text-gray-800';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${cls}`}>{plan}</span>;
}

function StatusBadge({ active }) {
  return active ? (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Active</span>
  ) : (
    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Suspended</span>
  );
}

const emptyForm = { name: '', email: '', password: '', plan: 'trial' };

export default function AdminPanel() {
  const [secret, setSecret] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [confirmId, setConfirmId] = useState(null);
  const [editingPlan, setEditingPlan] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [resetFormId, setResetFormId] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetErr, setResetErr] = useState('');
  const [resetSavedId, setResetSavedId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'Admin | NutriTrack';
  }, []);

  useEffect(() => {
    const initial = {};
    accounts.forEach((a) => {
      initial[a.id] = {
        plan: a.plan,
        plan_expires_at: a.plan_expires_at?.split('T')[0] ?? '',
      };
    });
    setEditingPlan(initial);
  }, [accounts]);

  const isDirty = (account) => {
    const edit = editingPlan[account.id];
    if (!edit) return false;
    const originalExpiry = account.plan_expires_at?.split('T')[0] ?? '';
    return edit.plan !== account.plan || edit.plan_expires_at !== originalExpiry;
  };

  async function handleSavePlan(id) {
    setSavingId(id);
    setError('');
    try {
      const edit = editingPlan[id];
      await updateAccount(secret, id, {
        plan: edit.plan,
        plan_expires_at: edit.plan_expires_at || null,
      });
      setAccounts((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, plan: edit.plan, plan_expires_at: edit.plan_expires_at }
            : a
        )
      );
      setSavedId(id);
      setTimeout(() => setSavedId(null), 2000);
    } catch (e) {
      handleError(e);
    } finally {
      setSavingId(null);
    }
  }

  function handleError(e) {
    if (e?.response?.status === 403) setError('Wrong admin secret');
    else setError(e?.response?.data?.error || e?.message || 'Request failed');
  }

  async function load() {
    if (!secret) return;
    setError('');
    setLoading(true);
    try {
      const data = await getAccounts(secret);
      setAccounts(Array.isArray(data) ? data : data.nutritionists || []);
      setLoaded(true);
    } catch (e) {
      handleError(e);
      setAccounts([]);
      setLoaded(false);
    } finally {
      setLoading(false);
    }
  }

  function handleLoad() {
    if (!secret) return;
    load();
  }

  async function onCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await createAccount(secret, form);
      setForm(emptyForm);
      load();
    } catch (e) {
      handleError(e);
    }
  }

  async function toggleActive(acc) {
    setError('');
    try {
      await updateAccount(secret, acc.id, { is_active: !acc.is_active });
      load();
    } catch (e) {
      handleError(e);
    }
  }

  function toggleResetForm(id) {
    setResetErr('');
    setNewPassword('');
    setResetFormId((prev) => (prev === id ? null : id));
  }

  async function handleResetPassword(id) {
    setResetErr('');
    if (newPassword.length < 12) {
      setResetErr('Password must be at least 12 characters');
      return;
    }
    setResettingId(id);
    try {
      await resetPassword(secret, id, newPassword);
      setResetSavedId(id);
      setTimeout(() => {
        setResetSavedId(null);
        setResetFormId(null);
        setNewPassword('');
      }, 2000);
    } catch (e) {
      setResetErr(e?.response?.data?.error || 'Failed to update password');
    } finally {
      setResettingId(null);
    }
  }

  const filtered = accounts
    .filter(
      (a) =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.email.toLowerCase().includes(search.toLowerCase())
    )
    .filter((a) => {
      if (planFilter === 'all') return true;
      if (planFilter === 'suspended') return !a.is_active;
      return a.plan === planFilter;
    });

  async function onDelete(id) {
    setError('');
    try {
      await deleteAccount(secret, id);
      setConfirmId(null);
      load();
    } catch (e) {
      handleError(e);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6">NutriTrack Admin</h1>

        <div className="flex gap-3 items-center mb-6">
          <input
            type="password"
            placeholder="Enter admin secret"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLoad()}
            className="border border-gray-200 rounded px-3 py-2 text-sm w-80"
          />
          <button
            onClick={handleLoad}
            disabled={!secret || loading}
            className="px-4 py-2 bg-green-700 text-white text-sm rounded hover:bg-green-800 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Load accounts'}
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {loaded && (
          <>
            <form onSubmit={onCreate} className="mb-6 p-4 bg-white border border-gray-200 rounded">
              <h2 className="font-semibold mb-3">Create account</h2>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <input
                  required
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  required
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <input
                  required
                  type="password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                />
                <select
                  value={form.plan}
                  onChange={(e) => setForm({ ...form, plan: e.target.value })}
                  className="border border-gray-300 rounded px-3 py-2"
                >
                  <option value="trial">trial</option>
                  <option value="solo">solo</option>
                  <option value="growth">growth</option>
                </select>
                <button
                  type="submit"
                  className="bg-gray-900 text-white rounded px-4 py-2 hover:bg-gray-800"
                >
                  Create account
                </button>
              </div>
            </form>

            <div className="flex gap-6 text-sm text-gray-500 mb-3">
              <span>{accounts.length} accounts</span>
              <span>
                {accounts.reduce((s, a) => s + (a.client_count || 0), 0)} total clients
              </span>
              <span>
                {accounts.reduce((s, a) => s + (a.total_plans || 0), 0)} diet plans created
              </span>
              <span>
                {accounts.reduce((s, a) => s + (a.total_logs || 0), 0)} visits logged
              </span>
            </div>

            <div className="mb-3 flex flex-wrap items-center gap-3">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="border border-gray-300 rounded px-3 py-2 text-sm w-64"
              />
              <div className="flex gap-1">
                {PLAN_FILTERS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPlanFilter(p)}
                    className={`text-xs px-3 py-1 rounded-full border ${
                      planFilter === p
                        ? 'bg-gray-900 text-white border-gray-900'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100'
                    }`}
                  >
                    {p === 'all' ? 'All' : p[0].toUpperCase() + p.slice(1)}
                  </button>
                ))}
              </div>
              <span className="text-xs text-gray-500 ml-auto">
                {filtered.length} of {accounts.length}
              </span>
            </div>

            <div className="bg-white border border-gray-200 rounded overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Expiry</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Clients</th>
                    <th
                      className="px-4 py-2"
                      title="Total weekly diet plans created across all clients"
                    >
                      Diet plans
                    </th>
                    <th
                      className="px-4 py-2"
                      title="Total visit logs recorded across all clients"
                    >
                      Visits
                    </th>
                    <th className="px-4 py-2">Last active</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded && filtered.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-6 text-center text-gray-500">
                        {accounts.length === 0 ? 'No accounts yet' : 'No accounts match'}
                      </td>
                    </tr>
                  )}
                  {filtered.map((a) => (
                    <tr key={a.id} className="border-t border-gray-200">
                      <td className="px-4 py-2">{a.name}</td>
                      <td className="px-4 py-2">{a.email}</td>
                      <td className="px-4 py-2"><PlanBadge plan={a.plan} /></td>
                      <td className="px-4 py-2 text-xs text-gray-600 tabular-nums">
                        {a.plan_expires_at
                          ? new Date(a.plan_expires_at).toLocaleDateString()
                          : '—'}
                      </td>
                      <td className="px-4 py-2"><StatusBadge active={a.is_active} /></td>
                      <td className="px-4 py-2 tabular-nums">{num(a.client_count)}</td>
                      <td className="px-4 py-2 tabular-nums">{num(a.total_plans)}</td>
                      <td className="px-4 py-2 tabular-nums">{num(a.total_logs)}</td>
                      <td className={`px-4 py-2 text-xs tabular-nums ${formatLastActive(a.last_activity).color}`}>
                        {formatLastActive(a.last_activity).text}
                      </td>
                      <td className="py-3 px-4">
                        {confirmId === a.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-700">Are you sure?</span>
                            <button
                              onClick={() => onDelete(a.id)}
                              className="text-xs px-2 py-1 bg-red-600 text-white rounded"
                            >
                              Yes delete
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              className="text-xs px-2 py-1 bg-gray-200 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {/* Row 1: Plan management */}
                            <div className="flex items-center gap-2">
                              <select
                                value={editingPlan[a.id]?.plan ?? a.plan}
                                onChange={(e) =>
                                  setEditingPlan((prev) => ({
                                    ...prev,
                                    [a.id]: { ...prev[a.id], plan: e.target.value },
                                  }))
                                }
                                className="text-xs border border-gray-200 rounded px-2 py-1 bg-white w-24"
                              >
                                <option value="trial">Trial</option>
                                <option value="solo">Solo</option>
                                <option value="growth">Growth</option>
                              </select>
                              <input
                                type="date"
                                value={editingPlan[a.id]?.plan_expires_at ?? ''}
                                onChange={(e) =>
                                  setEditingPlan((prev) => ({
                                    ...prev,
                                    [a.id]: { ...prev[a.id], plan_expires_at: e.target.value },
                                  }))
                                }
                                className="text-xs border border-gray-200 rounded px-2 py-1"
                                title="Plan expiry date (optional)"
                              />
                              {isDirty(a) && (
                                <button
                                  onClick={() => handleSavePlan(a.id)}
                                  disabled={savingId === a.id}
                                  className="text-xs px-2 py-1 rounded bg-green-600 text-white whitespace-nowrap disabled:opacity-50"
                                >
                                  {savingId === a.id ? 'Saving...' : 'Save'}
                                </button>
                              )}
                              {savedId === a.id && (
                                <span className="text-xs text-green-600">Saved ✓</span>
                              )}
                            </div>

                            {/* Row 2: Account actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => toggleResetForm(a.id)}
                                className="text-xs px-2 py-1 rounded border border-gray-300 hover:border-gray-500 whitespace-nowrap"
                              >
                                Reset pwd
                              </button>
                              <button
                                onClick={() => toggleActive(a)}
                                className="text-xs px-2 py-1 rounded border border-gray-300 hover:border-gray-500"
                              >
                                {a.is_active ? 'Suspend' : 'Reactivate'}
                              </button>
                              <button
                                onClick={() => setConfirmId(a.id)}
                                className="text-xs px-2 py-1 rounded border border-red-300 text-red-600 hover:bg-red-50 whitespace-nowrap"
                              >
                                Delete
                              </button>
                            </div>

                            {/* Row 3: Reset password inline form */}
                            {resetFormId === a.id && (
                              <div className="flex items-center gap-2 mt-1 p-2 bg-gray-50 rounded border border-gray-200 flex-wrap">
                                <input
                                  type="password"
                                  placeholder="New password (min 12)"
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  className="text-xs border border-gray-200 rounded px-2 py-1 w-44"
                                />
                                <button
                                  onClick={() => handleResetPassword(a.id)}
                                  disabled={newPassword.length < 12 || resettingId === a.id}
                                  className="text-xs px-2 py-1 bg-green-600 text-white rounded disabled:opacity-50 whitespace-nowrap"
                                >
                                  {resettingId === a.id ? 'Saving…' : 'Set password'}
                                </button>
                                <button
                                  onClick={() => setResetFormId(null)}
                                  className="text-xs text-gray-400 hover:text-gray-600"
                                >
                                  Cancel
                                </button>
                                {resetSavedId === a.id && (
                                  <span className="text-xs text-green-600 font-medium">
                                    Password updated ✓
                                  </span>
                                )}
                                {resetErr && (
                                  <span className="text-xs text-red-600">{resetErr}</span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
