/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    container: {
      center: true,
      padding: '1rem',
    },
    extend: {
      colors: {
        background: { DEFAULT: 'var(--background)' },
        foreground: { DEFAULT: 'var(--foreground)' },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        border: { DEFAULT: 'var(--border)' },
        input: { DEFAULT: 'var(--input)' },
        ring: { DEFAULT: 'var(--ring)' },
        'felt-green': { DEFAULT: 'var(--felt-green)' },
        'felt-green-light': { DEFAULT: 'var(--felt-green-light)' },
        gold: { DEFAULT: 'var(--gold)', light: 'var(--gold-light)' },
        'card-red': { DEFAULT: 'var(--card-red)' },
        'card-black': { DEFAULT: 'var(--card-black)' },
        'card-white': { DEFAULT: 'var(--card-white)' },
        success: { DEFAULT: 'var(--success)' },
        danger: { DEFAULT: 'var(--danger)' },
        warning: { DEFAULT: 'var(--warning)' },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm: 'calc(var(--radius) - 4px)',
        lg: 'calc(var(--radius) + 4px)',
        xl: 'calc(var(--radius) + 8px)',
        '2xl': 'calc(var(--radius) + 16px)',
        card: '16px',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['JetBrains Mono', 'IBM Plex Mono', 'monospace'],
      },
      fontSize: {
        'card-rank': ['2.5rem', { lineHeight: '1', fontWeight: '700' }],
        'card-suit': ['1.5rem', { lineHeight: '1' }],
        'card-center': ['4rem', { lineHeight: '1' }],
      },
      animation: {
        'deal': 'dealCard 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'fade-in': 'fadeIn 0.3s ease-in-out forwards',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'glow-gold': 'glow-gold 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'win-pulse': 'winPulse 0.8s ease-in-out 2',
        'lose-pulse': 'losePulse 0.8s ease-in-out 2',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0,0,0,0.5), 0 10px 15px -3px rgba(0,0,0,0.4)',
        'card-hover': '0 8px 12px -2px rgba(0,0,0,0.6), 0 20px 25px -5px rgba(0,0,0,0.5)',
        'gold-glow': '0 0 20px rgba(245, 158, 11, 0.5)',
        'green-glow': '0 0 20px rgba(22, 163, 74, 0.5)',
        'red-glow': '0 0 20px rgba(239, 68, 68, 0.5)',
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};