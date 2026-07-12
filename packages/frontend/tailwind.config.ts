import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#1e40af',
        secondary: '#64748b',
        success: '#16a34a',
        warning: '#ea580c',
        danger: '#dc2626',
      },
    },
  },
  plugins: [],
};

export default config;
