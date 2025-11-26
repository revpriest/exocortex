import path from "node:path";

import react from "@vitejs/plugin-react-swc";
import { defineConfig } from "vitest/config";

// Plugin to fix asset paths for subdirectory deployment
function fixAssetPaths() {
  return {
    name: 'fix-asset-paths',
    generateBundle(options: any, bundle: any) {
      // Only apply this transformation in production
      if (options.mode === 'production') {
        const htmlFile = bundle['index.html'];
        if (htmlFile && htmlFile.source) {
          // Replace absolute paths with relative paths
          htmlFile.source = htmlFile.source
            .replace(/src="\//g, 'src="./')
            .replace(/href="\//g, 'href="./');
        }
      }
    }
  };
}



// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    fixAssetPaths(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    onConsoleLog(log) {
      return !log.includes("React Router Future Flag Warning");
    },
    env: {
      DEBUG_PRINT_LIMIT: '0', // Suppress DOM output that exceeds AI context windows
    },
  },
}));