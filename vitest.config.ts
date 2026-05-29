import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url))
    }
  },
  test: {
    environment: "node",
    globals: false,
    testTimeout: 15000,
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.tmp*/**",
      "**/.next/**",
      "**/.git/**"
    ]
  }
});
