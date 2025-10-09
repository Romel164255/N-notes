

## Added Google Drive & Analytics integration
Files added:
- backend/server.js
- backend/package.json
- backend/routes/auth.js
- backend/routes/analytics.js
- backend/routes/notes_meta.js
- migrations/00_schema.sql
- migrations/01_indexes.sql
- frontend/src/GoogleDriveAuth.jsx

Run migrations: psql $DATABASE_URL -f migrations/00_schema.sql
Then: psql $DATABASE_URL -f migrations/01_indexes.sql
Set env vars in .env and run backend with `node backend/server.js` and frontend as usual.
