/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        sap: {
          50: '#eef7ff',
          100: '#d8ecff',
          200: '#b9deff',
          300: '#89cbff',
          400: '#52adff',
          500: '#2a88ff',
          600: '#1468fc',
          700: '#0d52e8',
          800: '#1142bc',
          900: '#143c94',
          950: '#11265a',
        },
        neon: {
          green: '#39FF14',
          blue: '#00f0ff',
          purple: '#bf00ff',
          pink: '#ff006e',
          orange: '#ff6a00',
        },
        carbon: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#222233',
          500: '#2a2a3d',
          400: '#3a3a52',
          300: '#5a5a78',
          200: '#8888a4',
          100: '#b8b8d0',
        },
      },
      animation: {
        'pulse-neon': 'pulseNeon 2s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        pulseNeon: {
          '0%, 100%': { boxShadow: '0 0 5px #39FF14, 0 0 10px #39FF14, 0 0 20px #39FF14' },
          '50%': { boxShadow: '0 0 10px #39FF14, 0 0 25px #39FF14, 0 0 50px #39FF14' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(42, 136, 255, 0.3)' },
          '100%': { boxShadow: '0 0 20px rgba(42, 136, 255, 0.6), 0 0 40px rgba(42, 136, 255, 0.3)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
