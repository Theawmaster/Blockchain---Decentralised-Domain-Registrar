"use client";

// imports here
import { useEffect, useState } from "react";

export default function ThemeToggle() {

  // theme state
  const [theme, setTheme] = useState(
    typeof window !== "undefined" ? localStorage.theme ?? "system" : "system"
  );

  // apply theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
      localStorage.theme = "dark";
    } 
    else if (theme === "light") {
      root.classList.add("light");
      root.classList.remove("dark");
      localStorage.theme = "light";
    } 
    else {
      root.classList.remove("light");
      root.classList.remove("dark");
      localStorage.removeItem("theme");
    }
  }, [theme]);

  // is dark mode active
  const isDark = theme === "dark";

  return (
    <div
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="
        w-16 h-8 px-1 flex items-center relative cursor-pointer
        rounded-full transition-colors
        bg-gray-500 border border-[var(--border)]
      "
    >
      {/* Sun / Light */}
      <span className="text-xs absolute left-2 text-yellow-600">☀️</span>

      {/* Moon / Dark */}
      <span className="text-xs absolute right-2 text-gray-300 dark:text-blue-300">🌙</span>

      {/* Slider */}
      <div
        className={`
          w-6 h-6 rounded-full bg-white shadow-md transform transition-transform
          ${isDark ? "translate-x-8" : "translate-x-0"}
        `}
      />
    </div>
  );
}
