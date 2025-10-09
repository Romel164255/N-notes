// Home.jsx
import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import "./App.css";

const BASE_URL = "http://localhost:5000";

/* ---------------- NoteCard (per-note component) ----------------
   - Handles its own animation hooks (safe)
   - Runs flash -> collapse sequence, then calls onDelete(id)
-----------------------------------------------------------------*/
function NoteCard({ note, onEdit, onDelete }) {
  const controls = useAnimation();
  const cardRef = useRef(null);

  // Entrance animation
  useEffect(() => {
    controls.start({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 240, damping: 22 },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Two-step delete: flash orange (0.25s) -> collapse upward (0.4s) -> call onDelete
  async function handleDelete(e) {
    e.stopPropagation();
    try {
      // 1) flash Nothing orange
     await controls.start({
     backgroundColor: "var(--nothing-orange)",
     transition: { duration: 0.25, ease: "easeOut" },
     });


      // 2) curtain-like collapse from bottom to top (scaleY with origin bottom)
      // we set transformOrigin via style so the visual collapses upward
      await controls.start({
        scaleY: 0,
        opacity: 0,
        transition: { duration: 0.4, ease: "easeInOut" },
      });

      // finally inform parent to remove note (and optionally call backend there)
      onDelete(note.id);
    } catch (err) {
      console.error("Delete animation failed", err);
      // fallback: still remove
      onDelete(note.id);
    }
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      // useAnimation controls (single animate prop)
      animate={controls}
      initial={{ opacity: 0, scale: 0.97, y: 20 }}
      // keep exit in case parent removes directly
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.35 } }}
      style={{ transformOrigin: "bottom" }} // ensures scaleY collapses upward
      className={`note-card ${note.colorClass || ""}`}
      onClick={() => onEdit(note)}
    >
      <div className="note-content">
        <h3>{note.title || "Untitled"}</h3>
        <p>{note.content || " "}</p>
      </div>

      <button
        className="delete-btn"
        onClick={handleDelete}
        aria-label="Delete note"
        title="Delete"
      >
        ❌
      </button>
    </motion.div>
  );
}

/* ---------------- Main Home component ---------------- */
export default function Home() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState([]);
  const [editingNote, setEditingNote] = useState(null);
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const editorRef = useRef(null);

  useEffect(() => { checkLogin(); }, []);

  async function checkLogin() {
    try {
      const res = await fetch(`${BASE_URL}/auth/me`, { credentials: "include" });
      const data = await res.json();
      if (data.loggedIn) {
        setUser(data.user);
        await fetchNotes();
      }
    } catch (err) {
      console.error("Login check failed:", err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchNotes() {
    try {
      const res = await fetch(`${BASE_URL}/api/notes`, { credentials: "include" });
      const data = await res.json();
      if (Array.isArray(data)) {
        // assign stable-ish colorClass on fetch (so page refresh randomizes)
        const colored = data.map(n => ({ ...n, colorClass: `note-color-${Math.floor(Math.random() * 4) + 1}` }));
        setNotes(colored);
      }
    } catch (err) {
      console.error("Fetch notes failed:", err);
    }
  }

  async function saveNote() {
    if (!headline.trim() && !content.trim()) return;
    const noteData = { title: headline.trim(), content: content.trim() };

    try {
      if (editingNote?.id) {
        const res = await fetch(`${BASE_URL}/api/notes/${editingNote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(noteData),
        });
        const updated = await res.json();
        if (updated?.id) {
          setNotes(prev => prev.map(n => n.id === updated.id ? { ...updated, colorClass: n.colorClass } : n));
        }
      } else {
        const res = await fetch(`${BASE_URL}/api/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(noteData),
        });
        const newNote = await res.json();
        if (newNote?.id) {
          newNote.colorClass = `note-color-${Math.floor(Math.random() * 4) + 1}`;
          setNotes(prev => [newNote, ...prev]);
        }
      }
    } catch (err) {
      console.error("Save note failed:", err);
    } finally {
      setEditingNote(null); setHeadline(""); setContent("");
    }
  }

  // Parent-level remove: called after NoteCard finishes its animation
  async function onDeleteConfirmed(id) {
    try {
      // call backend
      await fetch(`${BASE_URL}/api/notes/${id}`, { method: "DELETE", credentials: "include" });
    } catch (err) {
      console.error("Server delete failed (will still remove locally):", err);
    } finally {
      // remove locally (AnimatePresence not required since animation already ran)
      setNotes(prev => prev.filter(n => n.id !== id));
      if (editingNote?.id === id) {
        setEditingNote(null); setHeadline(""); setContent("");
      }
    }
  }

  // click-outside auto-save
  useEffect(() => {
    function handleClickOutside(e) {
      if (editingNote && editorRef.current && !editorRef.current.contains(e.target)) {
        if (headline.trim() || content.trim()) saveNote();
        else setEditingNote(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingNote, headline, content]);

  async function handleLogout() {
    await fetch(`${BASE_URL}/auth/logout`, { credentials: "include" });
    setUser(null); setNotes([]);
  }

  if (loading) return <h1 style={{ textAlign: "center", marginTop: 50 }}>Loading...</h1>;

  if (!user) {
    return (
      <div className="login-container">
        <a href={`${BASE_URL}/auth/google`} className="login-btn">
          <img src="https://developers.google.com/identity/images/g-logo.png" alt="Google logo" />
          Sign in with Google
        </a>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="top-bar">
        <h2>Welcome, {user.display_name || user.name}</h2>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>

      <div className="notes-grid">
        <AnimatePresence>
          {notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={(n) => { setEditingNote(n); setHeadline(n.title || ""); setContent(n.content || ""); }}
              onDelete={onDeleteConfirmed}
            />
          ))}
        </AnimatePresence>

        {notes.length === 0 && (
          <p style={{ textAlign: "center", opacity: 0.6 }}>No notes yet</p>
        )}
      </div>

      <motion.button
        className="add-btn"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.96 }}
        onClick={() => { setEditingNote({}); setHeadline(""); setContent(""); }}
      >
        +
      </motion.button>

      {editingNote && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ type: "spring", damping: 15 }}
          className={`editor-panel ${!editingNote.id ? "centered-editor" : ""}`}
          ref={editorRef}
        >
          <input type="text" placeholder="Headline" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          <textarea placeholder="Write your note..." value={content} onChange={(e) => setContent(e.target.value)} rows={6} />
          <p style={{ fontSize: "0.9rem", opacity: 0.7 }}>Click outside to save</p>
        </motion.div>
      )}
    </div>
  );
}
