import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Cache bust version - increment to force rebuild
const CACHE_VERSION = Date.now();

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Force cache invalidation
  define: {
    __CACHE_VERSION__: CACHE_VERSION,
  },
  optimizeDeps: {
    force: true,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-${CACHE_VERSION}-[hash].js`,
        chunkFileNames: `assets/[name]-${CACHE_VERSION}-[hash].js`,
      },
    },
  },
}));
