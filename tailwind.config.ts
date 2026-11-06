import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'neon-green': '#00ff41',
        'electric-blue': '#00bfff',
        'purple-accent': '#8b5cf6',
        'bg-primary': '#0a0a0f',
        'bg-secondary': '#0d1117',
        'bg-card': '#111827',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'sans-serif'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s infinite',
        'glitch': 'glitch 3s infinite',
        'matrix-fall': 'matrix-fall 3s linear infinite',
      },
      backgroundImage: {
        'grid-pattern': 'linear-gradient(rgba(0,255,65,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,65,0.03) 1px, transparent 1px)',
      },
      backgroundSize: {
        'grid': '50px 50px',
      },
    },
  },
  plugins: [],
};

export default config;
