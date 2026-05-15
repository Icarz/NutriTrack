const express = require('express');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

router.use(auth);

const CLIENT_COLS = [
  'name', 'email', 'phone', 'age', 'gender',
  'height_cm', 'start_weight', 'allergies', 'medical_notes', 'status',
];

router.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*,
              ll.last_log_date,
              CASE
                WHEN ll.last_log_date IS NULL THEN true
                WHEN ll.last_log_date < (CURRENT_DATE - INTERVAL '14 days') THEN true
                ELSE false
              END AS is_overdue
         FROM clients c
         LEFT JOIN (
           SELECT client_id, MAX(log_date) AS last_log_date
             FROM progress_logs
            GROUP BY client_id
         ) ll ON ll.client_id = c.id
        WHERE c.nutritionist_id = $1
        ORDER BY c.created_at DESC`,
      [req.nutritionist.id]
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', async (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'name required' });
  try {
    const { rows } = await pool.query(
      `INSERT INTO clients
         (nutritionist_id, name, email, phone, age, gender, height_cm,
          start_weight, allergies, medical_notes, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11,'active'))
       RETURNING *`,
      [
        req.nutritionist.id,
        body.name,
        body.email || null,
        body.phone || null,
        body.age || null,
        body.gender || null,
        body.height_cm || null,
        body.start_weight || null,
        body.allergies || null,
        body.medical_notes || null,
        body.status || null,
      ]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Not found' });
  try {
    const { rows } = await pool.query(
      'SELECT * FROM clients WHERE id = $1 AND nutritionist_id = $2',
      [id, req.nutritionist.id]
    );
    const client = rows[0];
    if (!client) return res.status(404).json({ error: 'Not found' });

    const [goalRes, logsRes] = await Promise.all([
      pool.query(
        'SELECT * FROM goals WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
        [id]
      ),
      pool.query(
        'SELECT * FROM progress_logs WHERE client_id = $1 ORDER BY log_date DESC LIMIT 10',
        [id]
      ),
    ]);

    res.json({
      ...client,
      latest_goal: goalRes.rows[0] || null,
      recent_logs: logsRes.rows,
    });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;
  for (const col of CLIENT_COLS) {
    if (body[col] !== undefined) {
      fields.push(`${col} = $${i++}`);
      values.push(body[col]);
    }
  }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(id, req.nutritionist.id);
  try {
    const { rows } = await pool.query(
      `UPDATE clients SET ${fields.join(', ')}
         WHERE id = $${i++} AND nutritionist_id = $${i}
         RETURNING *`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Not found' });
  try {
    const { rowCount } = await pool.query(
      'DELETE FROM clients WHERE id = $1 AND nutritionist_id = $2',
      [id, req.nutritionist.id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
