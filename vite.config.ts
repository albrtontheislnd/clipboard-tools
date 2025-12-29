import { fileURLToPath, URL } from 'node:url'
import builtins from "builtin-modules"
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import { viteStaticCopy } from "vite-plugin-static-copy"
import path from "path";


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
    viteStaticCopy({
      targets: [
        {
          src: "dist/main.js",
          dest: path.resolve(__dirname),
        },
        {
          src: "static/manifest.json",
          dest: path.resolve(__dirname),
        },
        {
          src: "dist/styles.css",
          dest: path.resolve(__dirname),
        },
        {
          src: "static/data.json",
          dest: path.resolve(__dirname),
        },
        {
          src: "static/manifest.json",
          dest: "",
        },
        {
          src: "static/data.json",
          dest: "",
        },
      ],
    })
  ],
  build: {
    outDir: 'dist',
    cssCodeSplit: false, // Disable CSS extraction
    cssMinify: true,
    emptyOutDir: true,
    lib: {
      entry: 'src/main.ts',
      formats: ['cjs'],
      name: 'main',
      fileName: () => 'main.js',

    },
    rollupOptions: {
      input: "src/main.ts",
      external: externalModules,
      output: {
        manualChunks: () => 'main', // Disables code splitting for a single bundle
        assetFileNames: 'styles.css',
        entryFileNames: "main.js",
        format: "cjs", // Obsidian plugins expect CommonJS
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
