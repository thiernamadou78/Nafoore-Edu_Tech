/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#1E3A8A',
        gold: {
          400: '#FACC15',
          500: '#EAB308',
        },
        cream: '#FEFDFB',
        sage: {
          100: '#E3EDE7',
          700: '#3F6753',
        },
        clay: {
          100: '#F2E0DC',
          700: '#8B3B30',
        },
        leaf: {
          100: '#EAF3DE',
          500: '#639922',
          700: '#27500A',
        },
        amberStrong: {
          100: '#FAEEDA',
          500: '#BA7517',
          700: '#633806',
        },
        sky: {
          100: '#E6F1FB',
          700: '#0C447C',
        },
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
