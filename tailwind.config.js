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
          DEFAULT: '#05070B',
          subtle: '#0B1018',
          surface: '#101722',
          card: '#101722',
          cardHover: '#162232',
          elevated: '#1a273b',
        },
        border: {
          DEFAULT: '#253244',
          light: '#32435b',
          highlight: '#00E5FF',
        },
        sentra: {
          cyan: '#00E5FF',
          sky: '#38bdf8',
          blue: '#0284c7',
          danger: '#FF1744',
          critical: '#FF003C',
          amber: '#FFB300',
          green: '#00E676',
          text: '#EAF2FF',
          muted: '#8193AA',
        },
        soc: {
          critical: '#FF003C',
          high: '#FF1744',
          medium: '#FFB300',
          low: '#00E5FF',
          info: '#8193AA',
          resolved: '#00E676',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 18px -2px rgba(0, 229, 255, 0.35)',
        'glow-cyan-sm': '0 0 8px 0px rgba(0, 229, 255, 0.25)',
        'glow-critical': '0 0 20px -2px rgba(255, 0, 60, 0.45)',
        'glow-danger': '0 0 16px -2px rgba(255, 23, 68, 0.35)',
        'glow-amber': '0 0 16px -2px rgba(255, 179, 0, 0.3)',
        'glow-green': '0 0 16px -2px rgba(0, 230, 118, 0.3)',
        'hud-panel': '0 4px 24px -2px rgba(0, 0, 0, 0.7), 0 0 0 1px #253244',
        'card-dark': '0 4px 20px -2px rgba(0, 0, 0, 0.65)',
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
