import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      "#": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    exclude: ["mermaid"],
  },
  build: {
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      external: ["mermaid"],
      output: {
        codeSplitting: {
          minSize: 30 * 1024,
          maxSize: 800 * 1024,
          groups: [
            { name: "vendor-react", test: /node_modules\/(react|react-dom|react-router)/ },
            { name: "vendor-motion", test: /node_modules\/(framer-motion|motion)/ },
            { name: "vendor-highlight", test: /node_modules\/highlight\.js/ },
            { name: "vendor-radix", test: /node_modules\/@radix-ui/ },
            { name: "vendor", test: /node_modules/ },
          ],
        },
      },
    },
  },
});
