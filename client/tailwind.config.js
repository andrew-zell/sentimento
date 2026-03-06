/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forest: {
          950: '#111813',
          900: '#141F19',
          800: '#1A2820',
          700: '#3A4D40',
          600: '#4A6055',
          500: '#5E7A6A',
          400: '#7A9585',
          300: '#9BB5A5',
          200: '#BDD0C5',
          accent: '#C3D790',
          'accent-dim': '#A8BF78',
          'accent-glow': 'rgba(195, 215, 144, 0.15)',
        },
        text: {
          primary: '#E8F0E8',
          secondary: '#8FA08A',
          muted: '#5E7A6A',
        },
      },
      fontFamily: {
        sans: ['Raleway', 'sans-serif'],
        display: ['Gayathri', 'sans-serif'],
        body: ['Raleway', 'sans-serif'],
      },
      fontSize: {
        'xs': '0.8rem',
        'sm': '0.9375rem',
        'base': '1.0625rem',
        'lg': '1.1875rem',
        'xl': '1.3125rem',
        '2xl': '1.625rem',
        '3xl': '2rem',
        '4xl': '2.375rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slideInLeft 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          '0%': { opacity: '0', transform: 'translateX(-8px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(32px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      transitionTimingFunction: {
        'ease-out-custom': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      boxShadow: {
        'card': '0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)',
        'card-hover': '0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)',
        'glow': '0 0 20px rgba(195, 215, 144, 0.2)',
        'glow-lg': '0 0 40px rgba(195, 215, 144, 0.15)',
        'inner-glow': 'inset 0 1px 0 rgba(195, 215, 144, 0.1)',
      },
    },
  },
  safelist: [
    { pattern: /^bg-forest-/ },
    { pattern: /^text-forest-/ },
    { pattern: /^border-forest-/ },
    { pattern: /^ring-forest-/ },
    { pattern: /^shadow-/ },
  ],
  plugins: [],
}
