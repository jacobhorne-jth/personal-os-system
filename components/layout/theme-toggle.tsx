"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Theme = "light" | "dark";

const storageKey = "jacob-os-theme";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

function initialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  return window.localStorage.getItem(storageKey) === "dark" ? "dark" : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = initialTheme();
    setTheme(stored);
    applyTheme(stored);
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  const Icon = theme === "light" ? Moon : Sun;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "grid size-10 place-items-center rounded-full border border-line bg-panel text-muted shadow-glow transition hover:bg-paper hover:text-ink",
        className
      )}
    >
      <Icon className="size-4" />
    </button>
  );
}
