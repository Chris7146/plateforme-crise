/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Palette « terminal de crise » — code couleur fixe (voir CLAUDE.md).
        fond: '#07100c',
        carte: '#0b1712',
        bordure: '#1d3328',
        texte: '#d7e5dc',
        secondaire: '#7f9a8a',
        vert: '#3ecf8e', // nominal
        ambre: '#f2b43c', // attention
        rouge: '#ef6b6b', // urgence
        bleu: '#6fb6f2',
      },
      fontFamily: {
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace',
        ],
      },
    },
  },
  plugins: [],
}
