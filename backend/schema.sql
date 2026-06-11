CREATE TABLE IF NOT EXISTS jobs (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  company       TEXT,
  location      TEXT,
  tech_stack    TEXT[],
  contract_type TEXT,
  date_posted   TIMESTAMP,
  source        TEXT,
  url           TEXT UNIQUE NOT NULL
);
