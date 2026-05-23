import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { addMeal, updateMeal, deleteMeal } from '../api/plans';

const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

function toNum(v) {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function inRange(n, min, max) {
  return n == null || (n >= min && n <= max);
}

export default function MealFormPanel({
  planId,
  dayOfWeek,
  mealType,
  meal,
  onSave,
  onDelete,
  onClose,
}) {
  const { t } = useTranslation();
  const isEdit = !!meal;
  const [description, setDescription] = useState(meal?.description || '');
  const [calories, setCalories] = useState(meal?.calories ?? '');
  const [protein, setProtein] = useState(meal?.protein_g ?? '');
  const [carbs, setCarbs] = useState(meal?.carbs_g ?? '');
  const [fat, setFat] = useState(meal?.fat_g ?? '');
  const [caloriesManual, setCaloriesManual] = useState(isEdit && meal?.calories != null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const descRef = useRef(null);

  const estimatedKcal = useMemo(() => {
    const p = toNum(protein) || 0;
    const c = toNum(carbs) || 0;
    const f = toNum(fat) || 0;
    return Math.round(p * 4 + c * 4 + f * 9);
  }, [protein, carbs, fat]);

  const showMacroWarning = useMemo(() => {
    const enteredKcal = parseFloat(calories);
    return (
      !isNaN(estimatedKcal) &&
      !isNaN(enteredKcal) &&
      enteredKcal > 0 &&
      Math.abs(estimatedKcal - enteredKcal) / enteredKcal > 0.1
    );
  }, [calories, estimatedKcal]);

  useEffect(() => {
    if (!caloriesManual) setCalories(estimatedKcal ? String(estimatedKcal) : '');
  }, [estimatedKcal, caloriesManual]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    descRef.current?.focus();
  }, []);

  function handleCaloriesChange(e) {
    setCalories(e.target.value);
    setCaloriesManual(true);
  }

  function validate() {
    const errs = {};
    if (!description.trim() || description.trim().length < 3) {
      errs.description = t('mealForm.errors.descriptionTooShort');
    }
    const fields = [
      ['calories', toNum(calories), 0, 5000],
      ['protein_g', toNum(protein), 0, 500],
      ['carbs_g', toNum(carbs), 0, 500],
      ['fat_g', toNum(fat), 0, 500],
    ];
    for (const [key, val, min, max] of fields) {
      if (val != null && (val < 0 || !inRange(val, min, max))) {
        errs[key] = `Must be ${min}–${max}`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError(null);
    try {
      const payload = {
        description: description.trim(),
        calories: toNum(calories),
        protein_g: toNum(protein),
        carbs_g: toNum(carbs),
        fat_g: toNum(fat),
      };
      let saved;
      if (isEdit) {
        saved = await updateMeal(meal.id, payload);
      } else {
        saved = await addMeal(planId, {
          ...payload,
          day_of_week: dayOfWeek,
          meal_type: mealType,
        });
      }
      onSave(saved);
    } catch (err) {
      setApiError(err.response?.data?.error || err.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!meal) return;
    setDeleting(true);
    setApiError(null);
    try {
      await deleteMeal(meal.id);
      onDelete(meal.id);
    } catch (err) {
      setApiError(err.response?.data?.error || err.message);
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="absolute top-0 right-0 h-full w-full max-w-md bg-white shadow-xl flex flex-col animate-[slidein_.18s_ease-out]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">
              {t(`dietPlan.days.${DAY_KEYS[dayOfWeek]}`)} · {t(`dietPlan.mealTypes.${mealType}`)}
            </h2>
            <p className="text-xs text-gray-500">{isEdit ? t('mealForm.editMeal') : t('mealForm.newMeal')}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            ✕
          </button>
        </header>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('mealForm.description')} <span className="text-red-500">*</span>
            </label>
            <textarea
              ref={descRef}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder={t('mealForm.descriptionPlaceholder')}
              className={`w-full border rounded p-2 text-sm ${
                errors.description ? 'border-red-400' : 'border-gray-300'
              }`}
            />
            {errors.description && (
              <p className="text-xs text-red-600 mt-1">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">{t('mealForm.calories')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="5000"
                value={calories}
                onChange={handleCaloriesChange}
                className={`flex-1 border rounded p-2 text-sm ${
                  errors.calories ? 'border-red-400' : 'border-gray-300'
                }`}
              />
              <span className="text-sm text-gray-500">kcal</span>
            </div>
            {!caloriesManual && estimatedKcal > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {t('mealForm.estimatedFromMacros', { kcal: estimatedKcal })}
              </p>
            )}
            {caloriesManual && (
              <button
                type="button"
                onClick={() => {
                  setCaloriesManual(false);
                  setCalories(estimatedKcal ? String(estimatedKcal) : '');
                }}
                className="text-xs text-blue-600 hover:underline mt-1"
              >
                {t('mealForm.recalculate')}
              </button>
            )}
            {errors.calories && <p className="text-xs text-red-600 mt-1">{errors.calories}</p>}
            {caloriesManual && showMacroWarning && !errors.calories && (
              <p className="text-amber-600 text-xs mt-1">
                {t('mealForm.errors.macroWarning', { kcal: Math.round(estimatedKcal) })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <MacroInput
              label={t('mealForm.protein')}
              value={protein}
              onChange={setProtein}
              error={errors.protein_g}
            />
            <MacroInput
              label={t('mealForm.carbs')}
              value={carbs}
              onChange={setCarbs}
              error={errors.carbs_g}
            />
            <MacroInput
              label={t('mealForm.fat')}
              value={fat}
              onChange={setFat}
              error={errors.fat_g}
            />
          </div>

          {apiError && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded">
              {apiError}
            </div>
          )}
        </form>

        <footer className="border-t p-4 flex items-center gap-2 flex-wrap">
          {confirmingDelete ? (
            <>
              <span className="text-sm text-gray-700 mr-auto">{t('mealForm.deleteConfirm')}</span>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="px-3 py-1.5 text-sm border rounded hover:bg-gray-100"
              >
                {t('mealForm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? t('clientForm.saving') : t('mealForm.deleteYes')}
              </button>
            </>
          ) : (
            <>
              {isEdit && (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded hover:bg-red-50 mr-auto"
                >
                  {t('mealForm.deleteMeal')}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className={`px-3 py-1.5 text-sm border rounded hover:bg-gray-100 ${
                  isEdit ? '' : 'ml-auto'
                }`}
              >
                {t('mealForm.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? t('clientForm.saving') : isEdit ? t('mealForm.saveChanges') : t('mealForm.addMeal')}
              </button>
            </>
          )}
        </footer>
      </aside>

      <style>{`@keyframes slidein { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }`}</style>
    </div>
  );
}

function MacroInput({ label, value, onChange, error }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="500"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`flex-1 min-w-0 border rounded p-2 text-sm ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        <span className="text-xs text-gray-500">g</span>
      </div>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
