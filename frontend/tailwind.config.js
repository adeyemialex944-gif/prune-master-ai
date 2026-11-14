/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        charcoal: {
          950: '#09090b',
          900: '#0f0f12',
          850: '#141418',
          800: '#18181b',
          700: '#27272a',
          600: '#3f3f46',
        },
        purple: {
          accent: '#a855f7',
          hover: '#9333ea',
          dim: 'rgba(168, 85, 247, 0.15)',
        }
      }
    },
  },
  plugins: [],
}
