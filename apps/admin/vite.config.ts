import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const REPO_ROOT = path.resolve(__dirname, '../..')

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(REPO_ROOT, 'src'),
    },
  },
  publicDir: path.resolve(REPO_ROOT, 'public'),
  envDir: REPO_ROOT,
  server: {
    port: 5176,
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
})
