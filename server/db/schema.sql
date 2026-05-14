CREATE TABLE IF NOT EXISTS nutritionist (
  id               SERIAL PRIMARY KEY,
  email            VARCHAR(255) UNIQUE NOT NULL,
  password_hash    TEXT NOT NULL,
  name             VARCHAR(255) NOT NULL,
  plan             VARCHAR(20) DEFAULT 'trial',
  plan_expires_at  TIMESTAMPTZ,
  is_active        BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clients (
  id               SERIAL PRIMARY KEY,
  nutritionist_id  INT REFERENCES nutritionist(id) ON DELETE CASCADE NOT NULL,
  name             VARCHAR(255) NOT NULL,
  email            VARCHAR(255),
  phone            VARCHAR(50),
  age              INT,
  gender           VARCHAR(20),
  height_cm        NUMERIC(5,1),
  start_weight     NUMERIC(5,1),
  allergies        TEXT,
  medical_notes    TEXT,
  status           VARCHAR(20) DEFAULT 'active',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS goals (
  id              SERIAL PRIMARY KEY,
  client_id       INT REFERENCES clients(id) ON DELETE CASCADE,
  target_weight   NUMERIC(5,1),
  target_date     DATE,
  daily_calories  INT,
  protein_g       INT,
  carbs_g         INT,
  fat_g           INT,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diet_plans (
  id           SERIAL PRIMARY KEY,
  client_id    INT REFERENCES clients(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meals (
  id           SERIAL PRIMARY KEY,
  plan_id      INT REFERENCES diet_plans(id) ON DELETE CASCADE,
  day_of_week  INT NOT NULL,
  meal_type    VARCHAR(50),
  description  TEXT NOT NULL,
  calories     INT,
  protein_g    NUMERIC(5,1),
  carbs_g      NUMERIC(5,1),
  fat_g        NUMERIC(5,1)
);

CREATE TABLE IF NOT EXISTS progress_logs (
  id           SERIAL PRIMARY KEY,
  client_id    INT REFERENCES clients(id) ON DELETE CASCADE,
  log_date     DATE NOT NULL,
  weight       NUMERIC(5,1),
  waist_cm     NUMERIC(5,1),
  hips_cm      NUMERIC(5,1),
  arms_cm      NUMERIC(5,1),
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
