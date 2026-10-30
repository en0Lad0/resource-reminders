import { defineConfig } from "vite";

// base: './' makes all asset paths relative, so the built site works on
// GitHub Pages under any repo name (https://<user>.github.io/<repo>/)
// and inside the Owlbear Rodeo extension panel.
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    target: "es2020"
  }
});
