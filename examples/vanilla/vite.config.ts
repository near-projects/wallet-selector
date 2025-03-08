/// <reference types="vitest" />
import { defineConfig } from "vite";

import viteTsConfigPaths from "vite-tsconfig-paths";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  cacheDir: "../../node_modules/.vite/vanilla",

  server: {
    port: 4200,
    host: "localhost",
  },

  preview: {
    port: 4300,
    host: "localhost",
  },
  plugins: [
    viteTsConfigPaths({
      root: "../../",
    }),
    nodePolyfills({
      // To exclude specific polyfills, add them to this list
      exclude: [
        // Example: 'fs', // Excludes the polyfill for 'fs' and 'node:fs'
      ],
      // Whether to polyfill specific globals
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      // Whether to polyfill Node.js builtins
      protocolImports: true,
    }),
  ],
  resolve: {
    alias: {
      // ...existing code...
      http: "vite-plugin-node-polyfills/polyfills/http",
      https: "vite-plugin-node-polyfills/polyfills/http",
      stream: "vite-plugin-node-polyfills/polyfills/stream",
    },
  },
  test: {
    globals: true,
    cache: {
      dir: "../../node_modules/.vitest",
    },
    environment: "jsdom",
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
});
