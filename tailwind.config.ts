import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  safelist: [
    {
      pattern:
        /^(bg|text|border|ring|from|via|to)-(tomato|tangerine|banana|mango|pumpkin|lemon|lime|sage|basil|emerald|teal|cyan|peacock|sky|cobalt|blueberry|indigo|periwinkle|lavender|lilac|grape|orchid|magenta|pink|rose|flamingo|cherry|graphite|slate|stone|blue|mint|coral|amber|violet)$/
    }
  ],
  theme: {
    extend: {
      colors: {
        ink: "#e8eaed",
        paper: "#202124",
        panel: "#2a2b2f",
        line: "#3c4043",
        muted: "#bdc1c6",
        blue: "#4285f4",
        mint: "#34a853",
        coral: "#ea4335",
        amber: "#fbbc04",
        violet: "#a142f4",
        tomato: "#d93025",
        tangerine: "#f4511e",
        banana: "#f6bf26",
        mango: "#ff9800",
        pumpkin: "#ef6c00",
        lemon: "#fdd663",
        lime: "#c0ca33",
        sage: "#33b679",
        basil: "#0b8043",
        emerald: "#00a86b",
        teal: "#009688",
        cyan: "#00acc1",
        peacock: "#039be5",
        sky: "#4fc3f7",
        cobalt: "#1a73e8",
        blueberry: "#3f51b5",
        indigo: "#5e35b1",
        periwinkle: "#9fa8da",
        lavender: "#7986cb",
        lilac: "#b39ddb",
        grape: "#8e24aa",
        orchid: "#ba68c8",
        magenta: "#d81b60",
        pink: "#f06292",
        rose: "#e91e63",
        flamingo: "#f48fb1",
        cherry: "#c2185b",
        graphite: "#616161",
        slate: "#78909c",
        stone: "#9e9e9e"
      },
      boxShadow: {
        glow: "0 1px 2px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        lift: "0 8px 18px rgba(0,0,0,0.34)"
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
