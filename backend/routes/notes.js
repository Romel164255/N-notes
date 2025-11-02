import express from "express";
import { pool } from "../db.js";
import crypto from "crypto";

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

const ENC_KEY = Buffer.from(process.env.ENC_KEY, "hex");

// Encrypt using AES-256-GCM
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// Decrypt function
function decrypt(data) {
  if (!data) return "";
  const parts = data.split(":");
  if (parts.length !== 3) return data; // fallback for old unencrypted notes

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// ✅ Fetch Notes
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM notes WHERE user_id=$1 ORDER BY created_at DESC",
      [req.user.id]
    );

    const decryptedNotes = result.rows.map((note) => ({
      ...note,
      title: decrypt(note.title),
      content: decrypt(note.content),
    }));

    res.json(decryptedNotes);
  } catch (err) {
    console.error("Decrypt Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Create Note
router.post("/", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  try {
    const encTitle = encrypt(title || "");
    const encContent = encrypt(content || "");

    const result = await pool.query(
      "INSERT INTO notes (user_id, title, content, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *",
      [req.user.id, encTitle, encContent]
    );

    const note = result.rows[0];
    note.title = decrypt(note.title);
    note.content = decrypt(note.content);
    res.json(note);
  } catch (err) {
    console.error("Encrypt Insert Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update Note (Edit)
router.put("/:id", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;
  const { id } = req.params;

  try {
    const encTitle = encrypt(title || "");
    const encContent = encrypt(content || "");

    const result = await pool.query(
      `UPDATE notes 
       SET title=$1, content=$2, updated_at=NOW() 
       WHERE id=$3 AND user_id=$4 
       RETURNING *`,
      [encTitle, encContent, id, req.user.id]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "Note not found" });

    const note = result.rows[0];
    note.title = decrypt(note.title);
    note.content = decrypt(note.content);
    res.json(note);
  } catch (err) {
    console.error("Encrypt Update Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Delete Note
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    await pool.query("DELETE FROM notes WHERE id=$1 AND user_id=$2", [
      req.params.id,
      req.user.id,
    ]);
    res.json({ ok: true });
  } catch (err) {
    console.error("Delete Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
