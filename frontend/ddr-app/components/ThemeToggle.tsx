"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(
    typeof window !== "undefined" ? localStorage.theme ?? "system" : "system"
  );

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

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="
        px-3 py-1 rounded-md border text-sm cursor-pointer
        bg-white/70 dark:bg-black/30 backdrop-blur
        text-gray-800 dark:text-gray-200
        hover:scale-105 transition
      "
    >
      {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
    </button>
  );
}
