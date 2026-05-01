import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ["var(--font-sans)", "sans-serif"],
        mono:    ["var(--font-mono)", "monospace"],
        display: ["var(--font-display)", "sans-serif"],
      },
      keyframes: {
        "fade-in-up": {
          "0%":   { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%":       { opacity: "0.25" },
        },
        "hud-scan": {
          "0%":   { top: "-2px" },
          "100%": { top: "100%" },
        },
        "pulse-ring": {
          "0%":   { boxShadow: "0 0 0 0 rgba(0,212,255,0.5)" },
          "100%": { boxShadow: "0 0 0 8px rgba(0,212,255,0)" },
        },
        "data-flicker": {
          "0%, 92%, 100%": { opacity: "1" },
          "93%, 96%":      { opacity: "0.65" },
          "94%, 97%":      { opacity: "1" },
        },
        "boot-in": {
          "0%":   { clipPath: "inset(0 100% 0 0)", opacity: "0.5" },
          "100%": { clipPath: "inset(0 0% 0 0)", opacity: "1" },
        },
      },
      animation: {
        "fade-in-up":   "fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-dot":    "pulse-dot 2s ease-in-out infinite",
        "hud-scan":     "hud-scan 5s linear infinite",
        "pulse-ring":   "pulse-ring 2s ease-out infinite",
        "data-flicker": "data-flicker 8s ease-in-out infinite",
        "boot-in":      "boot-in 0.8s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};
export default config;
