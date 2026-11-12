/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        monsoon: '#1E3A4C', // rain-sky slate, headings and header
        soil: '#2A2019',    // wet black-cotton soil, body text
        pod: '#5E9B3A',     // healthy soybean leaf
        sprout: '#B7D96B',  // young shoot, highlights
        straw: '#E8D49B',   // dry stalk, warnings
        rust: '#B8512E',    // red/laterite, loss
        mist: '#F1F5EE',    // page background
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}