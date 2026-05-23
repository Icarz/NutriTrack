const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { sanitizeBody } = require('../lib/sanitize');

const router = express.Router();

router.use(auth);

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_LIMITS = { description: 500 };

async function verifyPlan(planId, nutritionistId) {
  const { rows } = await pool.query(
    `SELECT dp.id
       FROM diet_plans dp
       JOIN clients c ON c.id = dp.client_id
      WHERE dp.id = $1 AND c.nutritionist_id = $2`,
    [planId, nutritionistId]
  );
  return rows[0] || null;
}

async function verifyMeal(mealId, nutritionistId) {
  const { rows } = await pool.query(
    `SELECT m.id
       FROM meals m
       JOIN diet_plans dp ON dp.id = m.plan_id
       JOIN clients c ON c.id = dp.client_id
      WHERE m.id = $1 AND c.nutritionist_id = $2`,
    [mealId, nutritionistId]
  );
  return rows[0] || null;
}

// POST /api/plans/:planId/meals
router.post('/plans/:planId/meals', async (req, res, next) => {
  const planId = parseInt(req.params.planId, 10);
  if (!Number.isInteger(planId)) return res.status(404).json({ error: 'Not found' });

  const body = req.body || {};
  const s = sanitizeBody(body, MEAL_LIMITS);
  if (s.error) return res.status(400).json({ error: s.error });
  const {
    day_of_week, meal_type, description,
    calories, protein_g, carbs_g, fat_g,
  } = body;

  if (!Number.isInteger(day_of_week) || day_of_week < 0 || day_of_week > 6) {
    return res.status(400).json({ error: 'day_of_week must be integer 0-6' });
  }
  if (!MEAL_TYPES.includes(meal_type)) {
    return res.status(400).json({ error: `meal_type must be one of ${MEAL_TYPES.join(', ')}` });
  }
  if (typeof description !== 'string' || description.trim() === '') {
    return res.status(400).json({ error: 'description required' });
  }

  try {
    const plan = await verifyPlan(planId, req.nutritionist.id);
    if (!plan) return res.status(404).json({ error: 'Not found' });

    const { rows } = await pool.query(
      `INSERT INTO meals
         (plan_id, day_of_week, meal_type, description,
          calories, protein_g, carbs_g, fat_g)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        planId,
        day_of_week,
        meal_type,
        description.trim(),
        calories ?? null,
        protein_g ?? null,
        carbs_g ?? null,
        fat_g ?? null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// PUT /api/meals/:mealId
router.put('/meals/:mealId', async (req, res, next) => {
  const mealId = parseInt(req.params.mealId, 10);
  if (!Number.isInteger(mealId)) return res.status(404).json({ error: 'Not found' });

  const body = req.body || {};
  const s = sanitizeBody(body, MEAL_LIMITS);
  if (s.error) return res.status(400).json({ error: s.error });
  const allowed = ['description', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'meal_type'];
  const sets = [];
  const vals = [];
  let i = 1;

  for (const f of allowed) {
    if (!Object.prototype.hasOwnProperty.call(body, f)) continue;
    if (f === 'meal_type' && !MEAL_TYPES.includes(body.meal_type)) {
      return res.status(400).json({ error: `meal_type must be one of ${MEAL_TYPES.join(', ')}` });
    }
    if (f === 'description' && (typeof body.description !== 'string' || body.description.trim() === '')) {
      return res.status(400).json({ error: 'description must be non-empty' });
    }
    sets.push(`${f} = $${i++}`);
    vals.push(f === 'description' ? body.description.trim() : body[f]);
  }
  if (sets.length === 0) return res.status(400).json({ error: 'No fields to update' });

  try {
    const meal = await verifyMeal(mealId, req.nutritionist.id);
    if (!meal) return res.status(404).json({ error: 'Not found' });

    vals.push(mealId);
    const { rows } = await pool.query(
      `UPDATE meals SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
      vals
    );
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/meals/:mealId
router.delete('/meals/:mealId', async (req, res, next) => {
  const mealId = parseInt(req.params.mealId, 10);
  if (!Number.isInteger(mealId)) return res.status(404).json({ error: 'Not found' });

  try {
    const meal = await verifyMeal(mealId, req.nutritionist.id);
    if (!meal) return res.status(404).json({ error: 'Not found' });

    await pool.query('DELETE FROM meals WHERE id = $1', [mealId]);
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
