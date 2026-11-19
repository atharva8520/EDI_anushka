/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "#0A0D14",
        "canvas-subtle": "#0F1420",
        surface: "#111827",
        "surface-card": "#131C2E",
        "surface-elevated": "#1A253C",
        ink: "#F8FAFC",
        "ink-light": "#E2E8F0",
        mute: "#94A3B8",
        "mute-dark": "#64748B",
        line: "#1E293B",
        "line-accent": "rgba(0, 242, 254, 0.2)",
        primary: {
          DEFAULT: "#6366F1",
          dark: "#4F46E5",
          neon: "#818CF8",
        },
        cyan: {
          DEFAULT: "#06B6D4",
          neon: "#00F2FE",
        },
        accent: {
          blue: "#00F2FE",
          violet: "#8B5CF6",
          emerald: "#10B981",
          amber: "#F59E0B",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 30px rgba(0, 0, 0, 0.35)",
        lift: "0 16px 40px rgba(0, 0, 0, 0.50)",
        glow: "0 0 25px rgba(99, 102, 241, 0.35)",
        "glow-cyan": "0 0 25px rgba(0, 242, 254, 0.35)",
        "glow-violet": "0 0 25px rgba(139, 92, 246, 0.35)",
      },
      borderRadius: {
        card: "20px",
        btn: "12px",
      },
    },
  },
  plugins: [],
};
