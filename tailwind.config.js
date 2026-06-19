/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        arabic: ['Tajawal', 'Cairo', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9eaff',
          200: '#bcd9ff',
          300: '#8ec1ff',
          400: '#599dff',
          500: '#3479ff',
          600: '#1f59f5',
          700: '#1944e1',
          800: '#1b39b6',
          900: '#1c358f',
        },
      },
      keyframes: {
        pulseRing: {
          '0%': { boxShadow: '0 0 0 0 rgba(239,68,68,0.55)' },
          '70%': { boxShadow: '0 0 0 10px rgba(239,68,68,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        },
      },
      animation: {
        pulseRing: 'pulseRing 1.8s infinite',
      },
    },
  },
  plugins: [],
};
