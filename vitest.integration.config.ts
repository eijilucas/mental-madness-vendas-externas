/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import path from "node:path";

// Config separada para os testes que batem em serviços externos reais
// (ViaCEP/BrasilAPI) — nunca roda como parte de `npm test`.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "**/_reference/**"],
  },
});
