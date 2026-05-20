const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const pool = require('../db/pool');
const auth = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, password_hash, plan, plan_expires_at, is_active, created_at FROM nutritionist WHERE email = $1',
      [email]
    );
    const n = rows[0];
    if (!n) return res.status(401).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, n.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
    if (!n.is_active) return res.status(403).json({ error: 'Account suspended' });
    const token = jwt.sign({ id: n.id, email: n.email }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const { password_hash, ...safe } = n;
    res.json({ token, nutritionist: safe });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => res.json({ success: true }));

router.get('/me', auth, (req, res) => res.json(req.nutritionist));

module.exports = router;
