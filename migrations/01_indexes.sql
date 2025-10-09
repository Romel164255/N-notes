-- migrations/01_indexes.sql
CREATE INDEX IF NOT EXISTS analytics_event_idx ON analytics_events(event, ts);
CREATE INDEX IF NOT EXISTS notes_metadata_user_idx ON notes_metadata(google_sub_hash);
CREATE INDEX IF NOT EXISTS users_google_hash_idx ON users(google_sub_hash);
