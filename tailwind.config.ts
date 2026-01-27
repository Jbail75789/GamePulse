import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: ".5625rem", /* 9px */
        md: ".375rem", /* 6px */
        sm: ".1875rem", /* 3px */
      },
      colors: {
        background: "hsl(0 0% 4%)", // #0a0a0a
        foreground: "hsl(180 100% 90%)", // Light neon tint

        card: {
          DEFAULT: "hsl(0 0% 9%)", // #161616
          foreground: "hsl(180 100% 90%)",
          border: "hsl(0 0% 15%)",
        },
        popover: {
          DEFAULT: "hsl(0 0% 4%)",
          foreground: "hsl(180 100% 90%)",
          border: "hsl(0 0% 15%)",
        },
        primary: {
          DEFAULT: "hsl(157 100% 50%)", // #00ff9f - neon-green
          foreground: "hsl(0 0% 4%)",
          border: "hsl(157 100% 50%)",
        },
        secondary: {
          DEFAULT: "hsl(197 100% 50%)", // #00b8ff - neon-blue
          foreground: "hsl(0 0% 4%)",
          border: "hsl(197 100% 50%)",
        },
        muted: {
          DEFAULT: "hsl(0 0% 12%)",
          foreground: "hsl(0 0% 60%)",
          border: "hsl(0 0% 15%)",
        },
        accent: {
          DEFAULT: "hsl(280 100% 50%)", // #d600ff - neon-purple
          foreground: "hsl(0 0% 4%)",
          border: "hsl(280 100% 50%)",
        },
        destructive: {
          DEFAULT: "hsl(0 100% 50%)",
          foreground: "hsl(0 0% 4%)",
          border: "hsl(0 100% 50%)",
        },
        input: "hsl(0 0% 15%)",
        ring: "hsl(157 100% 50%)", // Primary ring
        chart: {
          "1": "hsl(157 100% 50%)",
          "2": "hsl(197 100% 50%)",
          "3": "hsl(280 100% 50%)",
          "4": "hsl(43 100% 50%)",
          "5": "hsl(27 100% 50%)",
        },
        sidebar: {
          DEFAULT: "hsl(0 0% 3%)",
          foreground: "hsl(180 100% 90%)",
          border: "hsl(0 0% 12%)",
          primary: "hsl(157 100% 50%)",
          "primary-foreground": "hsl(0 0% 4%)",
          accent: "hsl(0 0% 9%)",
          "accent-foreground": "hsl(157 100% 50%)",
          ring: "hsl(157 100% 50%)",
        },
      },
      fontFamily: {
        sans: ["'Inter'", "system-ui", "-apple-system", "sans-serif"],
        display: ["'Orbitron'", "sans-serif"],
        mono: ["'Share Tech Mono'", "monospace"],
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
} satisfies Config;
