import express from "express";
import { pool } from "../db.js";

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Get notes
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Create note
router.post("/", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO notes (user_id, title, content, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [req.user.id, title || null, content || null]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Update note
router.put("/:id", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      "UPDATE notes SET title=$1, content=$2 WHERE id=$3 AND user_id=$4 RETURNING *",
      [title, content, req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Note not found" });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete note
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM notes WHERE id=$1 AND user_id=$2 RETURNING *",
      [req.params.id, req.user.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: "Note not found" });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
