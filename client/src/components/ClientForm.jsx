import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function validateClient(form, t) {
  const errors = {};
  if (!form.name || form.name.trim().length < 2) {
    errors.name = t ? t('clientForm.errors.nameTooShort') : 'Name is required (min 2 chars)';
  }
  const sw = toNum(form.start_weight);
  if (sw == null || sw <= 0) {
    errors.start_weight = t ? t('clientForm.errors.startWeightPositive') : 'Start weight is required and must be a positive number';
  }
  if (form.age !== '' && form.age != null) {
    const a = toNum(form.age);
    if (a == null || a < 1 || a > 120) errors.age = t ? t('clientForm.errors.ageRange') : 'Age must be 1–120';
  }
  if (form.height_cm !== '' && form.height_cm != null) {
    const h = toNum(form.height_cm);
    if (h == null || h < 50 || h > 250) errors.height_cm = t ? t('clientForm.errors.heightRange') : 'Height must be 50–250 cm';
  }
  return errors;
}

export default function ClientForm({ initial, submitLabel, onSubmit }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    name: initial?.name || '',
    email: initial?.email || '',
    phone: initial?.phone || '',
    age: initial?.age ?? '',
    gender: initial?.gender || '',
    height_cm: initial?.height_cm ?? '',
    start_weight: initial?.start_weight ?? '',
    allergies: initial?.allergies || '',
    medical_notes: initial?.medical_notes || '',
    status: initial?.status || 'active',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [apiError, setApiError] = useState(null);

  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = validateClient(form, t);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setSaving(true);
    setApiError(null);
    try {
      await onSubmit({
        name: form.name.trim(),
        email: form.email || null,
        phone: form.phone || null,
        age: toNum(form.age),
        gender: form.gender || null,
        height_cm: toNum(form.height_cm),
        start_weight: toNum(form.start_weight),
        allergies: form.allergies || null,
        medical_notes: form.medical_notes || null,
        status: form.status || 'active',
      });
    } catch (err) {
      setApiError(err.response?.data?.error || err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <Row>
        <Field label={`${t('clientForm.fields.name')} *`} error={errors.name}>
          <input className={inp(errors.name)} value={form.name} onChange={upd('name')} />
        </Field>
        <Field label={t('clientForm.fields.email')}>
          <input type="email" className={inp()} value={form.email} onChange={upd('email')} />
        </Field>
      </Row>
      <Row>
        <Field label={t('clientForm.fields.phone')}>
          <input className={inp()} value={form.phone} onChange={upd('phone')} />
        </Field>
        <Field label={t('clientForm.fields.age')} error={errors.age}>
          <input type="number" className={inp(errors.age)} value={form.age} onChange={upd('age')} />
        </Field>
      </Row>
      <Row>
        <Field label={t('clientForm.fields.gender')}>
          <select className={inp()} value={form.gender} onChange={upd('gender')}>
            <option value="">—</option>
            <option value="male">{t('client.male')}</option>
            <option value="female">{t('client.female')}</option>
            <option value="other">{t('client.other')}</option>
          </select>
        </Field>
        <Field label={t('clientForm.fields.status')}>
          <select className={inp()} value={form.status} onChange={upd('status')}>
            <option value="active">{t('clientForm.status.active')}</option>
            <option value="new">{t('clientForm.status.new')}</option>
            <option value="paused">{t('clientForm.status.paused')}</option>
          </select>
        </Field>
      </Row>
      <Row>
        <Field label={t('clientForm.fields.height')} error={errors.height_cm}>
          <input type="number" className={inp(errors.height_cm)} value={form.height_cm} onChange={upd('height_cm')} />
        </Field>
        <Field label={`${t('clientForm.fields.startWeight')} *`} error={errors.start_weight}>
          <input type="number" step="0.1" className={inp(errors.start_weight)} value={form.start_weight} onChange={upd('start_weight')} />
        </Field>
      </Row>
      <Field label={t('clientForm.fields.allergies')}>
        <textarea className={inp()} rows={2} value={form.allergies} onChange={upd('allergies')} />
      </Field>
      <Field label={t('clientForm.fields.medicalNotes')}>
        <textarea className={inp()} rows={3} value={form.medical_notes} onChange={upd('medical_notes')} />
      </Field>

      {apiError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {apiError}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 inline-flex items-center gap-2"
        >
          {saving && <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
          {saving ? t('clientForm.saving') : submitLabel || t('clientForm.save')}
        </button>
      </div>
    </form>
  );
}

function inp(error) {
  return `border rounded p-2 text-sm w-full ${error ? 'border-red-400' : 'border-gray-300'}`;
}

function Row({ children }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>;
}

function Field({ label, error, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium mb-1">{label}</span>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </label>
  );
}
