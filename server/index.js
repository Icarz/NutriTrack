require('dotenv').config();
require('./scripts/check-env');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const adminAuth = require('./middleware/adminAuth');
const adminRouter = require('./routes/admin');
const authRouter = require('./routes/auth');
const clientsRouter = require('./routes/clients');
const goalsRouter = require('./routes/goals');
const logsRouter = require('./routes/logs');
const plansRouter = require('./routes/plans');
const mealsRouter = require('./routes/meals');
const auth = require('./middleware/auth');

const { PORT, CLIENT_URL } = process.env;

if (!process.env.NODE_ENV) {
  console.warn('WARNING: NODE_ENV is not set. Defaulting to development.');
}

const app = express();

app.use(helmet());
app.use(cors({ origin: CLIENT_URL, credentials: true }));
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/admin', adminAuth, adminRouter);
app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/clients', goalsRouter);
app.use('/api', auth, logsRouter);
app.use('/api', plansRouter);
app.use('/api', mealsRouter);

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || err.statusCode || 500;
  const message = (status === 500 && process.env.NODE_ENV === 'production')
    ? 'Internal server error'
    : err.message;
  res.status(status).json({ error: message });
});

const port = PORT || 4000;
app.listen(port, () => console.log(`NutriTrack API on :${port}`));
