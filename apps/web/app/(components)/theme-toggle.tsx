"use client";

import { useTheme } from "next-themes";
import * as React from "react";

const SunIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const MoonIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
    />
  </svg>
);

const MonitorIcon = () => (
  <svg
    className="w-5 h-5"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-10 w-10 rounded-full bg-muted" aria-hidden />;
  }

  const themes = [
    { value: "light", icon: <SunIcon />, label: "Light" },
    { value: "dark", icon: <MoonIcon />, label: "Dark" },
    { value: "system", icon: <MonitorIcon />, label: "System" },
  ];

  const currentTheme = theme || "system";

  return (
    <button
      onClick={() => {
        const currentIndex = themes.findIndex((t) => t.value === currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        setTheme(themes[nextIndex].value);
      }}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground transition hover:text-ink active:scale-95"
      aria-label="Toggle theme"
      title={`Current: ${themes.find((t) => t.value === currentTheme)?.label || "System"} (click to cycle)`}
    >
      {themes.find((t) => t.value === currentTheme)?.icon || <MonitorIcon />}
    </button>
  );
}
