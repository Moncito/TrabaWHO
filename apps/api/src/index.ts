import { createApp } from "./app";
import { jwtSecret } from "./auth";

// Load apps/api/.env (JWT_SECRET, PORT, DATABASE_URL) if present; real env vars win.
try {
  process.loadEnvFile(".env");
} catch {
  // No .env file: rely on the environment.
}
jwtSecret(); // fail fast in production without JWT_SECRET; warn in dev

const port = Number(process.env.PORT ?? 3000);
// 0.0.0.0 so phones on the same Wi-Fi / hotspot can reach the laptop.
createApp().listen(port, "0.0.0.0", () => console.log(`API on http://0.0.0.0:${port}`));
