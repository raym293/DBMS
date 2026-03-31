/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'vcs-primary': '#6366f1',
        'vcs-secondary': '#4f46e5',
        'vcs-dark': '#1e1e2e',
        'vcs-light': '#f8fafc'
      }
    },
  },
  plugins: [],
}
