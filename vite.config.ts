import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "/CatBall/",
  server: {
    // Playwright writes HTML snapshots while browsers are running. They must not
    // trigger Vite reloads in other live rounds sharing this development server.
    watch: { ignored: ["**/test-results/**", "**/playwright-report/**", "**/.cache/**"] },
  },
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
  },
  test: { include: ["tests/unit/**/*.test.ts"] },
});
