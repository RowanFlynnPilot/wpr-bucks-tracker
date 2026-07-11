import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// GitHub Pages serves this repo at /wpr-bucks-tracker/
export default defineConfig({
  plugins: [react()],
  base: '/wpr-bucks-tracker/',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        mini: resolve(__dirname, 'mini.html'),
        'mini-standings': resolve(__dirname, 'mini-standings.html'),
      },
    },
  },
})
