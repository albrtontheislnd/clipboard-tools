import { fileURLToPath, URL } from 'node:url'
import builtins from "builtin-modules"
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'

const externalModules = [
  "obsidian",
  "electron",
  "@codemirror/autocomplete",
  "@codemirror/collab",
  "@codemirror/commands",
  "@codemirror/language",
  "@codemirror/lint",
  "@codemirror/search",
  "@codemirror/state",
  "@codemirror/view",
  "@lezer/common",
  "@lezer/highlight",
  "@lezer/lr",
  ...builtins
];

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
  ],
  build: {
    outDir: '.',
    cssCodeSplit: false, // Disable CSS extraction
    cssMinify: true,
    emptyOutDir: false,
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      name: 'main',
      fileName: () => 'main.js',

    },
    rollupOptions: {
      external: externalModules,
      output: {
        manualChunks: undefined, // Disables code splitting for a single bundle
        assetFileNames: 'styles.css'
      },
    },
    sourcemap: process.env.NODE_ENV === 'production' ? false : 'inline',
    minify: process.env.NODE_ENV === 'production',
    target: 'es2018',
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  logLevel: 'info',
})
