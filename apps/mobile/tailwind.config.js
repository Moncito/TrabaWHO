/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        charcoal: "#1F2937",
        lime: { DEFAULT: "#A3E635", dark: "#65A30D" },
        soft: "#F3F4F6",
        muted: "#6B7280",
        border: "#E5E7EB",
        emergency: "#DC2626",
        today: "#F59E0B",
        success: "#16A34A",
      },
      fontFamily: {
        // Impact is a Microsoft font (can't be bundled); Anton is the free look-alike.
        headline: ["Anton_400Regular"],
        body: ["Archivo_400Regular"],
        "body-medium": ["Archivo_500Medium"],
        "body-bold": ["Archivo_700Bold"],
      },
    },
  },
  plugins: [],
};
