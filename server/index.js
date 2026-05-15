require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const adminAuth = require('./middleware/adminAuth');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const clientsRouter = require('./routes/clients');

const { JWT_SECRET, SUPER_ADMIN_SECRET, PORT, CLIENT_URL } = process.env;

if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: JWT_SECRET missing or under 32 chars');
  process.exit(1);
}
if (!SUPER_ADMIN_SECRET || SUPER_ADMIN_SECRET.length < 32) {
  console.error('FATAL: SUPER_ADMIN_SECRET missing or under 32 chars');
  process.exit(1);
}

const app = express();

app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/admin', adminAuth, adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);

const port = PORT || 4000;
app.listen(port, () => console.log(`NutriTrack API on :${port}`));
