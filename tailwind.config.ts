import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5d9e2",
          300: "#b0b8c9",
          400: "#8591aa",
          500: "#65728e",
          600: "#505b75",
          700: "#424a5f",
          800: "#394050",
          900: "#0f1219",
          950: "#080a0f",
        },
        accent: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdeff",
          300: "#8ec9ff",
          400: "#59aaff",
          500: "#3388fb",
          600: "#1d69f0",
          700: "#1653dc",
          800: "#1846b2",
          900: "#1a3f8c",
        },
        signal: {
          critical: "#e5484d",
          high: "#f76b15",
          medium: "#e2a600",
          low: "#8591aa",
          positive: "#12a672",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        arabic: ["var(--font-arabic)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,18,25,0.04), 0 8px 24px -12px rgba(15,18,25,0.12)",
        lift: "0 2px 4px rgba(15,18,25,0.04), 0 24px 48px -24px rgba(15,18,25,0.22)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "20px",
        "3xl": "28px",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.16,1,0.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
