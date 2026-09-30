import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        card: "var(--card)",
        muted: "var(--muted)",
        foreground: "var(--foreground)",
        "muted-foreground": "var(--muted-foreground)",
        tertiary: "var(--tertiary-foreground)",
        primary: "var(--primary)",
        "primary-foreground": "var(--primary-foreground)",
        ink: "var(--primary-ink)",
        wash: "var(--primary-wash)",
        separator: "var(--separator)",
      },
      fontFamily: {
        // New York on Apple platforms, like the app's story titles.
        serif: ["ui-serif", '"New York"', "Georgia", "serif"],
      },
      borderRadius: {
        card: "24px",
        list: "20px",
      },
    },
  },
  plugins: [],
} satisfies Config;
