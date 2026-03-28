"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="p-2  transition flex items-center justify-center"
    >
      {isDark ? (
        <Moon className="size-6 transition-transform duration-200 hover:scale-110 text-text-muted" />
      ) : (
        <Sun className="size-6 transition-transform duration-200 hover:scale-110 text-yellow-500" />
      )}
    </button>
  );
}
