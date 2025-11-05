import React, { useState, useEffect } from "react";
import "./ThemeToggle.css";
import sunIcon from "../assets/favicon.svg";
import moonIcon from "../assets/favicon-dark.svg";

export default function ThemeToggle() {
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode);
  }, [darkMode]);

  return (
    <button
      className={`theme-toggle ${darkMode ? "dark" : "light"}`}
      onClick={() => setDarkMode(!darkMode)}
    >
      <img
        src={darkMode ? moonIcon : sunIcon}
        alt={darkMode ? "Dark mode" : "Light mode"}
        className="toggle-icon"
      />
    </button>
  );
}
