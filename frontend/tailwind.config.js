/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",
    "./src/app/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        severity: {
          none:     { DEFAULT: "#16a34a", bg: "#f0fdf4", border: "#86efac" },
          mild:     { DEFAULT: "#ca8a04", bg: "#fefce8", border: "#fde047" },
          moderate: { DEFAULT: "#ea580c", bg: "#fff7ed", border: "#fdba74" },
          severe:   { DEFAULT: "#dc2626", bg: "#fef2f2", border: "#fca5a5" },
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
