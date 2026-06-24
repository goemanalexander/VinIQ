/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070D17',
          900: '#0B1422',
          800: '#101D31',
          700: '#172a45',
          600: '#223655',
        },
        burgundy: {
          900: '#3D0B14',
          800: '#5C111E',
          700: '#7A1827',
          600: '#9A2233',
          500: '#B82E40',
        },
        gold: {
          400: '#E8CA82',
          300: '#F0DDA8',
          500: '#D4AF37',
          600: '#B8932A',
          700: '#8C6E1F',
        },
        cream: {
          100: '#F7F1E6',
          200: '#EFE6D4',
          300: '#DCD0B8',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(160deg, #0B1422 0%, #070D17 60%, #0B0F1A 100%)',
        'burgundy-glow': 'radial-gradient(circle at 50% 0%, rgba(154,34,51,0.35), transparent 60%)',
        'gold-line': 'linear-gradient(90deg, transparent, #D4AF37, transparent)',
      },
      boxShadow: {
        gold: '0 0 0 1px rgba(212,175,55,0.25), 0 8px 30px -10px rgba(0,0,0,0.6)',
        card: '0 4px 24px -8px rgba(0,0,0,0.5)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        shimmer: 'shimmer 2.2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
