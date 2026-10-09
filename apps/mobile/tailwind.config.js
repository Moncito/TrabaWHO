/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Tokens from docs/DESIGN.md §1.1. Lime is a fill only: never lime text on white.
      colors: {
        charcoal: "#1F2937",
        ink: "#1F2937",
        lime: { DEFAULT: "#A3E635", dark: "#65A30D", soft: "#ECFCCB", ink: "#3F6212" },
        soft: "#F3F4F6",
        surface: "#FFFFFF",
        border: { DEFAULT: "#E5E7EB", strong: "#D1D5DB" },
        muted: "#4B5563",
        subtle: "#6B7280",
        emergency: "#DC2626",
        danger: { DEFAULT: "#DC2626", bg: "#FEE2E2", ink: "#991B1B" },
        today: "#F59E0B",
        amber: { DEFAULT: "#F59E0B", bg: "#FEF3C7", ink: "#92400E" },
        success: "#16A34A",
        ok: { DEFAULT: "#15803D", bg: "#DCFCE7" },
        info: { bg: "#E0E7FF", ink: "#3730A3" },
      },
      fontFamily: {
        // Impact is a Microsoft font (can't be bundled); Anton is the free look-alike.
        headline: ["Anton_400Regular"],
        body: ["Archivo_400Regular"],
        "body-medium": ["Archivo_500Medium"],
        "body-semibold": ["Archivo_600SemiBold"],
        "body-bold": ["Archivo_700Bold"],
        "body-xbold": ["Archivo_800ExtraBold"],
      },
    },
  },
  plugins: [],
};
