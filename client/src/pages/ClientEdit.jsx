import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Sidebar from '../components/Sidebar';
import ClientForm, { validateClient } from '../components/ClientForm';
import { getClient, updateClient, deleteClient } from '../api/clients';
import { getGoal, saveGoal } from '../api/goals';
import { useToast } from '../components/Toast';

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function ClientEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { t } = useTranslation();

  const [client, setClient] = useState(null);
  const [goal, setGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({
    target_weight: '',
    target_date: '',
    daily_calories: '',
    protein_g: '',
    carbs_g: '',
    fat_g: '',
    notes: '',
  });
  const [goalErr, setGoalErr] = useState(null);
  const [savingGoal, setSavingGoal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    document.title = client?.name
      ? `${client.name} — Edit | NutriTrack`
      : 'Edit Client | NutriTrack';
  }, [client]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getClient(id), getGoal(id)])
      .then(([c, g]) => {
        if (cancelled) return;
        setClient(c);
        setGoal(g);
        if (g) {
          setGoalForm({
            target_weight: g.target_weight ?? '',
            target_date: g.target_date ? String(g.target_date).slice(0, 10) : '',
            daily_calories: g.daily_calories ?? '',
            protein_g: g.protein_g ?? '',
            carbs_g: g.carbs_g ?? '',
            fat_g: g.fat_g ?? '',
            notes: g.notes ?? '',
          });
        }
      })
      .catch((e) => {
        if (!cancelled) setError(e.response?.data?.error || e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleClientSubmit(payload) {
    await updateClient(id, payload);
    showToast(t('clientForm.editClient'), 'success');
    navigate(`/clients/${id}`);
  }

  function validateGoal() {
    setGoalErr(null);
    const tw = parseFloat(goalForm.target_weight);
    const sw = parseFloat(client?.start_weight);
    if (goalForm.target_weight === '') return true; // optional if nothing entered
    if (isNaN(tw) || tw <= 0) {
      setGoalErr(t('clientForm.errors.targetWeightRequired'));
      return false;
    }
    if (!isNaN(sw) && tw >= sw) {
      setGoalErr(t('clientForm.errors.targetWeightDirection'));
      return false;
    }
    if (!goalForm.target_date) {
      setGoalErr(t('clientForm.errors.targetDateRequired'));
      return false;
    }
    if (new Date(goalForm.target_date) <= new Date()) {
      setGoalErr(t('clientForm.errors.targetDateFuture'));
      return false;
    }
    if (goalForm.daily_calories !== '') {
      const dc = toNum(goalForm.daily_calories);
      if (dc == null || dc < 500 || dc > 5000) {
        setGoalErr('Daily calories must be 500–5000');
        return false;
      }
    }
    return true;
  }

  async function handleGoalSave(e) {
    e.preventDefault();
    if (!validateGoal()) return;
    setSavingGoal(true);
    try {
      const saved = await saveGoal(id, {
        target_weight: toNum(goalForm.target_weight),
        target_date: goalForm.target_date || null,
        daily_calories: toNum(goalForm.daily_calories),
        protein_g: toNum(goalForm.protein_g),
        carbs_g: toNum(goalForm.carbs_g),
        fat_g: toNum(goalForm.fat_g),
        notes: goalForm.notes || null,
      });
      setGoal(saved);
      showToast('Goal updated', 'success');
    } catch (err) {
      setGoalErr(err.response?.data?.error || err.message);
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteClient(id);
      showToast('Client deleted', 'success');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setDeleting(false);
    }
  }

  const upd = (k) => (e) => setGoalForm({ ...goalForm, [k]: e.target.value });
  const input = 'border border-gray-300 rounded p-2 text-sm w-full';

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1100px]">
        <Link to={`/clients/${id}`} className="text-sm text-blue-600 hover:underline">
          ← {t('common.backToClients')}
        </Link>
        <h1 className="text-2xl font-bold mt-2 mb-6">{t('clientForm.editClient')}</h1>

        {loading && <p className="text-sm text-gray-500">{t('common.loading')}</p>}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm mb-4">
            {error}
          </div>
        )}

        {client && (
          <>
            <section className="bg-white border rounded p-6 mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
                {t('clientForm.sections.personalInfo')}
              </h2>
              <ClientForm
                initial={client}
                submitLabel={t('clientForm.save')}
                onSubmit={handleClientSubmit}
              />
            </section>

            <section className="bg-white border rounded p-6 mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-4">
                {t('clientForm.sections.goal')}
              </h2>
              <form onSubmit={handleGoalSave} className="space-y-4 max-w-2xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block text-sm">
                    <span className="block font-medium mb-1">{t('clientForm.fields.targetWeight')}</span>
                    <input type="number" step="0.1" className={input} value={goalForm.target_weight} onChange={upd('target_weight')} />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-medium mb-1">{t('clientForm.fields.targetDate')}</span>
                    <input type="date" className={input} value={goalForm.target_date} onChange={upd('target_date')} />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-medium mb-1">{t('clientForm.fields.dailyCalories')}</span>
                    <input type="number" className={input} value={goalForm.daily_calories} onChange={upd('daily_calories')} />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-medium mb-1">{t('clientForm.fields.protein')}</span>
                    <input type="number" className={input} value={goalForm.protein_g} onChange={upd('protein_g')} />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-medium mb-1">{t('clientForm.fields.carbs')}</span>
                    <input type="number" className={input} value={goalForm.carbs_g} onChange={upd('carbs_g')} />
                  </label>
                  <label className="block text-sm">
                    <span className="block font-medium mb-1">{t('clientForm.fields.fat')}</span>
                    <input type="number" className={input} value={goalForm.fat_g} onChange={upd('fat_g')} />
                  </label>
                </div>
                <label className="block text-sm">
                  <span className="block font-medium mb-1">Notes</span>
                  <textarea className={input} rows={2} value={goalForm.notes} onChange={upd('notes')} />
                </label>
                {goalErr && <div className="text-xs text-red-600">{goalErr}</div>}
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="px-4 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  {savingGoal ? t('clientForm.saving') : t('clientForm.save')}
                </button>
              </form>
            </section>

            <section className="bg-white border border-red-200 rounded p-6">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-red-600 mb-3">
                {t('clientForm.deleteClient')}
              </h2>
              {confirmingDelete ? (
                <div>
                  <p className="text-sm text-gray-700 mb-3">
                    {t('clientForm.deleteConfirm')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={deleting}
                      className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                    >
                      {deleting ? t('clientForm.saving') : t('clientForm.deleteYes')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingDelete(false)}
                      disabled={deleting}
                      className="px-4 py-2 border rounded text-sm hover:bg-gray-100"
                    >
                      {t('clientForm.cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded hover:bg-red-50"
                >
                  {t('clientForm.deleteClient')}
                </button>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}

// silence unused warning if linter complains
void validateClient;
