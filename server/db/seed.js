require('dotenv').config();
const bcrypt = require('bcryptjs');
const pool = require('./pool');

(async () => {
  try {
    const { rows } = await pool.query('SELECT id FROM nutritionist LIMIT 1');
    if (rows.length) {
      console.log('Nutritionist row already exists — skipping seed.');
      process.exit(0);
    }
    const password_hash = await bcrypt.hash('dev123', 10);
    await pool.query(
      `INSERT INTO nutritionist (name, email, password_hash, plan)
       VALUES ($1, $2, $3, $4)`,
      ['Test Nutritionist', 'test@nutritrack.com', password_hash, 'trial']
    );
    console.log('Seeded test@nutritrack.com / dev123');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
