const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Expo SDK 52+ detects npm workspaces automatically (packages/shared resolves via node_modules).
const config = getDefaultConfig(__dirname);

// Web only: expo-sqlite runs as wasm and needs SharedArrayBuffer (cross-origin isolation headers).
config.resolver.assetExts.push("wasm");
config.server.enhanceMiddleware = (middleware) => (req, res, next) => {
  res.setHeader("Cross-Origin-Embedder-Policy", "credentialless");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  middleware(req, res, next);
};

module.exports = withNativeWind(config, { input: "./src/global.css" });
