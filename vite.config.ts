import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  server: {
    host: '127.0.0.1',
    port: 8000,
    strictPort: true,
    // cloudflared quick tunnels get a random *.trycloudflare.com host each run;
    // Vite 403s unknown Host headers unless they are allowlisted.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      // The browser talks to PocketBase through /__pb so the frontend never needs
      // to know the backend port. The prefix is stripped before forwarding.
      '/__pb': {
        target: 'http://127.0.0.1:7000',
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/__pb/, ''),
      },
    },
  },
  preview: {
    host: '127.0.0.1',
    port: 8000,
    strictPort: true,
  },
})
