import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const DARK_COLORS = ["#1a1a1a", "#232323", "#2b2b2b", "#333", "#3d3d3d", "#444", "#555"];
const LIGHT_COLORS = ["#ffffff", "#f5f5f5", "#ebebeb", "#dcdcdc", "#c8c8c8", "#b3b3b3"];
const ORANGE = "#D71921";

const getRandomColor = (isDark) =>
  (isDark ? DARK_COLORS : LIGHT_COLORS)[
    Math.floor(Math.random() * (isDark ? DARK_COLORS.length : LIGHT_COLORS.length))
  ];

function NoteCard({ note, onDelete, onEdit }) {
  return (
    <motion.div
      layout
      className="note-card"
      style={{ background: note.bgColor, minHeight: "fit-content" }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{
        backgroundColor: ORANGE,
        scaleX: 0,
        opacity: 0,
        originX: 1,
        transition: { duration: 0.6, ease: "easeInOut" },
      }}
      onClick={() => onEdit(note)}
    >
      <button
        className="delete-btn"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(note.id);
        }}
      >
        ✕
      </button>
      <h3 className="note-title">{note.title}</h3>
      <p className="note-body">{note.content}</p>
    </motion.div>
  );
}

export default function Home() {
  const [notes, setNotes] = useState([]);
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const overlayRef = useRef();
  const headlineRef = useRef(null);
  const contentRef = useRef(null);

  const backendUrl =
    process.env.REACT_APP_BACKEND_URL || "https://n-notes.onrender.com";

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      document.body.classList.add("light-mode");
    }
  }, []);

  useEffect(() => {
    fetch(`${backendUrl}/auth/me`, { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.loggedIn) {
          setUser(data.user);
          loadNotes();
        }
      });
  }, [isDarkMode]);

  async function loadNotes() {
    const res = await fetch(`${backendUrl}/api/notes`, { credentials: "include" });
    if (res.ok) {
      const data = await res.json();
      setNotes(data.map((n) => ({ ...n, bgColor: getRandomColor(isDarkMode) })));
    }
  }

  const autoResize = (el) => {
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  };

  const handleHeadlineChange = (e) => {
    setHeadline(e.target.value);
    autoResize(headlineRef.current);
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
    autoResize(contentRef.current);
  };

  const handleSave = async () => {
    const trimmedHeadline = headline.trim();
    const trimmedContent = content.trim();

    // Case 1: New note but empty → cancel
    if (!trimmedHeadline && !trimmedContent && !editingId) {
      setEditing(false);
      setEditingId(null);
      return;
    }

    // Case 2: Editing but unchanged → close only
    if (editingId) {
      const currentNote = notes.find((n) => n.id === editingId);
      if (
        currentNote &&
        currentNote.title === trimmedHeadline &&
        currentNote.content === trimmedContent
      ) {
        setEditing(false);
        setEditingId(null);
        return;
      }
    }

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${backendUrl}/api/notes/${editingId}`
      : `${backendUrl}/api/notes`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: trimmedHeadline, content: trimmedContent }),
    });

    if (res.ok) {
      const newNote = await res.json();

      setNotes((prev) =>
        editingId
          ? prev.map((n) =>
              n.id === editingId ? { ...newNote, bgColor: n.bgColor } : n
            )
          : [{ ...newNote, bgColor: getRandomColor(isDarkMode) }, ...prev]
      );
    }

    // Reset editor
    setHeadline("");
    setContent("");
    setEditing(false);
    setEditingId(null);
  };

  const handleDelete = async (id) => {
    const res = await fetch(`${backendUrl}/api/notes/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const handleEdit = (note) => {
    setHeadline(note.title);
    setContent(note.content);
    setEditingId(note.id);
    setEditing(true);
  };

  const handleLogin = () => {
    window.location.href = `${backendUrl}/auth/google`;
  };

  const handleLogout = () => {
    fetch(`${backendUrl}/auth/logout`, { credentials: "include" }).then(() => {
      setUser(null);
      setNotes([]);
    });
  };

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    document.body.classList.toggle("light-mode", !newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");
  };

  return (
    <div className={`app-container ${isDarkMode ? "dark" : "light"}`}>
      <div className="top-bar">
        <div className="Main-head">Noting</div>
        <motion.button className="theme-toggle" onClick={toggleTheme}>
          {isDarkMode ? "☀️" : "🌙"}
        </motion.button>

        {user ? (
          <div className="profile-container">
            <motion.img
              src={user?.picture || "/assets/default-profile.png"}
              alt="Profile"
              className="profile-pic"
              onClick={() => setShowMenu(!showMenu)}
            />
            <AnimatePresence>
              {showMenu && (
                <motion.div className="profile-menu">
                  <div className="profile-email">{user.email}</div>
                  <button onClick={handleLogout}>🚪 Logout</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <button className="menu-btn" onClick={handleLogin}>
            Login with Google
          </button>
        )}
      </div>

      <div className="notes-grid">
        <AnimatePresence>
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))}
        </AnimatePresence>
      </div>

      {user && (
        <button className="add-btn" onClick={() => setEditing(true)}>
          <img
            src="/assets/generated-image__1___1_-removebg-preview.png"
            alt="Add Note"
            width="40"
            height="40"
          />
        </button>
      )}

      {editing && (
        <div
          className="editor-overlay"
          ref={overlayRef}
          onClick={(e) => e.target === overlayRef.current && handleSave()}
        >
          <motion.div className="editor-popup">
            <input
              type="text"
              className="headline-input"
              placeholder="Title"
              value={headline}
              onChange={handleHeadlineChange}
              ref={headlineRef}
            />
            <textarea
              className="content-input"
              placeholder="Write something..."
              value={content}
              onChange={handleContentChange}
              ref={contentRef}
            />
          </motion.div>
        </div>
      )}
    </div>
  );
}
