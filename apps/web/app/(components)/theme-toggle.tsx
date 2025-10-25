"use client";

import { useTheme } from "next-themes";
import * as React from "react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="fixed top-6 right-6 z-50">
        <div className="w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg" />
      </div>
    );
  }

  const themes = [
    { value: "light", icon: "☀️", label: "Light" },
    { value: "dark", icon: "🌙", label: "Dark" },
    { value: "system", icon: "💻", label: "System" },
  ];

  const currentTheme = theme || "system";

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="relative">
        <button
          onClick={() => {
            const currentIndex = themes.findIndex((t) => t.value === currentTheme);
            const nextIndex = (currentIndex + 1) % themes.length;
            setTheme(themes[nextIndex].value);
          }}
          className="w-12 h-12 rounded-full bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-xl hover:scale-105 active:scale-95"
          aria-label="Toggle theme"
          title={`Current: ${themes.find((t) => t.value === currentTheme)?.label || "System"} (click to cycle)`}
        >
          {themes.find((t) => t.value === currentTheme)?.icon || "💻"}
        </button>
        
        {/* Dropdown menu for better UX */}
        <div className="absolute top-14 right-0 bg-white dark:bg-[#1a1a1a] border border-[#e5ddd0] dark:border-[#333333] rounded-xl shadow-xl overflow-hidden opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto transition-opacity">
          {themes.map((t) => (
            <button
              key={t.value}
              onClick={() => setTheme(t.value)}
              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-[#f5f0e8] dark:hover:bg-[#0f0f0f] transition-colors ${
                currentTheme === t.value
                  ? "bg-[#fff4e6] dark:bg-[#2a1a0a] text-[#ff6600]"
                  : "text-[#1a1410] dark:text-[#f0f0f0]"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              <span className="font-medium">{t.label}</span>
              {currentTheme === t.value && (
                <span className="ml-auto text-[#ff6600]">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

