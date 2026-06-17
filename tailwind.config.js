/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core semantic colors (matching original app)
        canvas: {
          DEFAULT: "#ffffff",
          dark: "#0b1120",
        },
        surface: {
          DEFAULT: "#f0f0f0",
          dark: "#202425",
          muted: {
            DEFAULT: "#e0e0e0",
            dark: "#24213f",
          },
        },
        ink: {
          DEFAULT: "#333333",
          dark: "#e5e5ea",
        },
        accent: {
          DEFAULT: "#576CDB",
          dark: "#696FC7",
          soft: {
            DEFAULT: "rgba(87, 108, 219, 0.15)",
            dark: "rgba(105, 111, 199, 0.15)",
          },
        },
        border: {
          DEFAULT: "rgba(215, 224, 234, 0.5)",
          dark: "rgba(63, 63, 66, 0.5)",
        },
        danger: {
          DEFAULT: "#cc2e24",
          dark: "#f55459",
        },
        success: {
          DEFAULT: "#1f9d55",
          dark: "#34A853",
        },
        warning: {
          DEFAULT: "#FBBC05",
        },
      },
      fontFamily: {
        figtree: ["Figtree", "sans-serif"],
        instrument: ["Instrument Sans", "sans-serif"],
      },
      borderRadius: {
        "card": "14px",
        "dialog": "20px",
        "input": "6px",
        "button": "6px",
      },
      boxShadow: {
        "card": "0 2px 8px rgba(0, 0, 0, 0.08)",
        "dialog": "0 4px 24px rgba(0, 0, 0, 0.12)",
      },
    },
  },
  plugins: [],
}
