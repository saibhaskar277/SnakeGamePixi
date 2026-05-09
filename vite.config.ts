import { defineConfig } from "vite";

export default defineConfig({
  // 1. Relative base path: CRITICAL for Capacitor/Android.
  // Without this, the app looks for scripts at the root of the phone instead of inside the app folder.
  base: "./",

  build: {
    // 2. Where the compiled files go. Capacitor looks for this folder.
    outDir: "dist",

    // 3. Optional: Ensuring the build is compatible with older mobile WebViews
    target: "esnext",

    // 4. Clean the folder before every build
    emptyOutDir: true,

    // 5. Sourcemaps help you debug code on the phone via Chrome DevTools
    sourcemap: true,
  },

  // 6. Assets configuration
  publicDir: "public", // Make sure your snake sprites are in a folder named 'public'
});
