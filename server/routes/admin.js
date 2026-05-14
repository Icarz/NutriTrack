const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const router = express.Router();

const SAFE_COLS = 'id, email, name, plan, plan_expires_at, is_active, created_at';

router.get('/nutritionists', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT n.id, n.email, n.name, n.plan, n.plan_expires_at, n.is_active, n.created_at,
             COALESCE(c.client_count, 0)::int AS client_count
      FROM nutritionist n
      LEFT JOIN (
        SELECT nutritionist_id, COUNT(*) AS client_count
        FROM clients GROUP BY nutritionist_id
      ) c ON c.nutritionist_id = n.id
      ORDER BY n.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/nutritionists', async (req, res) => {
  const { name, email, password, plan = 'trial' } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password required' });
  }
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO nutritionist (name, email, password_hash, plan)
       VALUES ($1, $2, $3, $4)
       RETURNING ${SAFE_COLS}`,
      [name, email, password_hash, plan]
    );
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/nutritionists/:id', async (req, res) => {
  const { id } = req.params;
  const { plan, plan_expires_at, is_active, name } = req.body || {};
  const fields = [];
  const values = [];
  let i = 1;
  if (plan !== undefined) { fields.push(`plan = $${i++}`); values.push(plan); }
  if (plan_expires_at !== undefined) { fields.push(`plan_expires_at = $${i++}`); values.push(plan_expires_at); }
  if (is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(is_active); }
  if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });
  values.push(id);
  try {
    const { rows } = await pool.query(
      `UPDATE nutritionist SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${SAFE_COLS}`,
      values
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/nutritionists/:id', async (req, res) => {
  try {
    const { rowCount } = await pool.query('DELETE FROM nutritionist WHERE id = $1', [req.params.id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
