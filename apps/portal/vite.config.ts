import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { publicAssetProxy } from '../../vite.publicAssetProxy'

const REPO_ROOT = path.resolve(__dirname, '../..')

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(REPO_ROOT, 'src'),
    },
  },
  publicDir: path.resolve(REPO_ROOT, 'public'),
  envDir: REPO_ROOT,
  server: {
    port: 5175,
    proxy: publicAssetProxy(mode, REPO_ROOT),
  },
  build: {
    outDir: path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
}))
