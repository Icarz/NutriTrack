import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { getClient } from '../api/clients';
import { getGoal } from '../api/plans';
import { getLogs, createLog } from '../api/logs';

const MS_DAY = 1000 * 60 * 60 * 24;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const da = new Date(a);
  const db = new Date(b);
  da.setHours(0, 0, 0, 0);
  db.setHours(0, 0, 0, 0);
  return Math.floor((db - da) / MS_DAY);
}

function formatLongDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

export default function ProgressLog() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();

  const [client, setClient] = useState(null);
  const [goal, setGoal] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [weight, setWeight] = useState('');
  const [logDate, setLogDate] = useState(todayIso());
  const [waistCm, setWaistCm] = useState('');
  const [hipsCm, setHipsCm] = useState('');
  const [armsCm, setArmsCm] = useState('');
  const [sessionNotes, setSessionNotes] = useState('');
  const [planAdjustments, setPlanAdjustments] = useState('');
  const [nextAppointment, setNextAppointment] = useState('');

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [c, g, l] = await Promise.all([
          getClient(clientId),
          getGoal(clientId),
          getLogs(clientId),
        ]);
        if (cancelled) return;
        setClient(c);
        setGoal(g);
        setLogs(Array.isArray(l) ? l : l?.logs || []);
      } catch (e) {
        if (!cancelled) setLoadError(e.response?.data?.error || e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  const prev = logs[0] || null;
  const weightNum = toNum(weight);
  const startWeight = client?.start_weight != null ? Number(client.start_weight) : null;
  const targetWeight = goal?.target_weight != null ? Number(goal.target_weight) : null;

  const liveDelta = useMemo(() => {
    if (weightNum == null || !prev || prev.weight == null) return null;
    return round1(weightNum - Number(prev.weight));
  }, [weightNum, prev]);

  const lastVisitDays = prev ? daysBetween(prev.log_date, todayIso()) : null;

  const liveCurrent = weightNum ?? (prev?.weight != null ? Number(prev.weight) : null);
  const totalLost =
    startWeight != null && liveCurrent != null ? round1(startWeight - liveCurrent) : null;
  const remaining =
    liveCurrent != null && targetWeight != null
      ? round1(liveCurrent - targetWeight)
      : null;

  const progressPct = useMemo(() => {
    if (
      startWeight == null ||
      targetWeight == null ||
      liveCurrent == null ||
      startWeight === targetWeight
    ) {
      return null;
    }
    let p = ((startWeight - liveCurrent) / (startWeight - targetWeight)) * 100;
    if (p < 0) p = 0;
    if (p > 100) p = 100;
    return round1(p);
  }, [startWeight, targetWeight, liveCurrent]);

  const pace = useMemo(() => {
    if (
      !goal?.target_date ||
      !client?.created_at ||
      progressPct == null ||
      weightNum == null
    ) {
      return null;
    }
    const totalDays = daysBetween(client.created_at, goal.target_date);
    const elapsed = daysBetween(client.created_at, todayIso());
    if (totalDays <= 0) return null;
    const expected = (elapsed / totalDays) * 100;
    if (progressPct >= expected * 0.9) return { label: 'On track', tone: 'green' };
    return { label: 'Behind', tone: 'amber' };
  }, [goal, client, progressPct, weightNum]);

  const daysToTarget = goal?.target_date ? daysBetween(todayIso(), goal.target_date) : null;

  function validate() {
    const e = {};
    const w = toNum(weight);
    if (w == null || w <= 0) {
      e.weight = 'Weight is required and must be a positive number';
    } else if (w < 20 || w > 300) {
      e.weight = 'Weight must be between 20 and 300 kg';
    }
    if (!logDate || logDate > todayIso()) e.logDate = 'Visit date cannot be in the future';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    setSaveError(null);
    try {
      await createLog(clientId, {
        log_date: logDate,
        weight: toNum(weight),
        waist_cm: toNum(waistCm),
        hips_cm: toNum(hipsCm),
        arms_cm: toNum(armsCm),
        session_notes: sessionNotes || null,
        plan_adjustments: planAdjustments || null,
        next_appointment: nextAppointment || null,
      });
      navigate(`/clients/${clientId}`);
    } catch (e) {
      setSaveError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 p-6">Loading…</main>
      </div>
    );
  }

  const subtitle = prev
    ? `${client?.name || 'Client'} · last visit ${lastVisitDays} day${lastVisitDays === 1 ? '' : 's'} ago`
    : `${client?.name || 'Client'} · First visit`;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-6 max-w-[1400px]">
        <Link to={`/clients/${clientId}`} className="text-sm text-blue-600 hover:underline">
          ← Back to client
        </Link>

        <header className="mt-2 mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Log visit</h1>
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to={`/clients/${clientId}`}
              className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              {saving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {saving ? 'Saving…' : 'Save visit'}
            </button>
          </div>
        </header>

        {loadError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {loadError}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Panel title="Weight & measurements">
              {prev && (
                <div className="mb-4 px-3 py-2 bg-gray-100 rounded text-xs text-gray-600 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="font-medium text-gray-700">Previous visit</span>
                  <span>{formatLongDate(prev.log_date)}</span>
                  <span className="tabular-nums">Weight: {prev.weight} kg</span>
                  {prev.waist_cm != null && <span>Waist: {prev.waist_cm} cm</span>}
                  {prev.hips_cm != null && <span>Hips: {prev.hips_cm} cm</span>}
                  {prev.arms_cm != null && <span>Arms: {prev.arms_cm} cm</span>}
                </div>
              )}

              <Field label="Visit date" error={errors.logDate}>
                <input
                  type="date"
                  value={logDate}
                  max={todayIso()}
                  onChange={(e) => setLogDate(e.target.value)}
                  className="border rounded p-2 text-sm w-full md:w-56"
                />
              </Field>

              <Field
                label={
                  <span className="flex items-center gap-2">
                    Weight (kg) <span className="text-red-500">*</span>
                    {liveDelta != null && weight !== '' && <DeltaBadge delta={liveDelta} />}
                  </span>
                }
                error={errors.weight}
                hint={
                  <span>
                    Last: <b>{prev?.weight ?? '—'}</b> kg · Start:{' '}
                    <b>{client?.start_weight ?? '—'}</b> kg · Target:{' '}
                    <b>{goal?.target_weight ?? '—'}</b> kg
                  </span>
                }
              >
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className={`border rounded p-2 text-sm w-full md:w-56 ${
                    errors.weight ? 'border-red-400' : 'border-gray-300'
                  }`}
                />
              </Field>

              <div className="mt-4">
                <p className="text-sm font-medium mb-2">
                  Measurements <span className="text-gray-400 text-xs">(optional)</span>
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <NumField label="Waist (cm)" value={waistCm} onChange={setWaistCm} />
                  <NumField label="Hips (cm)" value={hipsCm} onChange={setHipsCm} />
                  <NumField label="Arms (cm)" value={armsCm} onChange={setArmsCm} />
                </div>
              </div>
            </Panel>

            <Panel title="Session notes">
              <Field label="How is the client feeling?">
                <textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. energy levels up, sleeping better, struggling with weekends..."
                  className="w-full border rounded p-2 text-sm"
                />
              </Field>
              <Field label="Plan adjustments this session">
                <textarea
                  value={planAdjustments}
                  onChange={(e) => setPlanAdjustments(e.target.value)}
                  rows={3}
                  placeholder="e.g. increased protein target, added rest-day meal plan..."
                  className="w-full border rounded p-2 text-sm"
                />
              </Field>
              <Field label="Next appointment">
                <input
                  type="date"
                  value={nextAppointment}
                  onChange={(e) => setNextAppointment(e.target.value)}
                  className="border rounded p-2 text-sm w-full md:w-56"
                />
              </Field>
            </Panel>

            {saveError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {saveError}
              </div>
            )}
          </div>

          <div className="space-y-6">
            <Panel title="Goal snapshot">
              <KV label="Start weight" value={startWeight != null ? `${startWeight} kg` : '—'} />
              <KV
                label="Current (this visit)"
                value={liveCurrent != null ? `${liveCurrent} kg` : '—'}
                highlight
              />
              <KV
                label="Target"
                value={targetWeight != null ? `${targetWeight} kg` : 'No goal set'}
                muted={targetWeight == null}
              />
              <KV label="Total lost" value={totalLost != null ? `${totalLost} kg` : '—'} />
              <KV label="Remaining" value={remaining != null ? `${remaining} kg` : '—'} />

              {progressPct != null && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span className="tabular-nums">{progressPct}%</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded overflow-hidden">
                    <div
                      className={`h-full ${progressPct >= 50 ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              {pace && (
                <div
                  className={`mt-3 inline-block px-2 py-0.5 rounded text-xs font-medium ${
                    pace.tone === 'green'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {pace.label}
                </div>
              )}

              {goal?.target_date && (
                <div className="mt-3 text-xs text-gray-500">
                  Target date: <b>{formatLongDate(goal.target_date)}</b>
                  {daysToTarget != null && (
                    <span> · {daysToTarget > 0 ? `${daysToTarget} days left` : 'Past due'}</span>
                  )}
                </div>
              )}
            </Panel>

            {logs.length === 0 ? (
              <Panel title="Previous visits">
                <p className="text-sm text-gray-400 text-center py-6">This is the first visit</p>
              </Panel>
            ) : (
              <Panel title="Previous visits">
                <ul className="space-y-3">
                  {logs.slice(0, 6).map((l, idx) => (
                    <li key={l.id} className="flex gap-3 text-xs">
                      <div
                        className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                          idx === 0 ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-gray-700">{formatLongDate(l.log_date)}</span>
                          <span className="font-semibold tabular-nums">{l.weight} kg</span>
                        </div>
                        {l.weight_delta != null && (
                          <div className="mt-0.5">
                            <DeltaBadge delta={Number(l.weight_delta)} />
                          </div>
                        )}
                        {(l.waist_cm != null || l.hips_cm != null) && (
                          <div className="text-gray-500 mt-0.5">
                            {l.waist_cm != null && `Waist ${l.waist_cm} cm`}
                            {l.waist_cm != null && l.hips_cm != null && ' · '}
                            {l.hips_cm != null && `Hips ${l.hips_cm} cm`}
                          </div>
                        )}
                        {l.session_notes && (
                          <div className="text-gray-500 mt-0.5 truncate">
                            {l.session_notes.length > 60
                              ? l.session_notes.slice(0, 60) + '…'
                              : l.session_notes}
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <section className="bg-white border rounded p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500 mb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function NumField({ label, value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1">{label}</label>
      <input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded p-2 text-sm w-full"
      />
    </div>
  );
}

function KV({ label, value, highlight, muted }) {
  return (
    <div className="flex items-baseline justify-between py-1 text-sm border-b last:border-b-0">
      <span className="text-gray-500">{label}</span>
      <span
        className={`tabular-nums font-medium ${
          highlight ? 'text-blue-600' : muted ? 'text-gray-400' : 'text-gray-900'
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function DeltaBadge({ delta }) {
  if (delta === 0) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
        — 0 kg
      </span>
    );
  }
  const negative = delta < 0;
  const cls = negative ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  const arrow = negative ? '↓' : '↑';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {arrow} {Math.abs(delta)} kg
    </span>
  );
}
