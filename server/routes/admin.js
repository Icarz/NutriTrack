const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../db/pool');

const router = express.Router();

const SAFE_COLS = 'id, email, name, plan, plan_expires_at, is_active, created_at';
const VALID_PLANS = ['trial', 'solo', 'growth'];

function isValidIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}

router.get('/nutritionists', async (req, res, next) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        n.id,
        n.name,
        n.email,
        n.plan,
        n.plan_expires_at,
        n.is_active,
        n.created_at,
        COUNT(DISTINCT c.id)::int  AS client_count,
        COUNT(DISTINCT dp.id)::int AS total_plans,
        COUNT(DISTINCT pl.id)::int AS total_logs,
        GREATEST(
          MAX(c.created_at),
          MAX(dp.created_at),
          MAX(pl.created_at)
        ) AS last_activity
      FROM nutritionist n
      LEFT JOIN clients c        ON c.nutritionist_id = n.id
      LEFT JOIN diet_plans dp    ON dp.client_id = c.id
      LEFT JOIN progress_logs pl ON pl.client_id = c.id
      GROUP BY n.id
      ORDER BY n.created_at DESC
    `);
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

router.post('/nutritionists', async (req, res, next) => {
  const { name, email, password, plan = 'trial' } = req.body || {};
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, password required' });
  }
  if (!password || password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }
  if (plan && !VALID_PLANS.includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan. Must be trial, solo, or growth' });
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
    // 23505 = unique_violation (duplicate email)
    if (e.code === '23505') return res.status(409).json({ error: 'Email already exists' });
    next(e);
  }
});

router.put('/nutritionists/:id', async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
  const { plan, plan_expires_at, is_active, name } = req.body || {};
  if (plan !== undefined && !VALID_PLANS.includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  if (plan_expires_at !== undefined && plan_expires_at !== null && !isValidIsoDate(plan_expires_at)) {
    return res.status(400).json({ error: 'Invalid plan_expires_at date' });
  }
  const fields = [];
  const values = [];
  let i = 1;
  if (plan !== undefined) { fields.push(`plan = $${i++}`); values.push(plan); }
  if (plan_expires_at !== undefined) { fields.push(`plan_expires_at = $${i++}`); values.push(plan_expires_at); }
  if (is_active !== undefined) { fields.push(`is_active = $${i++}`); values.push(Boolean(is_active)); }
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
    next(e);
  }
});

router.post('/nutritionists/:id/reset-password', async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
  const { new_password } = req.body || {};
  if (typeof new_password !== 'string' || new_password.length < 12) {
    return res.status(400).json({ error: 'Password must be at least 12 characters' });
  }
  try {
    const password_hash = await bcrypt.hash(new_password, 12);
    const { rowCount } = await pool.query(
      'UPDATE nutritionist SET password_hash = $1 WHERE id = $2',
      [password_hash, id]
    );
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

router.delete('/nutritionists/:id', async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid id' });
  try {
    const { rowCount } = await pool.query('DELETE FROM nutritionist WHERE id = $1', [id]);
    if (!rowCount) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
