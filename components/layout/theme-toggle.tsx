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

// The inline script in app/layout.tsx already resolved stored-or-system theme
function currentTheme(): Theme {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(currentTheme());
  }, []);

  function toggleTheme() {
    const next = currentTheme() === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem(storageKey, next);
    applyTheme(next);
  }

  return { theme, toggleTheme };
}

export function ThemeToggle({ className, withLabel = false }: { className?: string; withLabel?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const Icon = theme === "light" ? Moon : Sun;
  const label = theme === "light" ? "Dark mode" : "Light mode";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      className={cn(
        "flex items-center gap-2.5 rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink",
        withLabel ? "h-8 px-2.5 text-[13px]" : "size-8 justify-center",
        className
      )}
    >
      <Icon className="size-4 shrink-0" />
      {withLabel && <span className="truncate">{label}</span>}
    </button>
  );
}
