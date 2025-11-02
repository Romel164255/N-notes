import express from "express";
import { pool } from "../db.js";
import crypto from "crypto";

const router = express.Router();

// ✅ Middleware: Verify authentication
function isLoggedIn(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthorized" });
  next();
}

// ✅ AES-256-GCM encryption setup
const ENC_KEY = Buffer.from(process.env.ENC_KEY, "hex"); // Must be 32 bytes

// ✅ Encrypt text using AES-256-GCM
function encrypt(text) {
  if (!text) return null;

  const iv = crypto.randomBytes(12); // Initialization vector
  const cipher = crypto.createCipheriv("aes-256-gcm", ENC_KEY, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");

  // Store IV, auth tag, and ciphertext together
  return `${iv.toString("hex")}:${authTag}:${encrypted}`;
}

// ✅ Decrypt text
function decrypt(data) {
  if (!data) return "";

  const parts = data.split(":");
  if (parts.length !== 3) return data; // Handle unencrypted legacy notes

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENC_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/* ===========================
   📝 ROUTES
   =========================== */

// ✅ Fetch all notes (GET /notes)
router.get("/", isLoggedIn, async (req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM notes WHERE user_id = $1 ORDER BY created_at DESC",
      [req.user.id]
    );

    // Decrypt all notes before sending to client
    const decryptedNotes = rows.map((note) => ({
      ...note,
      title: decrypt(note.title),
      content: decrypt(note.content),
    }));

    res.json(decryptedNotes);
  } catch (err) {
    console.error("❌ Decrypt Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Create a new note (POST /notes)
router.post("/", isLoggedIn, async (req, res) => {
  const { title, content } = req.body;

  try {
    const encTitle = encrypt(title || "");
    const encContent = encrypt(content || "");

    const { rows } = await pool.query(
      `INSERT INTO notes (user_id, title, content, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING *`,
      [req.user.id, encTitle, encContent]
    );

    const note = rows[0];
    note.title = decrypt(note.title);
    note.content = decrypt(note.content);

    res.json(note);
  } catch (err) {
    console.error("❌ Encrypt Insert Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Update a note (PUT /notes/:id)
router.put("/:id", isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;

  try {
    const encTitle = encrypt(title || "");
    const encContent = encrypt(content || "");

    const { rows } = await pool.query(
      `UPDATE notes
       SET title = $1, content = $2, updated_at = NOW()
       WHERE id = $3 AND user_id = $4
       RETURNING *`,
      [encTitle, encContent, id, req.user.id]
    );

    if (rows.length === 0)
      return res.status(404).json({ error: "Note not found" });

    const note = rows[0];
    note.title = decrypt(note.title);
    note.content = decrypt(note.content);

    res.json(note);
  } catch (err) {
    console.error("❌ Encrypt Update Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Delete a note (DELETE /notes/:id)
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    await pool.query(
      "DELETE FROM notes WHERE id = $1 AND user_id = $2",
      [req.params.id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("❌ Delete Error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
