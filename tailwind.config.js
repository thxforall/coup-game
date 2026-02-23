/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ['var(--font-sora)', 'sans-serif'],
        mono: ['var(--font-space-mono)', 'monospace'],
      },
      colors: {
        'bg-dark': 'var(--bg-dark)',
        'bg-card': 'var(--bg-card)',
        'bg-surface': 'var(--bg-surface)',
        'border-subtle': 'var(--border-subtle)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        gold: {
          DEFAULT: 'var(--gold)',
          dark: 'var(--gold-dark)',
          light: 'var(--gold-light)',
        },
        'coin-color': 'var(--coin-color)',
        duke: 'var(--duke-color)',
        assassin: 'var(--assassin-color)',
        captain: 'var(--captain-color)',
        ambassador: 'var(--ambassador-color)',
        contessa: 'var(--contessa-color)',
      },
      animation: {
        'card-flip': 'card-flip 0.6s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'pulse-coin': 'pulse-coin 1.5s ease-in-out infinite',
      },
      keyframes: {
        'card-flip': {
          '0%': { transform: 'rotateY(0deg)' },
          '50%': { transform: 'rotateY(90deg)' },
          '100%': { transform: 'rotateY(0deg)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'pulse-coin': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(241, 196, 15, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(241, 196, 15, 0)' },
        },
      },
    },
  },
  plugins: [],
};
