import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pitch: {
          dark: "#0a2e1a",
          mid: "#1a4d2e",
          light: "#2d6a4f",
        },
      },
      backgroundImage: {
        "pitch-gradient":
          "linear-gradient(180deg, #0a2e1a 0%, #1a4d2e 50%, #0a2e1a 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
