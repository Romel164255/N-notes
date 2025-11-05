import { useEffect, useState } from "react";
import "./ThemeToggle.css";

export default function ThemeToggle({ onToggle }) {
  const [isDark, setIsDark] = useState(
    () => localStorage.getItem("theme") === "dark"
  );

  // Handle dark/light mode + favicon
  useEffect(() => {
    document.body.classList.toggle("light-mode", !isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");

    // 🔄 Tell Home.jsx the theme has changed
    if (onToggle) onToggle(isDark);

    // 🎨 Swap favicon dynamically
    const favicon = document.querySelector("link[rel='icon']");
    if (favicon) {
      favicon.href = isDark
        ? "/assets/favicon-dark.svg"
        : "/assets/favicon.svg";
    }
  }, [isDark]);

  return (
    <label className="switch">
      <input
        type="checkbox"
        checked={isDark}
        onChange={() => setIsDark(!isDark)}
      />
      <span className="slider round"></span>
    </label>
  );
}
