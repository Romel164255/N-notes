import express from "express";
import { pool } from "../db.js";
const router = express.Router();

router.post("/", express.json(), async (req, res) => {
  try {
    const { uid, fileId, fileName, createdAt, size } = req.body || {};
    if (!fileId) return res.status(400).json({ ok: false, error: "missing_fileId" });
    await pool.query(
      "INSERT INTO notes_metadata (user_id, drive_file_id, file_name, created_at, size) VALUES ($1, $2, $3, $4, $5)",
      [uid || null, fileId, fileName || null, createdAt || new Date().toISOString(), size || null]
    );
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false });
  }
});

export default router;
