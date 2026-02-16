/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Atops Display"', 'Segoe UI', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        gold: {
          DEFAULT: '#FFD700',
          dark: '#B8960C',
          muted: 'rgba(255, 215, 0, 0.15)',
        },
      },
    },
  },
  plugins: [],
};
