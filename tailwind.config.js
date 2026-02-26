/** @type {import('tailwindcss').Config} */
// O'Ypunu Design System — Terre & Or Pan-Africaine
// Les scales gray/purple/blue/yellow/red référencent des CSS vars définies dans
// src/styles/_tokens.scss. Le thème s'inverse automatiquement via [data-theme="light"].
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        // ── Échelle gray → neutrals chauds O'Ypunu (inversée light/dark) ──
        gray: {
          50:  "var(--oy-gray-50)",
          100: "var(--oy-gray-100)",
          200: "var(--oy-gray-200)",
          300: "var(--oy-gray-300)",
          400: "var(--oy-gray-400)",
          500: "var(--oy-gray-500)",
          600: "var(--oy-gray-600)",
          700: "var(--oy-gray-700)",
          800: "var(--oy-gray-800)",
          900: "var(--oy-gray-900)",
          950: "var(--oy-gray-950)",
        },
        // ── Purple → Terracotta (primaire O'Ypunu) ──
        purple: {
          400: "var(--oy-purple-400)",
          500: "var(--oy-purple-500)",
          600: "var(--oy-purple-600)",
          700: "var(--oy-purple-700)",
        },
        // ── Blue → Bleu Nil ──
        blue: {
          400: "var(--oy-blue-400)",
          500: "var(--oy-blue-500)",
          600: "var(--oy-blue-600)",
        },
        // ── Yellow → Or Kente ──
        yellow: {
          500: "var(--oy-yellow-500)",
        },
        // ── Red → Rouge profond ──
        red: {
          500: "var(--oy-red-500)",
        },
        // ── Nouvelles classes sémantiques (pour nouveau code) ──
        primary: {
          50:  "#FDF2EB",
          100: "#FAE0CE",
          200: "#F4BFA0",
          300: "#EC9872",
          400: "#E07048",
          500: "#C85528", // Terracotta
          600: "#A84320",
          700: "#853519",
        },
        secondary: {
          400: "#FBBF24",
          500: "#E8A000", // Or Kente
          600: "#D4800A",
        },
        semantic: {
          success: "#2E8B57", // Vert forêt tropicale
          warning: "#E8A000", // Or Kente
          error:   "#C0392B", // Rouge profond
          info:    "#1E6B8C", // Bleu Nil
        },
        surface: {
          bg:       "var(--surface-bg)",
          card:     "var(--surface-card)",
          elevated: "var(--surface-elevated)",
          border:   "var(--surface-border)",
        },
      },
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
      // Ombres chaudes (shadowColor brun ébène au lieu de #000)
      boxShadow: {
        sm:    "0 1px 2px rgba(31, 20, 16, 0.06)",
        DEFAULT: "0 2px 4px rgba(31, 20, 16, 0.10)",
        md:    "0 2px 4px rgba(31, 20, 16, 0.10)",
        lg:    "0 4px 8px rgba(31, 20, 16, 0.15)",
        xl:    "0 8px 16px rgba(31, 20, 16, 0.20)",
        "2xl": "0 16px 32px rgba(31, 20, 16, 0.25)",
        card:  "0 2px 8px rgba(31, 20, 16, 0.06)",
        modal: "0 8px 24px rgba(31, 20, 16, 0.25)",
      },
      // Border radius tokens (cohérence avec mobile)
      borderRadius: {
        xs:    "4px",
        sm:    "6px",
        md:    "8px",
        lg:    "12px",
        xl:    "16px",
        "2xl": "20px",
        "3xl": "24px",
      },
    },
  },
  plugins: [],
};
