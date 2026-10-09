/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // v3 brand (artboard "v3 · Final (Roboto)"): Deep Navy structure, one amber accent, charcoal text.
      // `lime` keeps its name so existing classNames still work, but it now holds the amber accent:
      // a fill only, always with navy text on it (white on amber is 2.2:1).
      colors: {
        navy: { DEFAULT: "#002366", deep: "#001A4D" },
        haze: "#C7D4EE", // secondary text on navy
        charcoal: "#2A2B2C",
        ink: "#2A2B2C",
        lime: { DEFAULT: "#F59E0B", dark: "#B45309", soft: "#DBEAFE", ink: "#002366" },
        soft: "#F5F7FA",
        surface: "#FFFFFF",
        border: { DEFAULT: "#E5E7EB", strong: "#D1D5DB" },
        muted: "#4B5563",
        subtle: "#6B7280",
        emergency: "#DC2626",
        danger: { DEFAULT: "#DC2626", bg: "#FEE2E2", ink: "#B91C1C" },
        today: "#F59E0B",
        amber: { DEFAULT: "#F59E0B", bg: "#FEF3C7", ink: "#B45309" },
        success: "#10B981",
        ok: { DEFAULT: "#047857", bg: "#DCFCE7" },
        info: { bg: "#DBEAFE", ink: "#002366" },
      },
      fontFamily: {
        // Roboto Bold for titles, Roboto Regular for body. Only these two weights.
        headline: ["Roboto_700Bold"],
        body: ["Roboto_400Regular"],
        "body-medium": ["Roboto_400Regular"],
        "body-semibold": ["Roboto_700Bold"],
        "body-bold": ["Roboto_700Bold"],
        "body-xbold": ["Roboto_700Bold"],
      },
    },
  },
  plugins: [],
};
