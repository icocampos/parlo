/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#14213D',
        cream: '#FFF8EA',
        coral: '#F26B4F',
        sage: '#5B8E7D',
      },
    },
  },
  plugins: [],
}
