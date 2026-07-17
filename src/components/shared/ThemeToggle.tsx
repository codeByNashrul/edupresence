"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

interface ThemeToggleProps {
  variant?: "default" | "header";
}

export default function ThemeToggle({ variant = "default" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isHeader = variant === "header";

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className={
        isHeader
          ? "p-2 rounded-lg text-white/90 hover:bg-white/15 hover:text-white transition"
          : "p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition"
      }
      title={theme === "light" ? "Mode gelap" : "Mode terang"}
      aria-label={theme === "light" ? "Aktifkan mode gelap" : "Aktifkan mode terang"}
    >
      {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
