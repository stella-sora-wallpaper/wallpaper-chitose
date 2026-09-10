import { defineConfig } from "vite";

// Wallpaper Engine opens the built entry point as file://. Relative asset URLs
// are required there; the same setting also works for the local dev server.
export default defineConfig({ base: "./" });
