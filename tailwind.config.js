/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    screens: {
      'xs': '480px',
      'sm': '640px',
      'md': '768px',
      'lg': '1024px',
      'xl': '1280px',
      '2xl': '1536px',
    },
    extend: {
      colors: {
        background: {
          DEFAULT: '#0B0F17',
          subtle: '#0F1623',
          surface: '#141C2B',
          card: '#182234',
          cardHover: '#1E2B42',
          elevated: '#222E46',
        },
        border: {
          DEFAULT: '#222E42',
          light: '#2D3D58',
          highlight: '#0284C7',
          bright: '#334155',
        },
        // Text aliases for backward compat
        text: {
          DEFAULT: '#F1F5F9',
          muted: '#94A3B8',
          subtle: '#64748B',
        },
        sentra: {
          cyan: '#0EA5E9',
          teal: '#0D9488',
          sky: '#38BDF8',
          blue: '#0284C7',
          danger: '#EF4444',
          critical: '#DC2626',
          amber: '#F59E0B',
          green: '#10B981',
          purple: '#8B5CF6',
          text: '#F1F5F9',
          muted: '#94A3B8',
        },
        soc: {
          critical: '#DC2626',
          high: '#EF4444',
          medium: '#F59E0B',
          low: '#0EA5E9',
          info: '#64748B',
          resolved: '#10B981',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
        display: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.3), 0 1px 2px -1px rgba(0, 0, 0, 0.3)',
        'elevated': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -2px rgba(0, 0, 0, 0.3)',
        'modal': '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
        // Glow shadows for backward compat
        'glow-cyan': '0 0 12px rgba(14, 165, 233, 0.4)',
        'glow-critical': '0 0 12px rgba(220, 38, 38, 0.4)',
        'glow-green': '0 0 12px rgba(16, 185, 129, 0.35)',
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
      },
      spacing: {
        '4.5': '1.125rem',
        '18': '4.5rem',
      }
    },
  },
  plugins: [],
}
