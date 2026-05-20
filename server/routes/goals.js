const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');
const { sanitizeBody } = require('../lib/sanitize');

const router = express.Router({ mergeParams: true });

router.use(auth);

const GOAL_LIMITS = { notes: 2000 };

async function verifyClient(clientId, nutritionistId) {
  const { rows } = await pool.query(
    'SELECT id, start_weight FROM clients WHERE id = $1 AND nutritionist_id = $2',
    [clientId, nutritionistId]
  );
  return rows[0] || null;
}

function isValidIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}

function isFutureDate(s) {
  const d = new Date(s + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}

function validateGoalBody(body, { requireFields }) {
  if (requireFields || body.target_weight !== undefined) {
    const tw = Number(body.target_weight);
    if (!Number.isFinite(tw) || tw <= 0) return 'target_weight: required, must be a positive number';
  }
  if (requireFields || body.target_date !== undefined) {
    if (!isValidIsoDate(body.target_date)) return 'target_date: must be YYYY-MM-DD';
    if (!isFutureDate(body.target_date)) return 'target_date: must be in the future';
  }
  if (body.daily_calories != null && body.daily_calories !== '') {
    const n = Number(body.daily_calories);
    if (!Number.isFinite(n) || n < 500 || n > 5000) return 'daily_calories: must be 500-5000';
  }
  return null;
}

function computeProgressPct(startWeight, currentWeight, targetWeight) {
  const s = parseFloat(startWeight);
  const c = parseFloat(currentWeight);
  const t = parseFloat(targetWeight);
  if (!Number.isFinite(s) || !Number.isFinite(c) || !Number.isFinite(t)) return null;
  const denom = s - t;
  if (denom === 0) return null;
  let pct = ((s - c) / denom) * 100;
  if (pct < 0) pct = 0;
  if (pct > 100) pct = 100;
  return Math.round(pct * 10) / 10;
}

router.get('/:id/goals', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  try {
    const client = await verifyClient(clientId, req.nutritionist.id);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const { rows } = await pool.query(
      'SELECT * FROM goals WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
      [clientId]
    );
    const goal = rows[0];
    if (!goal) return res.status(404).json({ error: 'No goal set' });

    const logRes = await pool.query(
      'SELECT weight FROM progress_logs WHERE client_id = $1 AND weight IS NOT NULL ORDER BY log_date DESC LIMIT 1',
      [clientId]
    );
    const currentWeight = logRes.rows[0] ? logRes.rows[0].weight : client.start_weight;
    const progress_pct = computeProgressPct(client.start_weight, currentWeight, goal.target_weight);

    res.json({ ...goal, current_weight: currentWeight, progress_pct });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/goals', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  const s = sanitizeBody(body, GOAL_LIMITS);
  if (s.error) return res.status(400).json({ error: s.error });
  const verr = validateGoalBody(body, { requireFields: true });
  if (verr) return res.status(400).json({ error: verr });
  try {
    const client = await verifyClient(clientId, req.nutritionist.id);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const { rows } = await pool.query(
      `INSERT INTO goals
         (client_id, target_weight, target_date, daily_calories,
          protein_g, carbs_g, fat_g, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        clientId,
        body.target_weight || null,
        body.target_date || null,
        body.daily_calories || null,
        body.protein_g || null,
        body.carbs_g || null,
        body.fat_g || null,
        body.notes || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id/goals', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  const s = sanitizeBody(body, GOAL_LIMITS);
  if (s.error) return res.status(400).json({ error: s.error });
  const verr = validateGoalBody(body, { requireFields: false });
  if (verr) return res.status(400).json({ error: verr });
  const allowed = ['target_weight', 'target_date', 'daily_calories', 'protein_g', 'carbs_g', 'fat_g', 'notes'];
  try {
    const client = await verifyClient(clientId, req.nutritionist.id);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const existingRes = await pool.query(
      'SELECT * FROM goals WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
      [clientId]
    );
    const existing = existingRes.rows[0];

    let goal;
    if (existing) {
      const sets = [];
      const vals = [];
      let i = 1;
      for (const f of allowed) {
        if (Object.prototype.hasOwnProperty.call(body, f)) {
          sets.push(`${f} = $${i++}`);
          vals.push(body[f]);
        }
      }
      if (sets.length === 0) {
        goal = existing;
      } else {
        vals.push(existing.id);
        const { rows } = await pool.query(
          `UPDATE goals SET ${sets.join(', ')} WHERE id = $${i} RETURNING *`,
          vals
        );
        goal = rows[0];
      }
    } else {
      const { rows } = await pool.query(
        `INSERT INTO goals
           (client_id, target_weight, target_date, daily_calories,
            protein_g, carbs_g, fat_g, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          clientId,
          body.target_weight ?? null,
          body.target_date ?? null,
          body.daily_calories ?? null,
          body.protein_g ?? null,
          body.carbs_g ?? null,
          body.fat_g ?? null,
          body.notes ?? null,
        ]
      );
      goal = rows[0];
    }

    const logRes = await pool.query(
      'SELECT weight FROM progress_logs WHERE client_id = $1 AND weight IS NOT NULL ORDER BY log_date DESC LIMIT 1',
      [clientId]
    );
    const currentWeight = logRes.rows[0] ? logRes.rows[0].weight : client.start_weight;
    const progress_pct = goal.target_weight == null
      ? null
      : computeProgressPct(client.start_weight, currentWeight, goal.target_weight);

    res.json({ ...goal, current_weight: currentWeight, progress_pct });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
