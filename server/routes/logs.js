const express = require('express');
const pool = require('../db/pool');
const { sanitizeBody } = require('../lib/sanitize');

const router = express.Router();

const LOG_LIMITS = { session_notes: 2000, plan_adjustments: 2000 };

const UPDATABLE_COLS = [
  'log_date',
  'weight',
  'waist_cm',
  'hips_cm',
  'arms_cm',
  'session_notes',
  'plan_adjustments',
  'next_appointment',
];

async function clientOwned(clientId, nutritionistId) {
  const { rows } = await pool.query(
    'SELECT id, start_weight FROM clients WHERE id = $1 AND nutritionist_id = $2',
    [clientId, nutritionistId]
  );
  return rows[0] || null;
}

async function logOwnedClientId(logId, nutritionistId) {
  const { rows } = await pool.query(
    `SELECT c.id AS client_id
       FROM clients c
       JOIN progress_logs pl ON pl.client_id = c.id
      WHERE pl.id = $1 AND c.nutritionist_id = $2`,
    [logId, nutritionistId]
  );
  return rows[0]?.client_id || null;
}

function isValidIsoDate(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !Number.isNaN(d.getTime());
}

function isFutureDate(s) {
  const d = new Date(s + 'T00:00:00Z');
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return d.getTime() > today.getTime();
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toNum(v) {
  if (v == null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function round1(n) {
  return Math.round(n * 10) / 10;
}

function attachDeltas(rowsDesc) {
  // rowsDesc ordered by log_date DESC, id DESC.
  // delta = this.weight - chronologically-previous.weight (the next row in DESC list).
  const out = rowsDesc.map((r) => ({ ...r }));
  for (let i = 0; i < out.length; i++) {
    const older = out[i + 1];
    if (!older || older.weight == null || out[i].weight == null) {
      out[i].weight_delta = null;
    } else {
      out[i].weight_delta = round1(Number(out[i].weight) - Number(older.weight));
    }
  }
  return out;
}

async function fetchLogsAndSummary(clientId, client) {
  const { rows } = await pool.query(
    `SELECT id, client_id,
            TO_CHAR(log_date, 'YYYY-MM-DD') AS log_date,
            weight, waist_cm, hips_cm, arms_cm,
            session_notes, plan_adjustments,
            TO_CHAR(next_appointment, 'YYYY-MM-DD') AS next_appointment,
            created_at
       FROM progress_logs
      WHERE client_id = $1
      ORDER BY log_date DESC, id DESC`,
    [clientId]
  );
  const logs = attachDeltas(rows);

  const mostRecent = logs[0] || null;
  let daysSinceLastLog = null;
  if (mostRecent) {
    const last = new Date(mostRecent.log_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    last.setHours(0, 0, 0, 0);
    daysSinceLastLog = Math.floor((today - last) / (1000 * 60 * 60 * 24));
  }

  const startWeight = client.start_weight != null ? Number(client.start_weight) : null;
  const currentWeight =
    mostRecent && mostRecent.weight != null ? Number(mostRecent.weight) : null;

  const totalLost =
    startWeight != null && currentWeight != null
      ? round1(startWeight - currentWeight)
      : null;

  const goalRes = await pool.query(
    'SELECT target_weight FROM goals WHERE client_id = $1 ORDER BY created_at DESC LIMIT 1',
    [clientId]
  );
  const targetWeight = goalRes.rows[0]?.target_weight;

  let progressPct = null;
  if (
    targetWeight != null &&
    startWeight != null &&
    currentWeight != null &&
    Number(startWeight) !== Number(targetWeight)
  ) {
    let pct =
      ((startWeight - currentWeight) / (startWeight - Number(targetWeight))) * 100;
    if (pct < 0) pct = 0;
    if (pct > 100) pct = 100;
    progressPct = round1(pct);
  }

  return {
    logs,
    summary: {
      total_lost: totalLost,
      progress_pct: progressPct,
      days_since_last_log: daysSinceLastLog,
      is_overdue: daysSinceLastLog != null && daysSinceLastLog > 14,
    },
  };
}

// GET /api/clients/:id/logs
router.get('/clients/:id/logs', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  try {
    const client = await clientOwned(clientId, req.nutritionist.id);
    if (!client) return res.status(404).json({ error: 'Not found' });
    const payload = await fetchLogsAndSummary(clientId, client);
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/clients/:id/logs
router.post('/clients/:id/logs', async (req, res) => {
  const clientId = parseInt(req.params.id, 10);
  if (!Number.isInteger(clientId)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  const s = sanitizeBody(body, LOG_LIMITS);
  if (s.error) return res.status(400).json({ error: s.error });

  const weight = toNum(body.weight);
  if (weight == null || weight <= 0) {
    return res.status(400).json({ error: 'weight required and must be a positive number' });
  }

  const logDate = body.log_date || todayIso();
  if (!isValidIsoDate(logDate)) {
    return res.status(400).json({ error: 'log_date must be YYYY-MM-DD' });
  }
  if (isFutureDate(logDate)) {
    return res.status(400).json({ error: 'log_date cannot be in the future' });
  }

  const nextAppt = body.next_appointment;
  if (nextAppt != null && nextAppt !== '' && !isValidIsoDate(nextAppt)) {
    return res.status(400).json({ error: 'next_appointment must be YYYY-MM-DD' });
  }

  try {
    const client = await clientOwned(clientId, req.nutritionist.id);
    if (!client) return res.status(404).json({ error: 'Not found' });

    const { rows } = await pool.query(
      `INSERT INTO progress_logs
         (client_id, log_date, weight, waist_cm, hips_cm, arms_cm,
          session_notes, plan_adjustments, next_appointment)
       VALUES ($1, $2::date, $3, $4, $5, $6, $7, $8, $9::date)
       RETURNING id, client_id,
                 TO_CHAR(log_date, 'YYYY-MM-DD') AS log_date,
                 weight, waist_cm, hips_cm, arms_cm,
                 session_notes, plan_adjustments,
                 TO_CHAR(next_appointment, 'YYYY-MM-DD') AS next_appointment,
                 created_at`,
      [
        clientId,
        logDate,
        weight,
        toNum(body.waist_cm),
        toNum(body.hips_cm),
        toNum(body.arms_cm),
        body.session_notes || null,
        body.plan_adjustments || null,
        nextAppt || null,
      ]
    );
    const created = rows[0];

    const prevRes = await pool.query(
      `SELECT weight FROM progress_logs
        WHERE client_id = $1
          AND (log_date < $2 OR (log_date = $2 AND id < $3))
        ORDER BY log_date DESC, id DESC
        LIMIT 1`,
      [clientId, created.log_date, created.id]
    );
    const prevWeight = prevRes.rows[0]?.weight;
    const weight_delta =
      prevWeight != null ? round1(Number(created.weight) - Number(prevWeight)) : null;

    res.status(201).json({ ...created, weight_delta });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/logs/:logId
router.put('/logs/:logId', async (req, res) => {
  const logId = parseInt(req.params.logId, 10);
  if (!Number.isInteger(logId)) return res.status(404).json({ error: 'Not found' });
  const body = req.body || {};
  const s = sanitizeBody(body, LOG_LIMITS);
  if (s.error) return res.status(400).json({ error: s.error });

  const fields = [];
  const values = [];
  let i = 1;
  for (const col of UPDATABLE_COLS) {
    if (Object.prototype.hasOwnProperty.call(body, col)) {
      let val = body[col];
      if (col === 'weight') {
        val = toNum(val);
        if (val == null || val <= 0) {
          return res.status(400).json({ error: 'weight must be a positive number' });
        }
      } else if (col === 'log_date') {
        if (!isValidIsoDate(val)) {
          return res.status(400).json({ error: 'log_date must be YYYY-MM-DD' });
        }
        if (isFutureDate(val)) {
          return res.status(400).json({ error: 'log_date cannot be in the future' });
        }
      } else if (col === 'next_appointment') {
        if (val != null && val !== '' && !isValidIsoDate(val)) {
          return res.status(400).json({ error: 'next_appointment must be YYYY-MM-DD' });
        }
        if (val === '') val = null;
      } else if (['waist_cm', 'hips_cm', 'arms_cm'].includes(col)) {
        val = toNum(val);
      }
      const cast = col === 'log_date' || col === 'next_appointment' ? '::date' : '';
      fields.push(`${col} = $${i++}${cast}`);
      values.push(val);
    }
  }

  if (!fields.length) return res.status(400).json({ error: 'No fields to update' });

  try {
    const ownedClientId = await logOwnedClientId(logId, req.nutritionist.id);
    if (!ownedClientId) return res.status(404).json({ error: 'Not found' });

    values.push(logId);
    const { rows } = await pool.query(
      `UPDATE progress_logs SET ${fields.join(', ')}
        WHERE id = $${i}
        RETURNING id, client_id,
                  TO_CHAR(log_date, 'YYYY-MM-DD') AS log_date,
                  weight, waist_cm, hips_cm, arms_cm,
                  session_notes, plan_adjustments,
                  TO_CHAR(next_appointment, 'YYYY-MM-DD') AS next_appointment,
                  created_at`,
      values
    );
    res.json(rows[0]);
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/logs/:logId
router.delete('/logs/:logId', async (req, res) => {
  const logId = parseInt(req.params.logId, 10);
  if (!Number.isInteger(logId)) return res.status(404).json({ error: 'Not found' });
  try {
    const ownedClientId = await logOwnedClientId(logId, req.nutritionist.id);
    if (!ownedClientId) return res.status(404).json({ error: 'Not found' });
    await pool.query('DELETE FROM progress_logs WHERE id = $1', [logId]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
