import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import "./App.css";

const DARK_COLORS = ["#1a1a1a", "#232323", "#2b2b2b", "#333", "#3d3d3d", "#444", "#555"];
const LIGHT_COLORS = ["#ffffff", "#f5f5f5", "#ebebeb", "#dcdcdc", "#c8c8c8", "#b3b3b3"];
const ORANGE = "#D71921";

const getRandomColor = (isDark) =>
  (isDark ? DARK_COLORS : LIGHT_COLORS)[Math.floor(Math.random() * (isDark ? DARK_COLORS.length : LIGHT_COLORS.length))];

/* -------------------- NOTE CARD COMPONENT -------------------- */
function NoteCard({ note, onDelete, onEdit, toggleChecklist, toggleItemChecked }) {
  return (
    <motion.div
      layout
      className="note-card"
      style={{ background: note.bgColor, minHeight: "fit-content" }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ backgroundColor: ORANGE, scaleX: 0, opacity: 0, originX: 1, transition: { duration: 0.6, ease: "easeInOut" } }}
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

      {/* Render checklist if active, otherwise plain text */}
      {note.isChecklist ? (
        <ul className="checklist">
          {note.checklistItems.map((item, idx) => (
            <li key={idx}>
              <label>
                <input
                  type="checkbox"
                  checked={item.checked}
                  onChange={(e) => {
                    e.stopPropagation();
                    toggleItemChecked(note.id, idx);
                  }}
                />
                <span className={item.checked ? "checked" : ""}>{item.text}</span>
              </label>
            </li>
          ))}
        </ul>
      ) : (
        <p className="note-body">{note.content}</p>
      )}

      <button
        className="checklist-toggle-btn"
        onClick={(e) => {
          e.stopPropagation();
          toggleChecklist(note.id);
        }}
      >
        ✅
      </button>
    </motion.div>
  );
}

/* -------------------- MAIN HOME COMPONENT -------------------- */
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

  const backendUrl = process.env.REACT_APP_BACKEND_URL || "https://n-notes.onrender.com";

  /* -------------------- LOAD THEME -------------------- */
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "light") {
      setIsDarkMode(false);
      document.body.classList.add("light-mode");
    }
  }, []);

  /* -------------------- FETCH USER + NOTES -------------------- */
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

  useEffect(() => {
    if (editing) {
      autoResize(headlineRef.current);
      autoResize(contentRef.current);
    }
  }, [editing, headline, content]);

  /* -------------------- SAVE / EDIT -------------------- */
  async function handleSave() {
    if (!headline.trim() && !content.trim()) {
      setEditing(false);
      setEditingId(null);
      return;
    }

    const method = editingId ? "PUT" : "POST";
    const url = editingId
      ? `${backendUrl}/api/notes/${editingId}`
      : `${backendUrl}/api/notes`;

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ title: headline, content }),
    });

    if (res.ok) {
      const newNote = await res.json();
      setNotes((prev) =>
        editingId
          ? prev.map((n) => (n.id === editingId ? { ...newNote, bgColor: n.bgColor } : n))
          : [{ ...newNote, bgColor: getRandomColor(isDarkMode) }, ...prev]
      );
    }

    setHeadline("");
    setContent("");
    setEditing(false);
    setEditingId(null);
  }

  /* -------------------- DELETE -------------------- */
  async function handleDelete(id) {
    await fetch(`${backendUrl}/api/notes/${id}`, { method: "DELETE", credentials: "include" });
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }

  /* -------------------- CHECKLIST TOGGLE -------------------- */
  const toggleChecklist = (id) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === id) {
          if (!note.isChecklist) {
            const items = note.content.split("\n").map((text) => ({ text, checked: false }));
            return { ...note, isChecklist: true, checklistItems: items, content: "" };
          } else {
            const contentText = note.checklistItems.map((i) => i.text).join("\n");
            return { ...note, isChecklist: false, checklistItems: [], content: contentText };
          }
        }
        return note;
      })
    );
  };

  /* -------------------- TOGGLE CHECKBOX -------------------- */
  const toggleItemChecked = (noteId, idx) => {
    setNotes((prev) =>
      prev.map((note) => {
        if (note.id === noteId) {
          const items = [...note.checklistItems];
          items[idx].checked = !items[idx].checked;
          return { ...note, checklistItems: items };
        }
        return note;
      })
    );
  };

  /* -------------------- THEME TOGGLE -------------------- */
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
        <motion.button className="theme-toggle" onClick={toggleTheme} whileTap={{ rotateY: 180, scale: 1.2 }} transition={{ duration: 0.3 }}>
          {isDarkMode ? "☀️" : "🌙"}
        </motion.button>

        {user ? (
          <div className="profile-container">
            <motion.img
              src={user?.picture || "/assets/default-profile.png"}
              alt="Profile"
              className="profile-pic"
              onClick={() => setShowMenu(!showMenu)}
              animate={{ scale: showMenu ? 1.1 : 1 }}
              transition={{ duration: 0.2 }}
            />
            <AnimatePresence>
              {showMenu && (
                <motion.div className="profile-menu" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.2 }}>
                  <div className="profile-email">{user.email}</div>
                  <button onClick={handleDeleteAll}>🗑 Delete All Data</button>
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
            <NoteCard key={note.id} note={note} onDelete={handleDelete} onEdit={handleEdit} toggleChecklist={toggleChecklist} toggleItemChecked={toggleItemChecked} />
          ))}
        </AnimatePresence>
      </div>

      {user && (
        <button className="add-btn" onClick={() => setEditing(true)}>
          <img src="/assets/generated-image__1___1_-removebg-preview.png" alt="Add Note" width="40" height="40" />
        </button>
      )}

      {editing && (
        <div className="editor-overlay" ref={overlayRef} onClick={(e) => e.target === overlayRef.current && handleSave()}>
          <motion.div className="editor-popup" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
            <input type="text" className="headline-input" placeholder="Title" value={headline} onChange={handleHeadlineChange} ref={headlineRef} />
            <textarea className="content-input" placeholder="Write something..." rows={1} value={content} onChange={handleContentChange} ref={contentRef} />
          </motion.div>
        </div>
      )}
    </div>
  );
}
