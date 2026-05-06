"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {return null;}

  const isDark = theme === "dark";

  return (
    <button
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="text-text-secondary hover:text-text-primary hover:bg-white/[0.04] inline-flex size-9 items-center justify-center rounded-sm transition-colors duration-[120ms]"
    >
      {isDark
        ? <Sun className="size-4" />
        : <Moon className="size-4" />
      }
    </button>
  );
}
