import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import MacroChip from '../components/MacroChip';
import MealFormPanel from '../components/MealFormPanel';
import { getClient } from '../api/clients';
import {
  getPlan,
  getPlanForWeek,
  createPlan,
  updatePlan,
  copyFromPlan,
  getGoal,
  flattenPlanMeals,
} from '../api/plans';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

function mondayOf(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISODate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatShort(date) {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function weekRangeLabel(monday) {
  const sunday = addDays(monday, 6);
  return `${formatShort(monday)} – ${formatShort(sunday)}`;
}

export default function DietPlan() {
  const { id: clientId, planId: planIdParam } = useParams();

  const [client, setClient] = useState(null);
  const [goal, setGoal] = useState(null);
  const [plan, setPlan] = useState(null);
  const [planId, setPlanId] = useState(planIdParam && planIdParam !== 'new' ? planIdParam : null);
  const [meals, setMeals] = useState([]);
  const [notes, setNotes] = useState('');
  const [currentWeekStart, setCurrentWeekStart] = useState(mondayOf(new Date()));
  const [prevPlanId, setPrevPlanId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState(null);
  const [panel, setPanel] = useState(null); // { dayOfWeek, mealType, meal, planId } | null

  useEffect(() => {
    document.title = client?.name
      ? `Diet Plan — ${client.name} | NutriTrack`
      : 'Diet Plan | NutriTrack';
  }, [client]);

  const applyPlanPayload = useCallback((payload) => {
    if (!payload) {
      setPlan(null);
      setPlanId(null);
      setMeals([]);
      setNotes('');
      return;
    }
    setPlan(payload);
    setPlanId(payload.id);
    setMeals(flattenPlanMeals(payload));
    setNotes(payload.notes || '');
    if (payload.week_start) {
      setCurrentWeekStart(mondayOf(payload.week_start));
    }
  }, []);

  // Mount: load client + goal + plan
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const tasks = [getClient(clientId), getGoal(clientId)];
        if (planIdParam && planIdParam !== 'new') {
          tasks.push(getPlan(planIdParam));
        } else {
          tasks.push(getPlanForWeek(clientId, toISODate(mondayOf(new Date()))));
        }
        const [c, g, p] = await Promise.all(tasks);
        if (cancelled) return;
        setClient(c);
        setGoal(g);
        applyPlanPayload(p);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, planIdParam]);

  // Load prev-week plan id whenever current week changes
  useEffect(() => {
    let cancelled = false;
    async function loadPrev() {
      try {
        const prevMonday = toISODate(addDays(currentWeekStart, -7));
        const prev = await getPlanForWeek(clientId, prevMonday);
        if (!cancelled) setPrevPlanId(prev?.id || null);
      } catch {
        if (!cancelled) setPrevPlanId(null);
      }
    }
    loadPrev();
    return () => {
      cancelled = true;
    };
  }, [clientId, currentWeekStart]);

  async function changeWeek(deltaDays) {
    const newMonday = addDays(currentWeekStart, deltaDays);
    setCurrentWeekStart(newMonday);
    try {
      const p = await getPlanForWeek(clientId, toISODate(newMonday));
      applyPlanPayload(p);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    }
  }

  async function handleCopyPrev() {
    if (!prevPlanId) return;
    setCopying(true);
    try {
      let targetId = planId;
      if (!targetId) {
        const created = await createPlan(clientId, {
          week_start: toISODate(currentWeekStart),
          notes: '',
        });
        targetId = created.id;
      }
      const payload = await copyFromPlan(targetId, prevPlanId);
      applyPlanPayload(payload);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setCopying(false);
    }
  }

  async function handleSave() {
    if (!planId) return;
    setSaving(true);
    try {
      await updatePlan(planId, { notes });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 2000);
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCellClick(dayIndex, mealType, existingMeal) {
    let activePlanId = planId;
    if (!activePlanId && !existingMeal) {
      try {
        const created = await createPlan(clientId, {
          week_start: toISODate(currentWeekStart),
          notes: '',
        });
        setPlan(created);
        setPlanId(created.id);
        activePlanId = created.id;
      } catch (e) {
        setError(e.response?.data?.error || e.message);
        return;
      }
    }
    setPanel({
      dayOfWeek: dayIndex,
      mealType,
      meal: existingMeal,
      planId: activePlanId,
    });
  }

  function handleMealSaved(savedMeal) {
    const normalized = {
      ...savedMeal,
      day_of_week: savedMeal.day_of_week ?? panel?.dayOfWeek,
      meal_type: savedMeal.meal_type ?? panel?.mealType,
    };
    setMeals((prev) => {
      const exists = prev.find((m) => m.id === normalized.id);
      return exists
        ? prev.map((m) => (m.id === normalized.id ? normalized : m))
        : [...prev, normalized];
    });
    setPanel(null);
  }

  function handleMealDeleted(mealId) {
    setMeals((prev) => prev.filter((m) => m.id !== mealId));
    setPanel(null);
  }

  const dailyTotals = useMemo(() => {
    const totals = Array.from({ length: 7 }, () => ({
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      count: 0,
    }));
    for (const m of meals) {
      const t = totals[m.day_of_week];
      if (!t) continue;
      t.calories += Number(m.calories) || 0;
      t.protein_g += Number(m.protein_g) || 0;
      t.carbs_g += Number(m.carbs_g) || 0;
      t.fat_g += Number(m.fat_g) || 0;
      t.count += 1;
    }
    return totals;
  }, [meals]);

  const summary = useMemo(() => {
    const filled = dailyTotals.filter((d) => d.count > 0);
    const avg = (key) =>
      filled.length ? filled.reduce((s, d) => s + d[key], 0) / filled.length : 0;
    return {
      avgKcal: Math.round(avg('calories')),
      avgProtein: Math.round(avg('protein_g')),
      avgCarbs: Math.round(avg('carbs_g')),
      avgFat: Math.round(avg('fat_g')),
      daysFilled: filled.length,
    };
  }, [dailyTotals]);

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
      <main className="flex-1 p-6 max-w-[1400px]">
        <Link
          to={`/clients/${clientId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to client
        </Link>

        <header className="mt-2 mb-6 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Diet plan builder</h1>
            <p className="text-sm text-gray-600 mt-1">
              {client ? client.name : 'Client'}
              {goal ? (
                <>
                  {' · target '}
                  <span className="font-medium">{goal.daily_calories} kcal/day</span>
                  {' · '}
                  <span className="font-medium">{goal.protein_g}g protein</span>
                </>
              ) : (
                <span className="ml-1 text-amber-600">· No goal set</span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => changeWeek(-7)}
              className="px-2 py-1 border rounded hover:bg-gray-100"
              aria-label="Previous week"
            >
              ←
            </button>
            <span className="px-3 py-1 font-medium text-sm tabular-nums">
              {weekRangeLabel(currentWeekStart)}
            </span>
            <button
              type="button"
              onClick={() => changeWeek(7)}
              className="px-2 py-1 border rounded hover:bg-gray-100"
              aria-label="Next week"
            >
              →
            </button>
            <button
              type="button"
              onClick={handleCopyPrev}
              disabled={!prevPlanId || copying}
              className="ml-2 px-3 py-1 border rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100"
            >
              {copying ? 'Copying…' : 'Copy prev week'}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!planId || saving}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-40 hover:bg-blue-700"
            >
              {saving ? 'Saving…' : 'Save plan'}
            </button>
            {savedFlash && <span className="text-green-600 text-sm">Saved ✓</span>}
          </div>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
            {error}
          </div>
        )}

        <SummaryCards goal={goal} summary={summary} />

        {meals.length === 0 && (
          <div className="mb-3 px-3 py-2 bg-blue-50 border border-blue-200 text-blue-800 rounded text-sm">
            Click any cell to add a meal
          </div>
        )}

        <PlanGrid
          weekStart={currentWeekStart}
          meals={meals}
          dailyTotals={dailyTotals}
          goal={goal}
          onCellClick={handleCellClick}
        />

        {panel && (
          <MealFormPanel
            planId={panel.planId}
            dayOfWeek={panel.dayOfWeek}
            mealType={panel.mealType}
            meal={panel.meal}
            onSave={handleMealSaved}
            onDelete={handleMealDeleted}
            onClose={() => setPanel(null)}
          />
        )}

        <section className="mt-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">Plan notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder={planId ? 'Add notes about this plan…' : 'Add a meal first to start the plan.'}
            disabled={!planId}
            className="w-full border rounded p-2 text-sm disabled:bg-gray-100"
          />
        </section>
      </main>
    </div>
  );
}

function SummaryCard({ title, value, target, unit, overOk }) {
  const hasTarget = target != null && target > 0;
  const pct = hasTarget ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const over = hasTarget && value > target;
  const barColor = !hasTarget
    ? 'bg-gray-300'
    : over && !overOk
    ? 'bg-red-500'
    : 'bg-green-500';

  return (
    <div className="bg-white border rounded p-3">
      <div className="text-xs text-gray-500 uppercase tracking-wide">{title}</div>
      <div className="text-xl font-bold mt-1 tabular-nums">
        {value}
        <span className="text-gray-400 text-sm font-normal">
          {hasTarget ? ` / ${target}${unit}` : ` ${unit}`}
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-gray-100 rounded overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function SummaryCards({ goal, summary }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <SummaryCard
        title="Avg daily kcal"
        value={summary.avgKcal}
        target={goal?.daily_calories}
        unit=""
      />
      <SummaryCard
        title="Avg protein"
        value={summary.avgProtein}
        target={goal?.protein_g}
        unit="g"
        overOk
      />
      <SummaryCard
        title="Avg carbs"
        value={summary.avgCarbs}
        target={goal?.carbs_g}
        unit="g"
      />
      <SummaryCard
        title="Avg fat"
        value={summary.avgFat}
        target={goal?.fat_g}
        unit="g"
      />
      <div className="bg-white border rounded p-3">
        <div className="text-xs text-gray-500 uppercase tracking-wide">Days filled</div>
        <div className="text-xl font-bold mt-1 tabular-nums">
          {summary.daysFilled}
          <span className="text-gray-400 text-sm font-normal"> / 7</span>
        </div>
        <div className="mt-2 h-1.5 bg-gray-100 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500"
            style={{ width: `${(summary.daysFilled / 7) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function PlanGrid({ weekStart, meals, dailyTotals, goal, onCellClick }) {
  return (
    <div className="bg-white border rounded overflow-hidden">
      <div className="grid grid-cols-[160px_repeat(4,1fr)] text-xs font-semibold text-gray-500 uppercase border-b bg-gray-50">
        <div className="p-2">Day</div>
        {MEAL_TYPES.map((t) => (
          <div key={t} className="p-2 border-l">
            {MEAL_LABELS[t]}
          </div>
        ))}
      </div>
      {DAY_NAMES.map((dayName, idx) => {
        const date = addDays(weekStart, idx);
        const totals = dailyTotals[idx];
        const kcalColor = !goal
          ? 'text-gray-400'
          : totals.calories === 0
          ? 'text-gray-400'
          : Math.abs(totals.calories - goal.daily_calories) <= goal.daily_calories * 0.1
          ? 'text-green-600'
          : totals.calories > goal.daily_calories * 1.1
          ? 'text-red-600'
          : 'text-gray-600';

        return (
          <div
            key={dayName}
            className="grid grid-cols-[160px_repeat(4,1fr)] border-b last:border-b-0 min-h-[96px]"
          >
            <div className="p-3 border-r bg-gray-50/60">
              <div className="text-sm font-semibold">{dayName}</div>
              <div className="text-xs text-gray-500">{formatShort(date)}</div>
              <div className={`text-xs mt-2 tabular-nums ${kcalColor}`}>
                {totals.calories} kcal
              </div>
            </div>
            {MEAL_TYPES.map((type) => {
              const cellMeals = meals.filter(
                (m) => m.day_of_week === idx && m.meal_type === type
              );
              return (
                <Cell
                  key={type}
                  dayIndex={idx}
                  mealType={type}
                  mealsInCell={cellMeals}
                  isWeekend={idx >= 5}
                  onCellClick={onCellClick}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

function Cell({ dayIndex, mealType, mealsInCell, isWeekend, onCellClick }) {
  const filled = mealsInCell.length > 0;
  const showAddOnHover = filled || !isWeekend;

  if (!filled) {
    return (
      <button
        type="button"
        onClick={() => onCellClick(dayIndex, mealType, null)}
        className={`border-l p-2 text-xs text-gray-400 text-center min-h-[96px] flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition ${
          showAddOnHover ? 'opacity-60 hover:opacity-100' : ''
        }`}
      >
        + Add meal
      </button>
    );
  }

  return (
    <div className="border-l p-2 min-h-[96px] flex flex-col gap-1 group relative">
      {mealsInCell.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onCellClick(dayIndex, mealType, m)}
          className="text-left p-1.5 rounded hover:bg-gray-100"
        >
          <div className="text-xs font-semibold truncate">{m.description}</div>
          <div className="text-[11px] text-gray-500 tabular-nums">
            {Math.round(Number(m.calories) || 0)} kcal
          </div>
          <div className="flex gap-1 mt-1 flex-wrap">
            <MacroChip label="P" value={m.protein_g} />
            <MacroChip label="C" value={m.carbs_g} />
            <MacroChip label="F" value={m.fat_g} />
          </div>
        </button>
      ))}
      <button
        type="button"
        onClick={() => onCellClick(dayIndex, mealType, null)}
        className="text-[11px] text-blue-600 hover:underline opacity-0 group-hover:opacity-100 transition text-left px-1"
      >
        + Add another
      </button>
    </div>
  );
}
