/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        severity: {
          none:     { DEFAULT: "#34d399", bg: "rgba(52,211,153,.08)",  border: "rgba(52,211,153,.2)" },
          mild:     { DEFAULT: "#fbbf24", bg: "rgba(251,191,36,.08)",  border: "rgba(251,191,36,.2)" },
          moderate: { DEFAULT: "#fb923c", bg: "rgba(251,146,60,.08)",  border: "rgba(251,146,60,.2)" },
          severe:   { DEFAULT: "#f87171", bg: "rgba(248,113,113,.08)", border: "rgba(248,113,113,.25)" },
        },
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease forwards",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

