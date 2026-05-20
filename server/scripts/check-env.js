require('dotenv').config();

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'SUPER_ADMIN_SECRET', 'PORT', 'CLIENT_URL'];

const missing = REQUIRED.filter((k) => !process.env[k] || process.env[k].trim() === '');

if (missing.length) {
  console.error(`FATAL: missing required env vars: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET must be at least 32 chars');
  process.exit(1);
}
if (process.env.SUPER_ADMIN_SECRET.length < 32) {
  console.error('FATAL: SUPER_ADMIN_SECRET must be at least 32 chars');
  process.exit(1);
}

module.exports = { REQUIRED };
