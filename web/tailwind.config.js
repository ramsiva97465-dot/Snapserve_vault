/** @type {import("tailwindcss").Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      colors: {
        brand: {
          50: "#f0f4ff",
          100: "#e0eaff",
          200: "#c7d7fe",
          300: "#a5bcfb",
          400: "#8198f8",
          500: "#6270f3",
          600: "#4f52e8",
          700: "#4340cf",
          800: "#3736a7",
          900: "#323384",
          950: "#1e1e52",
        },
        surface: {
          DEFAULT: "#fafaf9",
          50: "#ffffff",
          100: "#fafaf9",
          200: "#f5f4f2",
          300: "#eeece9",
          400: "#e5e3df",
          500: "#d6d3ce",
          600: "#b8b4ae",
          700: "#9b978f",
          800: "#6b6560",
          900: "#3c3835",
          950: "#1c1917",
        },
      },
      boxShadow: {
        "sm": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
        "DEFAULT": "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
        "md": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
        "lg": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
        "card": "0 0 0 1px rgb(0 0 0 / 0.05), 0 2px 8px rgb(0 0 0 / 0.06)",
        "card-hover": "0 0 0 1px rgb(0 0 0 / 0.08), 0 4px 16px rgb(0 0 0 / 0.1)",
        "modal": "0 20px 60px rgb(0 0 0 / 0.15), 0 0 0 1px rgb(0 0 0 / 0.05)",
      },
      borderRadius: {
        "sm": "0.375rem",
        "DEFAULT": "0.5rem",
        "md": "0.625rem",
        "lg": "0.75rem",
        "xl": "1rem",
        "2xl": "1.25rem",
      },
      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-up": "slideUp 0.25s ease-out",
        "slide-in-right": "slideInRight 0.25s ease-out",
        "scale-in": "scaleIn 0.15s ease-out",
        "spin-slow": "spin 2s linear infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(16px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "dot-pattern": "radial-gradient(circle, #e5e3df 1px, transparent 1px)",
      },
    },
  },
  plugins: [],
};
