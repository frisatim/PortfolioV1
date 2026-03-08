import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2020',
    cssMinify: 'lightningcss',
    rollupOptions: {
      output: {
        manualChunks: {
          // Isolate heavy 3D deps — only loaded when globe mounts
          three: ['three'],
          globe: ['react-globe.gl', 'topojson-client'],
          // Isolate animation lib
          motion: ['framer-motion'],
          // Socket.io client
          socket: ['socket.io-client'],
          // Router + icons
          vendor: ['react-router-dom', 'lucide-react'],
        },
      },
    },
  },
})
