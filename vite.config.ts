import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

// Wallpaper Engine opens the built entry point as file://. Relative asset URLs
// are required there; the same setting also works for the local dev server.
export default defineConfig({
  base: "./",
  resolve: {
    alias: {
      path: fileURLToPath(new URL("./src/shims/path.ts", import.meta.url)),
    },
  },
});
