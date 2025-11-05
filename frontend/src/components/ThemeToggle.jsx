import { useEffect, useState } from "react";
import "./ThemeToggle.css"; // we'll create this next

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem("theme") === "dark");

  useEffect(() => {
    document.body.classList.toggle("light-mode", !isDark);
    localStorage.setItem("theme", isDark ? "dark" : "light");
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
