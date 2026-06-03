import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/verseform/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.worktrees/**",
      "**/coverage/**",
    ],
    setupFiles: ["./src/test/setup.ts"],
  },
});
