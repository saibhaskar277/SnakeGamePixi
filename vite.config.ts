import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({ command }) => ({
  base: command === "build" ? "/SnakeGamePixi/" : "/",

  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: command === "build" ? "hidden" : true,
    rollupOptions: {
      input: path.resolve(__dirname, "index.html"),
    },
    target: "es2020",
  },

  publicDir: "public",
}));
