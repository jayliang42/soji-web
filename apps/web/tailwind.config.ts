import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        sand: "#f6efe6",
        cocoa: "#20150d",
        clay: "#d86b3d",
        shell: "#fffaf4",
        dune: "#d6c2ac",
        sage: "#9cb896",
        cream: "#faf7f0",
        charcoal: "#2d2d2d",
        gold: "#d4af37",
        blush: "#f4e4d6",
        richgreen: "#a6ea63",
        darkgreen: "#7bc142",
        brightwhite: "#ffffff",
        darktext: "#1a1a1a",
        checkgreen: "#22c55e"
      },
      fontFamily: {
        display: ["Georgia", "'Times New Roman'", "serif"],
        body: ["'Inter'", "'Helvetica Neue'", "sans-serif"],
        mono: ["'JetBrains Mono'", "'Fira Code'", "monospace"]
      },
      fontSize: {
        'xs': '0.75rem',
        'sm': '0.875rem',
        'base': '1rem',
        'lg': '1.125rem',
        'xl': '1.25rem',
        '2xl': '1.5rem',
        '3xl': '1.875rem',
        '4xl': '2.25rem',
        '5xl': '3rem',
        '6xl': '3.75rem',
        '7xl': '4.5rem',
        '8xl': '6rem',
        '9xl': '8rem',
        'hero': '5.5rem',
        'display': '4rem'
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem'
      }
    }
  },
  plugins: []
};

export default config;
