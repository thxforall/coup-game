/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
      },
      colors: {
        duke: '#7c3aed',
        contessa: '#dc2626',
        captain: '#2563eb',
        assassin: '#1f2937',
        ambassador: '#065f46',
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
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(234, 179, 8, 0.4)' },
          '50%': { boxShadow: '0 0 0 8px rgba(234, 179, 8, 0)' },
        },
      },
    },
  },
  plugins: [],
};
