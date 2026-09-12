import type { Config } from "tailwindcss";

const token = (name: string) => `rgb(var(--color-${name}) / <alpha-value>)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  // Theme is chosen in-app (stored or system), stamped as data-theme on <html>
  darkMode: ["selector", '[data-theme="dark"]'],
  safelist: [
    {
      pattern:
        /^(bg|text|border|ring|from|via|to)-(tomato|tangerine|banana|mango|pumpkin|lemon|lime|sage|basil|emerald|teal|cyan|peacock|sky|cobalt|blueberry|indigo|periwinkle|lavender|lilac|grape|orchid|magenta|pink|rose|flamingo|cherry|graphite|slate|stone|blue|mint|coral|amber|violet)$/
    }
  ],
  theme: {
    extend: {
      colors: {
        // Surfaces and text
        ink: token("ink"),
        paper: token("paper"),
        panel: token("panel"),
        line: token("line"),
        muted: token("muted"),
        subtle: token("subtle"),
        hover: token("hover"),
        calendar: token("calendar"),
        // Semantic
        accent: token("accent"),
        success: token("success"),
        danger: token("danger"),
        warning: token("warning"),
        now: token("now"),
        // Legacy names used across the app resolve to the semantic tokens so
        // every surface follows the theme
        blue: token("accent"),
        mint: token("success"),
        coral: token("danger"),
        amber: token("warning"),
        violet: "#8b5cf6",
        // Label palette (user data — fixed hex values)
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
        glow: "var(--shadow-card)",
        lift: "var(--shadow-pop)",
        pop: "var(--shadow-pop)"
      },
      fontFamily: {
        sans: [
          "-apple-system",
          "BlinkMacSystemFont",
          "\"SF Pro Text\"",
          "\"Segoe UI\"",
          "system-ui",
          "Roboto",
          "\"Helvetica Neue\"",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};

export default config;
