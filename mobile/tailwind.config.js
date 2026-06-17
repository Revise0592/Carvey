/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "var(--accent-500, #3b82f6)",
          light: "var(--accent-100, #dbeafe)",
          dark: "var(--accent-700, #1d4ed8)",
        },
      },
    },
  },
  plugins: [],
};
