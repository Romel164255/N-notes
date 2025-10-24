-- migrations/00_schema.sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  google_sub_hash TEXT UNIQUE NOT NULL,
  email_obfuscated TEXT,
  display_name TEXT,
  refresh_token_enc TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes_metadata (
  id SERIAL PRIMARY KEY,
  google_sub_hash TEXT,
  drive_file_id TEXT NOT NULL,
  file_name TEXT,
  created_at TIMESTAMP,
  size BIGINT
);

CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event VARCHAR(80) NOT NULL,
  ts BIGINT,
  payload JSONB,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
