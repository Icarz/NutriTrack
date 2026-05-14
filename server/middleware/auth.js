const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Missing token' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT id, email, name, plan, plan_expires_at, is_active, created_at FROM nutritionist WHERE id = $1',
      [payload.id]
    );
    const nutritionist = rows[0];
    if (!nutritionist) return res.status(401).json({ error: 'Invalid token' });
    if (!nutritionist.is_active) return res.status(403).json({ error: 'Account suspended' });
    req.nutritionist = nutritionist;
    next();
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
};
