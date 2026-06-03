import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/QiDesignKit/",
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
