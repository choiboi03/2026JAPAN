import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Pretendard", "Noto Sans KR", "sans-serif"]
      },
      colors: {
        sakura: {
          50: "#fff5f7",
          100: "#ffe4ea",
          200: "#ffc1ce",
          300: "#ff97ad",
          400: "#ff6b8a",
          500: "#f43f6a",
          600: "#d72654",
          700: "#b21945"
        }
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out"
      },
      keyframes: {
        fadeIn: { "0%": { opacity: "0" }, "100%": { opacity: "1" } },
        slideUp: { "0%": { transform: "translateY(8px)", opacity: "0" }, "100%": { transform: "translateY(0)", opacity: "1" } }
      }
    }
  },
  plugins: []
};
export default config;
