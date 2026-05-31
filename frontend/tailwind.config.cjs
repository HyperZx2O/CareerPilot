/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './src/app/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        cp: {
          bg: '#0a0e1a',
          surface: '#111827',
          'surface-2': '#1a2235',
          border: '#1e293b',
          'border-hover': '#334155',
          text: '#f1f5f9',
          'text-muted': '#94a3b8',
          'text-dim': '#64748b',
          primary: '#6366f1',
          'primary-hover': '#818cf8',
          accent: '#06b6d4',
          success: '#22c55e',
          warning: '#f59e0b',
          danger: '#ef4444',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
      },
    },
  },
  plugins: [],
};