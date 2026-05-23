import { Document, Page, View, Text, StyleSheet, Svg, Path, Text as SvgText } from '@react-pdf/renderer';

const BRAND_GREEN = '#2E8B5F';
const BRAND_GREEN_SOFT = '#7DBA8A';
const GREEN_TINT = '#ECF2ED';
const INK = '#0F2A22';
const STONE = '#6B7066';
const RULE = '#DDD7CB';
const PAPER = '#F4F1EA';
const PAPER_WARM = '#FAF8F2';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LABELS = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

const MEAL_TAG_STYLES = {
  breakfast: { bg: '#FEF3C7', fg: '#92400E' },
  lunch:     { bg: '#DBEAFE', fg: '#1E40AF' },
  dinner:    { bg: '#EDE9FE', fg: '#5B21B6' },
  snack:     { bg: '#D1FAE5', fg: '#065F46' },
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingLeft: 36,
    paddingRight: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: INK,
    backgroundColor: '#FFFFFF',
  },

  // Header band (full-bleed via negative margins)
  headerBand: {
    backgroundColor: BRAND_GREEN,
    height: 72,
    marginTop: -40,
    marginLeft: -36,
    marginRight: -36,
    paddingLeft: 36,
    paddingRight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandMark: {
    color: BRAND_GREEN_SOFT,
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    marginRight: 6,
  },
  brandText: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerClient: {
    color: '#FFFFFF',
    fontFamily: 'Helvetica-Bold',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  headerWeek: {
    color: '#FFFFFF',
    opacity: 0.75,
    fontSize: 12,
    marginTop: 3,
  },

  // Goal bar
  goalBar: {
    backgroundColor: GREEN_TINT,
    marginLeft: -36,
    marginRight: -36,
    paddingTop: 10,
    paddingBottom: 10,
    paddingLeft: 36,
    paddingRight: 36,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_GREEN,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalPill: {
    flex: 1,
    alignItems: 'flex-start',
  },
  goalPillLabel: {
    fontSize: 8,
    color: STONE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Helvetica-Bold',
  },
  goalPillValue: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: INK,
    marginTop: 3,
  },
  goalBarEmpty: {
    backgroundColor: GREEN_TINT,
    marginLeft: -36,
    marginRight: -36,
    paddingTop: 14,
    paddingBottom: 14,
    paddingLeft: 36,
    paddingRight: 36,
    borderLeftWidth: 3,
    borderLeftColor: BRAND_GREEN,
    marginBottom: 16,
  },
  goalBarEmptyText: {
    textAlign: 'center',
    fontSize: 11,
    color: STONE,
    fontStyle: 'italic',
  },

  // Day card
  dayCard: {
    marginBottom: 8,
    borderLeftWidth: 2,
    borderLeftColor: BRAND_GREEN,
    backgroundColor: '#FFFFFF',
  },
  dayHeader: {
    backgroundColor: PAPER,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 12,
    paddingRight: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayHeaderName: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 13,
    color: INK,
  },
  dayHeaderDate: {
    fontSize: 11,
    color: STONE,
  },

  restDay: {
    height: 28,
    paddingLeft: 12,
    paddingRight: 12,
    justifyContent: 'center',
    borderBottomWidth: 0.5,
    borderBottomColor: RULE,
    borderStyle: 'dotted',
  },
  restDayText: {
    textAlign: 'center',
    fontSize: 11,
    color: STONE,
    fontStyle: 'italic',
  },

  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 7,
    paddingBottom: 7,
    paddingLeft: 12,
    paddingRight: 12,
  },
  mealRowAlt: {
    backgroundColor: PAPER_WARM,
  },

  mealTypeCol: {
    width: 70,
    paddingRight: 8,
  },
  mealTypeTag: {
    alignSelf: 'flex-start',
    paddingTop: 2,
    paddingBottom: 2,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: 3,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    letterSpacing: 0.5,
  },

  mealBody: {
    flex: 1,
    paddingRight: 8,
  },
  mealDescription: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 11,
    color: INK,
  },
  mealMacros: {
    fontSize: 9,
    color: STONE,
    marginTop: 2,
  },

  mealKcalCol: {
    width: 60,
    alignItems: 'flex-end',
  },
  mealKcalValue: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: INK,
  },
  mealKcalUnit: {
    fontSize: 8,
    color: STONE,
    marginTop: 1,
  },

  dailyTotal: {
    backgroundColor: PAPER,
    paddingTop: 6,
    paddingBottom: 6,
    paddingLeft: 12,
    paddingRight: 12,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dailyTotalLabel: {
    fontSize: 9,
    color: STONE,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    fontFamily: 'Helvetica-Bold',
  },
  dailyTotalRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  dailyTotalKcal: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 12,
    color: BRAND_GREEN,
    marginRight: 8,
  },
  dailyTotalMacros: {
    fontSize: 9,
    color: STONE,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 18,
    left: 36,
    right: 36,
    paddingTop: 6,
    borderTopWidth: 0.5,
    borderTopColor: RULE,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 10,
    color: STONE,
  },
});

function formatWeekStart(weekStart) {
  if (!weekStart) return '';
  const d = new Date(weekStart);
  if (Number.isNaN(d.getTime())) return String(weekStart);
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatGenerated(date) {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function dateForDay(weekStart, offset) {
  if (!weekStart) return null;
  const d = new Date(weekStart);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function GoalPill({ label, value }) {
  return (
    <View style={styles.goalPill}>
      <Text style={styles.goalPillLabel}>{label}</Text>
      <Text style={styles.goalPillValue}>{value}</Text>
    </View>
  );
}

const DEFAULT_LABELS = {
  dailyTotal: 'Daily total',
  noGoalSet: 'No goal set',
  restDay: '— Rest day —',
  target: 'Target weight',
  daily: 'Daily calories',
  protein: 'Protein',
  carbs: 'Carbs',
  fat: 'Fat',
  generatedBy: 'Generated by NutriTrack',
  weekOf: 'Week of',
};

function MealRow({ meal, alt }) {
  const tag = MEAL_TAG_STYLES[meal.meal_type] || { bg: PAPER, fg: STONE };
  const label = (MEAL_LABELS[meal.meal_type] || meal.meal_type || '').toUpperCase();
  return (
    <View style={[styles.mealRow, alt && styles.mealRowAlt]}>
      <View style={styles.mealTypeCol}>
        <Text style={[styles.mealTypeTag, { backgroundColor: tag.bg, color: tag.fg }]}>
          {label}
        </Text>
      </View>
      <View style={styles.mealBody}>
        <Text style={styles.mealDescription}>{meal.description}</Text>
        <Text style={styles.mealMacros}>
          P {Math.round(num(meal.protein_g))}g  ·  C {Math.round(num(meal.carbs_g))}g  ·  F{' '}
          {Math.round(num(meal.fat_g))}g
        </Text>
      </View>
      <View style={styles.mealKcalCol}>
        <Text style={styles.mealKcalValue}>{Math.round(num(meal.calories))}</Text>
        <Text style={styles.mealKcalUnit}>kcal</Text>
      </View>
    </View>
  );
}

function DayCard({ dayName, dateLabel, dayMeals, labels }) {
  const total = dayMeals.reduce(
    (acc, m) => ({
      calories: acc.calories + num(m.calories),
      protein_g: acc.protein_g + num(m.protein_g),
      carbs_g: acc.carbs_g + num(m.carbs_g),
      fat_g: acc.fat_g + num(m.fat_g),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );

  return (
    <View style={styles.dayCard} wrap={false}>
      <View style={styles.dayHeader}>
        <Text style={styles.dayHeaderName}>{dayName}</Text>
        {dateLabel ? <Text style={styles.dayHeaderDate}>{dateLabel}</Text> : null}
      </View>

      {dayMeals.length === 0 ? (
        <View style={styles.restDay}>
          <Text style={styles.restDayText}>{labels.restDay}</Text>
        </View>
      ) : (
        <>
          {dayMeals.map((m, i) => (
            <MealRow key={m.id ?? `${dayName}-${i}`} meal={m} alt={i % 2 === 1} />
          ))}
          <View style={styles.dailyTotal}>
            <Text style={styles.dailyTotalLabel}>{labels.dailyTotal}</Text>
            <View style={styles.dailyTotalRight}>
              <Text style={styles.dailyTotalKcal}>{Math.round(total.calories)} kcal</Text>
              <Text style={styles.dailyTotalMacros}>
                P {Math.round(total.protein_g)}g · C {Math.round(total.carbs_g)}g · F{' '}
                {Math.round(total.fat_g)}g
              </Text>
            </View>
          </View>
        </>
      )}
    </View>
  );
}

export default function DietPlanPDF({ client, goal, meals = [], weekStart, labels: labelsProp }) {
  const labels = { ...DEFAULT_LABELS, ...(labelsProp || {}) };
  const generatedDate = formatGenerated(new Date());

  const mealsByDay = Array.from({ length: 7 }, () => []);
  for (const m of meals) {
    const d = Number(m.day_of_week);
    if (Number.isInteger(d) && d >= 0 && d < 7) mealsByDay[d].push(m);
  }
  for (const list of mealsByDay) {
    list.sort((a, b) => MEAL_TYPES.indexOf(a.meal_type) - MEAL_TYPES.indexOf(b.meal_type));
  }

  return (
    <Document
      title={`${client?.name || 'Client'} — Diet Plan`}
      author="NutriTrack"
      subject="Weekly diet plan"
    >
      <Page size="A4" orientation="portrait" style={styles.page}>
        {/* Header band */}
        <View style={styles.headerBand} fixed>
          <View style={styles.brandRow}>
            <Svg viewBox="0 0 620 180" style={{ width: 160, height: 46 }}>
              <Path
                d="M 30 120 L 150 120 L 168 96 L 188 140 L 208 108 L 224 120 L 590 120"
                stroke="#7DBA8A"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <SvgText
                x="30"
                y="100"
                fontFamily="Helvetica-Bold"
                fontSize="84"
                fill="#F4F1EA"
                letterSpacing="-3"
              >
                NutriTrack
              </SvgText>
              <Path
                d="M 258 42 C 258 32, 266 26, 274 26 C 274 36, 268 44, 258 42 Z"
                fill="#7DBA8A"
              />
            </Svg>
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.headerClient}>{client?.name || 'Client'}</Text>
            <Text style={styles.headerWeek}>{labels.weekOf} {formatWeekStart(weekStart)}</Text>
          </View>
        </View>

        <View style={{ height: 16 }} />

        {/* Goal bar */}
        {goal ? (
          <View style={styles.goalBar}>
            <GoalPill
              label={labels.target}
              value={goal.target_weight != null ? `${goal.target_weight} kg` : '—'}
            />
            <GoalPill
              label={labels.daily}
              value={goal.daily_calories != null ? `${goal.daily_calories} kcal` : '—'}
            />
            <GoalPill
              label={labels.protein}
              value={goal.protein_g != null ? `${goal.protein_g} g` : '—'}
            />
            <GoalPill
              label={labels.carbs}
              value={goal.carbs_g != null ? `${goal.carbs_g} g` : '—'}
            />
            <GoalPill
              label={labels.fat}
              value={goal.fat_g != null ? `${goal.fat_g} g` : '—'}
            />
          </View>
        ) : (
          <View style={styles.goalBarEmpty}>
            <Text style={styles.goalBarEmptyText}>{labels.noGoalSet}</Text>
          </View>
        )}

        {/* Day cards */}
        {DAY_NAMES.map((dayName, idx) => (
          <DayCard
            key={dayName}
            dayName={dayName}
            dateLabel={dateForDay(weekStart, idx)}
            dayMeals={mealsByDay[idx]}
            labels={labels}
          />
        ))}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>{labels.generatedBy} · {generatedDate}</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
