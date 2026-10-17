/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F7F8FC",
        ink: "#111827",
        mute: "#667085",
        line: "#E6E8EF",
        primary: {
          DEFAULT: "#5B4BDB",
          dark: "#4435B8",
        },
        accent: {
          blue: "#20B8E6",
          violet: "#8B5CF6",
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 8px 30px rgba(20, 20, 40, 0.06)",
        lift: "0 16px 40px rgba(20, 20, 40, 0.10)",
        glow: "0 10px 30px rgba(91, 75, 219, 0.28)",
      },
      borderRadius: {
        card: "20px",
        btn: "12px",
      },
    },
  },
  plugins: [],
};
