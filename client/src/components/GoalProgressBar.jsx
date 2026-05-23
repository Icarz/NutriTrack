import { useTranslation } from 'react-i18next';

const MS_DAY = 1000 * 60 * 60 * 24;
const GREEN = '#2E8B5F';
const AMBER = '#BA7517';

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function GoalProgressBar({
  startWeight,
  currentWeight,
  targetWeight,
  targetDate = null,
  createdAt = null,
  showDetails = true,
}) {
  const { t } = useTranslation();
  const s = toNum(startWeight);
  const c = toNum(currentWeight);
  const tWeight = toNum(targetWeight);

  if (tWeight == null) {
    return (
      <div>
        <div className="flex justify-between items-center mb-1">
          <span className="text-[11px] text-gray-500">{t('client.statCards.goalProgress')}</span>
          <span className="text-[13px] text-gray-400">{t('client.noGoalSet')}</span>
        </div>
        <div className="w-full h-2 bg-gray-200 rounded" />
      </div>
    );
  }

  let progressPct = 0;
  if (s != null && c != null && s !== tWeight) {
    progressPct = ((s - c) / (s - tWeight)) * 100;
    if (progressPct < 0) progressPct = 0;
    if (progressPct > 100) progressPct = 100;
  }

  const kgLost = s != null && c != null ? s - c : 0;
  const kgRemaining = c != null ? c - tWeight : 0;

  let daysRemaining = null;
  let onTrack = null;
  if (targetDate) {
    const today = new Date();
    const target = new Date(targetDate);
    daysRemaining = (target - today) / MS_DAY;
    if (createdAt) {
      const start = new Date(createdAt);
      const totalDays = (target - start) / MS_DAY;
      const daysElapsed = (today - start) / MS_DAY;
      if (totalDays > 0) {
        const expectedPct = (daysElapsed / totalDays) * 100;
        onTrack = progressPct >= expectedPct * 0.9;
      }
    }
  }

  const fillColor = progressPct >= 50 ? GREEN : AMBER;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-500">{t('client.statCards.goalProgress')}</span>
        <span className="text-[13px] font-medium text-gray-800">
          {progressPct.toFixed(0)}%
        </span>
      </div>
      <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
        <div
          className="h-full rounded"
          style={{ width: `${progressPct}%`, background: fillColor }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-gray-500">{s ?? '—'} kg</span>
        <span className="text-[10px] text-gray-500">{tWeight} kg</span>
      </div>

      {showDetails && (
        <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
          <div className="text-xs text-gray-600">
            {t('client.kgLost', { kg: kgLost.toFixed(1) })} · {t('client.kgToGo', { kg: kgRemaining.toFixed(1) })}
            {daysRemaining != null && (
              <> · {t('client.daysLeft', { days: Math.max(0, Math.round(daysRemaining)) })}</>
            )}
          </div>
          {onTrack != null && (
            <span
              className={
                onTrack
                  ? 'inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-green-100 text-green-800'
                  : 'inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-amber-100 text-amber-800'
              }
            >
              {onTrack ? t('client.onTrack') : t('client.behind')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
