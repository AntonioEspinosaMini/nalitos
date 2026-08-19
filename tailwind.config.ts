import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Serif elegante para títulos; sans neutra para el resto.
        display: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        // Rosa empolvado apagado: el acento de la boda, sin caer en lo cursi.
        blush: {
          50: '#fdf8f6',
          100: '#f8ece7',
          200: '#f0d8cf',
          300: '#e2bcae',
          400: '#cf9a86',
          500: '#b97a63',
          600: '#a0614c',
          700: '#834d3d',
        },
        // Verde salvia para estados positivos (confirmado, pagado, completado).
        sage: {
          50: '#f4f7f4',
          100: '#e6ede6',
          200: '#cbdccb',
          300: '#a7c2a7',
          400: '#7fa37f',
          500: '#5f855f',
          600: '#4b6a4b',
          700: '#3d553d',
        },
        // Neutros cálidos: la base de toda la interfaz.
        ink: {
          50: '#faf9f7',
          100: '#f3f1ed',
          200: '#e7e3dc',
          300: '#d4cec4',
          400: '#a9a196',
          500: '#7d746a',
          600: '#5c554d',
          700: '#413b35',
          800: '#2b2723',
          900: '#1a1714',
        },
      },
      keyframes: {
        'in-fade': { from: { opacity: '0' }, to: { opacity: '1' } },
        'in-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.97)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'in-fade': 'in-fade 150ms ease-out',
        'in-up': 'in-up 220ms ease-out',
        'sheet-up': 'sheet-up 240ms cubic-bezier(0.32, 0.72, 0, 1)',
        'modal-in': 'modal-in 160ms ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
