import express from "express";
import { pool } from "../db.js";
const router = express.Router();

router.post("/event", express.json(), async (req, res) => {
  try {
    const { event, ts, ...payload } = req.body || {};
    if (!event) return res.status(400).json({ ok: false, error: "missing_event" });
    delete payload.noteContent;
    delete payload.content;
    await pool.query(
      "INSERT INTO analytics_events (event, ts, payload) VALUES ($1, $2, $3)",
      [event, ts || Date.now(), payload || {}]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ ok: false });
  }
});

export default router;
