import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const DARK_COLORS = ["#1a1a1a", "#232323", "#2b2b2b", "#333", "#3d3d3d", "#444", "#555"];
const getRandomColor = () => DARK_COLORS[Math.floor(Math.random() * DARK_COLORS.length)];

const ORANGE = "#ff5e00"; // Nothing orange for delete animation

/* -------------------- NOTE CARD COMPONENT -------------------- */
function NoteCard({ note, onDelete, onEdit }) {
  return (
    <motion.div
      layout
      className="note-card"
      style={{ background: note.bgColor || "#222" }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        backgroundColor: ORANGE,
        scaleX: 0,
        opacity: 0,
        transition: { duration: 0.6, ease: "easeInOut" },
        originX: 1, // shrink from right to left
      }}
      onClick={() => onEdit(note)}
    >
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation(); // prevent triggering edit
          onDelete(note.id);
        }}
      >
        ✕
      </button>
      <h3>{note.title}</h3>
      <p>{note.content}</p>
    </motion.div>
  );
}

/* -------------------- MAIN HOME COMPONENT -------------------- */
export default function Home() {
  const [notes, setNotes] = useState([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const overlayRef = useRef();

  /* -------------------- LOGIN CHECK + FETCH NOTES -------------------- */
  useEffect(() => {
    fetch("http://localhost:5000/auth/me", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        setLoggedIn(data.loggedIn);
        if (data.loggedIn) loadNotes();
      });
  }, []);

  async function loadNotes() {
    const res = await fetch("http://localhost:5000/api/notes", { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setNotes(data.map((n) => ({ ...n, bgColor: getRandomColor() })));
    }
  }

  /* -------------------- SOUND + VIBRATION HELPERS -------------------- */
  function playDeleteSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
    osc.stop(ctx.currentTime + 0.18);
  }

  function playSaveSound() {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(520, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
    osc.stop(ctx.currentTime + 0.25);
  }

  function triggerVibration() {
    if ("vibrate" in navigator) navigator.vibrate(70);
  }

  /* -------------------- ADD / EDIT / SAVE NOTES -------------------- */
  async function handleSave() {
    if (!headline.trim() && !content.trim()) {
      setEditing(false);
      setEditingId(null);
      return;
    }

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `http://localhost:5000/api/notes/${editingId}`
      : "http://localhost:5000/api/notes";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: headline, content }),
    });

    if (res.ok) {
      playSaveSound(); // ✅ sound feedback
      triggerVibration();

      const newNote = await res.json();
      setNotes((prev) =>
        editingId
          ? prev.map((n) => (n.id === editingId ? { ...newNote, bgColor: n.bgColor } : n))
          : [{ ...newNote, bgColor: getRandomColor() }, ...prev]
      );
    }

    setHeadline("");
    setContent("");
    setEditing(false);
    setEditingId(null);
  }

  async function handleDelete(id) {
    playDeleteSound(); // ✅ sound feedback
    triggerVibration();

    const res = await fetch(`http://localhost:5000/api/notes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  function handleEdit(note) {
    setHeadline(note.title);
    setContent(note.content);
    setEditingId(note.id);
    setEditing(true);
  }

  const handleLogin = () => (window.location.href = "http://localhost:5000/auth/google");
  const handleLogout = () =>
    fetch("http://localhost:5000/auth/logout", { credentials: "include" }).then(() => {
      setLoggedIn(false);
      setNotes([]);
    });

  /* -------------------- RENDER -------------------- */
  return (
    <div className="app-container">
      {/* Header */}
      <div className="top-bar">
        <div className="Main-head">Noting</div>
        {loggedIn ? (
          <button className="menu-btn" onClick={handleLogout}>
            Logout
          </button>
        ) : (
          <button className="menu-btn" onClick={handleLogin}>
            Login with Google
          </button>
        )}
      </div>

      {/* Notes Grid */}
      <div className="notes-grid">
        <AnimatePresence>
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onDelete={handleDelete} onEdit={handleEdit} />
          ))}
        </AnimatePresence>
      </div>

      {/* Add Button */}
      {loggedIn && (
        <button className="add-btn" onClick={() => setEditing(true)}>
          ✎
        </button>
      )}

      {/* Editor Overlay */}
      {editing && (
        <div
          className="editor-overlay"
          ref={overlayRef}
          onClick={(e) => e.target === overlayRef.current && handleSave()}
        >
          <motion.div
            className="editor-popup"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <input
              type="text"
              placeholder="Title"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
            <textarea
              placeholder="Write something..."
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
            <div className="editor-actions">
              <button className="save-btn" onClick={handleSave}>
                Save
              </button>
              <button
                className="cancel-btn"
                onClick={() => {
                  setEditing(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
