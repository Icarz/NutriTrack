const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

async function verifyClient(clientId, nutritionistId) {
  const { rows } = await pool.query(
    'SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2',
    [clientId, nutritionistId]
  );
  return rows[0] || null;
}

async function verifyPlan(planId, nutritionistId) {
  const { rows } = await pool.query(
    `SELECT dp.id, dp.client_id
       FROM diet_plans dp
       JOIN clients c ON c.id = dp.client_id
      WHERE dp.id = $1 AND c.nutritionist_id = $2`,
    [planId, nutritionistId]
  );
  return rows[0] || null;
}

async function buildPlanResponse(planId) {
  const planRes = await pool.query(
    'SELECT * FROM diet_plans WHERE id = $1',
    [planId]
  );
  const plan = planRes.rows[0];
  if (!plan) return null;

  const mealsRes = await pool.query(
    `SELECT id, day_of_week, meal_type, description,
            calories, protein_g, carbs_g, fat_g
       FROM meals
      WHERE plan_id = $1
      ORDER BY day_of_week ASC, id ASC`,
    [planId]
  );

  const mealsByDay = [];
  const dailyTotals = [];
  for (let d = 0; d < 7; d++) {
    const dayMeals = mealsRes.rows
      .filter((m) => m.day_of_week === d)
      .map((m) => ({
        id: m.id,
        meal_type: m.meal_type,
        description: m.description,
        calories: m.calories,
        protein_g: m.protein_g,
        carbs_g: m.carbs_g,
        fat_g: m.fat_g,
      }));
    mealsByDay.push({ day: d, meals: dayMeals });

    const totals = dayMeals.reduce(
      (acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein_g: acc.protein_g + (Number(m.protein_g) || 0),
        carbs_g: acc.carbs_g + (Number(m.carbs_g) || 0),
        fat_g: acc.fat_g + (Number(m.fat_g) || 0),
      }),
      { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    );
    dailyTotals.push({ day: d, ...totals });
  }

  const filledDays = dailyTotals.filter((d, i) => mealsByDay[i].meals.length > 0);
  const weeklyAverages = filledDays.length
    ? {
        calories: round1(avg(filledDays.map((d) => d.calories))),
        protein_g: round1(avg(filledDays.map((d) => d.protein_g))),
        carbs_g: round1(avg(filledDays.map((d) => d.carbs_g))),
        fat_g: round1(avg(filledDays.map((d) => d.fat_g))),
      }
    : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

  return {
    id: plan.id,
    client_id: plan.client_id,
    week_start: plan.week_start,
    notes: plan.notes,
    created_at: plan.created_at,
    meals: mealsByDay,
    daily_totals: dailyTotals,
    weekly_averages: weeklyAverages,
  };
}

function avg(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
function round1(n) {
  return Math.round(n * 10) / 10;
}

// 1. GET /api/clients/:id/plans/active  (placeholder for session 3)
router.get('/clients/:id/plans/active', async (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

// 2. GET /api/clients/:id/plans/week  (placeholder for session 3)
router.get('/clients/:id/plans/week', async (req, res) => {
  res.status(501).json({ error: 'Not implemented' });
});

// 3. GET /api/clients/:id/plans
router.get('/clients/:id/plans', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  try {
    const client = await verifyClient(clientId, req.nutritionist.id);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const { rows } = await pool.query(
      `SELECT dp.*,
              COALESCE(mc.meal_count, 0)::int AS meal_count
         FROM diet_plans dp
         LEFT JOIN (
           SELECT plan_id, COUNT(*) AS meal_count
             FROM meals
            GROUP BY plan_id
         ) mc ON mc.plan_id = dp.id
        WHERE dp.client_id = $1
        ORDER BY dp.week_start DESC`,
      [clientId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 4. POST /api/clients/:id/plans
router.post('/clients/:id/plans', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  const { week_start, notes } = req.body || {};
  if (!week_start) return res.status(400).json({ error: 'week_start required' });
  try {
    const client = await verifyClient(clientId, req.nutritionist.id);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const { rows } = await pool.query(
      `INSERT INTO diet_plans (client_id, week_start, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [clientId, week_start, notes || null]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. GET /api/plans/:planId
router.get('/plans/:planId', async (req, res) => {
  const planId = parseInt(req.params.planId, 10);
  if (!Number.isInteger(planId)) return res.status(404).json({ error: 'Not found' });
  try {
    const plan = await verifyPlan(planId, req.nutritionist.id);
    if (!plan) return res.status(404).json({ error: 'Not found' });

    const payload = await buildPlanResponse(planId);
    if (!payload) return res.status(404).json({ error: 'Not found' });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 6. PUT /api/plans/:planId
router.put('/plans/:planId', async (req, res) => {
  const planId = parseInt(req.params.planId, 10);
  if (!Number.isInteger(planId)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  const allowed = ['week_start', 'notes'];
  const sets = [];
  const vals = [];
  let i = 1;
  for (const f of allowed) {
    if (Object.prototype.hasOwnProperty.call(body, f)) {
      sets.push(`${f} = $${i++}`);
      vals.push(body[f]);
    }
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });
  try {
    const plan = await verifyPlan(planId, req.nutritionist.id);
    if (!plan) return res.status(404).json({ error: 'Not found' });
    vals.push(planId);
    const { rows } = await pool.query(
      `UPDATE diet_plans SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. DELETE /api/plans/:planId
router.delete('/plans/:planId', async (req, res) => {
  const planId = parseInt(req.params.planId, 10);
  if (!Number.isInteger(planId)) return res.status(404).json({ error: 'Not found' });
  try {
    const plan = await verifyPlan(planId, req.nutritionist.id);
    if (!plan) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM diet_plans WHERE id = $1', [planId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 8. POST /api/plans/:planId/copy-from/:sourcePlanId
router.post('/plans/:planId/copy-from/:sourcePlanId', async (req, res) => {
  const planId = parseInt(req.params.planId, 10);
  const sourceId = parseInt(req.params.sourcePlanId, 10);
  if (!Number.isInteger(planId) || !Number.isInteger(sourceId)) {
    return res.status(404).json({ error: 'Not found' });
  }
  try {
    const [target, source] = await Promise.all([
      verifyPlan(planId, req.nutritionist.id),
      verifyPlan(sourceId, req.nutritionist.id),
    ]);
    if (!target || !source) return res.status(404).json({ error: 'Not found' });

    await pool.query(
      `INSERT INTO meals
         (plan_id, day_of_week, meal_type, description,
          calories, protein_g, carbs_g, fat_g)
       SELECT $1, day_of_week, meal_type, description,
              calories, protein_g, carbs_g, fat_g
         FROM meals
        WHERE plan_id = $2`,
      [planId, sourceId]
    );

    const payload = await buildPlanResponse(planId);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
