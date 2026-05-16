import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command }) => ({
  // --- FIX: Explicitly match your case-sensitive GitHub Repo name ---
  base: command === "build" ? "/Ludo_Pixi/" : "/",

  build: {
    outDir: "dist",
    emptyOutDir: true,

    // "hidden" keeps sourcemaps fully detached from runtime execution strings
    sourcemap: command === "build" ? "hidden" : true,

    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
    target: "es2020",
  },

  publicDir: "public",
}));
