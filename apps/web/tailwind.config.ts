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
        dune: "#d6c2ac"
      },
      fontFamily: {
        display: ["Georgia", "serif"],
        body: ["'Trebuchet MS'", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
