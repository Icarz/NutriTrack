const express = require('express');
const pool = require('../db/pool');

const router = express.Router();

const LOG_COLS = ['log_date', 'weight', 'waist_cm', 'hips_cm', 'arms_cm', 'notes'];

async function clientOwned(clientId, nutritionistId) {
  const { rows } = await pool.query(
    'SELECT id FROM clients WHERE id = $1 AND nutritionist_id = $2',
    [clientId, nutritionistId]
  );
  return !!rows[0];
}

async function logOwned(logId, nutritionistId) {
  const { rows } = await pool.query(
    `SELECT pl.id
       FROM progress_logs pl
       JOIN clients c ON c.id = pl.client_id
      WHERE pl.id = $1 AND c.nutritionist_id = $2`,
    [logId, nutritionistId]
  );
  return !!rows[0];
}

router.get('/clients/:id/logs', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  try {
    if (!(await clientOwned(clientId, req.nutritionist.id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { rows } = await pool.query(
      'SELECT * FROM progress_logs WHERE client_id = $1 ORDER BY log_date DESC',
      [clientId]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/clients/:id/logs', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  if (!body.log_date) return res.status(400).json({ error: 'log_date required' });
  try {
    if (!(await clientOwned(clientId, req.nutritionist.id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    const { rows } = await pool.query(
      `INSERT INTO progress_logs
         (client_id, log_date, weight, waist_cm, hips_cm, arms_cm, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        clientId,
        body.log_date,
        body.weight || null,
        body.waist_cm || null,
        body.hips_cm || null,
        body.arms_cm || null,
        body.notes || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/logs/:logId', async (req, res) => {
  const logId = parseInt(req.params.logId, 10);
  if (!Number.isInteger(logId)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;
  for (const col of LOG_COLS) {
    if (body[col] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(body[col]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  try {
    if (!(await logOwned(logId, req.nutritionist.id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    values.push(logId);
    const { rows } = await pool.query(
      `UPDATE progress_logs SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/logs/:logId', async (req, res) => {
  const logId = parseInt(req.params.logId, 10);
  if (!Number.isInteger(logId)) return res.status(404).json({ error: 'Not found' });
  try {
    if (!(await logOwned(logId, req.nutritionist.id))) {
      return res.status(404).json({ error: 'Not found' });
    }
    await pool.query('DELETE FROM progress_logs WHERE id = $1', [logId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
