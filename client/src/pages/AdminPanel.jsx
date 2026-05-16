import { useEffect, useState } from 'react';
import {
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../api/admin';

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

  function handleError(e) {
    if (e?.response?.status === 403) setError('Wrong admin secret');
    else setError(e?.response?.data?.error || e?.message || 'Request failed');
  }

  async function load() {
    if (!secret) return;
    setError('');
    try {
      const data = await getAccounts(secret);
      setAccounts(Array.isArray(data) ? data : data.nutritionists || []);
      setLoaded(true);
    } catch (e) {
      handleError(e);
      setAccounts([]);
    }
  }

  useEffect(() => {
    if (secret) load();
  }, [secret]);

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

        <div className="mb-6">
          <label className="block text-sm font-medium mb-1">Admin secret</label>
          <input
            type="password"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter admin secret"
            className="w-full max-w-md border border-gray-300 rounded px-3 py-2"
          />
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {secret && (
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

            <div className="bg-white border border-gray-200 rounded overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-100 text-left">
                  <tr>
                    <th className="px-4 py-2">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Plan</th>
                    <th className="px-4 py-2">Status</th>
                    <th className="px-4 py-2">Clients</th>
                    <th className="px-4 py-2">Created</th>
                    <th className="px-4 py-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loaded && accounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-gray-500">
                        No accounts yet
                      </td>
                    </tr>
                  )}
                  {accounts.map((a) => (
                    <tr key={a.id} className="border-t border-gray-200">
                      <td className="px-4 py-2">{a.name}</td>
                      <td className="px-4 py-2">{a.email}</td>
                      <td className="px-4 py-2"><PlanBadge plan={a.plan} /></td>
                      <td className="px-4 py-2"><StatusBadge active={a.is_active} /></td>
                      <td className="px-4 py-2">{a.client_count ?? 0}</td>
                      <td className="px-4 py-2">
                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-2">
                        {confirmId === a.id ? (
                          <span className="flex gap-2 items-center">
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
                          </span>
                        ) : (
                          <span className="flex gap-2">
                            <button
                              onClick={() => toggleActive(a)}
                              className="text-xs px-2 py-1 border border-gray-300 rounded hover:bg-gray-100"
                            >
                              {a.is_active ? 'Suspend' : 'Reactivate'}
                            </button>
                            <button
                              onClick={() => setConfirmId(a.id)}
                              className="text-xs px-2 py-1 border border-red-300 text-red-700 rounded hover:bg-red-50"
                            >
                              Delete
                            </button>
                          </span>
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
