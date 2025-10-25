import express from "express";
import { pool } from "../db.js";

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// Fetch user notes
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC",
      [req.user.id]
    );
    res.json(result.rows.map(n => ({
      ...n,
      checklistItems: n.checklist_items ? JSON.parse(n.checklist_items) : [],
      isChecklist: n.is_checklist || false
    })));
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Create a note
router.post("/", isLoggedIn, async (req, res) => {
  const { title, content, isChecklist = false, checklistItems = [] } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO notes (user_id, title, content, is_checklist, checklist_items, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW()) RETURNING *`,
      [req.user.id, title || "", content || "", isChecklist, JSON.stringify(checklistItems)]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Update a note
router.put("/:id", isLoggedIn, async (req, res) => {
  const { title, content, isChecklist = false, checklistItems = [] } = req.body;
  try {
    const result = await pool.query(
      `UPDATE notes SET title=$1, content=$2, is_checklist=$3, checklist_items=$4 WHERE id=$5 AND user_id=$6 RETURNING *`,
      [title || "", content || "", isChecklist, JSON.stringify(checklistItems), req.params.id, req.user.id]
    );
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a note
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    await pool.query("DELETE FROM notes WHERE id=$1 AND user_id=$2", [req.params.id, req.user.id]);
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
