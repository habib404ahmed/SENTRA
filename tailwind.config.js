/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: '#080b11',
          subtle: '#0c1017',
          surface: '#111723',
          card: '#151d2d',
          cardHover: '#1a2336',
          elevated: '#1e293d',
        },
        border: {
          DEFAULT: '#1e283a',
          light: '#28354b',
          highlight: '#38bdf8',
        },
        sentra: {
          blue: '#0284c7',
          cyan: '#06b6d4',
          sky: '#38bdf8',
          teal: '#14b8a6',
          emerald: '#10b981',
          amber: '#f59e0b',
          rose: '#f43f5e',
          purple: '#8b5cf6',
          slate: '#64748b',
        },
        soc: {
          critical: '#f43f5e',
          high: '#f97316',
          medium: '#f59e0b',
          low: '#06b6d4',
          info: '#64748b',
          resolved: '#10b981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 15px -3px rgba(6, 182, 212, 0.25)',
        'glow-rose': '0 0 15px -3px rgba(244, 63, 94, 0.25)',
        'glow-emerald': '0 0 15px -3px rgba(16, 185, 129, 0.25)',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
      },
      animation: {
        'pulse-subtle': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'radar-sweep': 'radar 4s linear infinite',
      },
      keyframes: {
        radar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        }
      }
    },
  },
  plugins: [],
}
