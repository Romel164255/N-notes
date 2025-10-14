import express from "express";
import { pool } from "../db.js";

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Fetch user notes
router.get("/", isLoggedIn, async (req, res) => {
  const { id } = req.user;
  try {
    const result = await pool.query(
      "SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC",
      [id]
    );
    res.json(result.rows);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Create a note
router.post("/", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  try {
    const result = await pool.query(
      "INSERT INTO notes (user_id, title, content, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [req.user.id, title || "", content || ""]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a note
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    await pool.query("DELETE FROM notes WHERE id=$1 AND user_id=$2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
