/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0B3438',
          tealLight: '#134B51',
          tealDark: '#062023',
          orange: '#E85D22',
          orangeHover: '#D14B13',
          orangeLight: '#FCECE5',
          sand: '#EED9C4',
          emerald: '#16A34A',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Cairo', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
