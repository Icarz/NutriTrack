-- Run before deploying server/routes/logs.js (Session 1, Week 3).
-- Adds session-specific columns and drops the generic notes field.

ALTER TABLE progress_logs
  ADD COLUMN IF NOT EXISTS session_notes    TEXT,
  ADD COLUMN IF NOT EXISTS plan_adjustments TEXT,
  ADD COLUMN IF NOT EXISTS next_appointment DATE;

ALTER TABLE progress_logs DROP COLUMN IF EXISTS notes;
