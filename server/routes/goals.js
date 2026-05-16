const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

router.use(auth);

async function verifyClient(clientId, nutritionistId) {
  const { rows } = await pool.query(
    'SELECT id, start_weight FROM clients WHERE id = $1 AND nutritionist_id = $2',
    [clientId, nutritionistId]
  );
  return rows[0] || null;
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

module.exports = router;
