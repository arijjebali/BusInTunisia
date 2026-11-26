import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_API_TARGET permet aux tests E2E de pointer vers un serveur branché sur la base de test.
const apiTarget = process.env.VITE_API_TARGET || 'http://localhost:5000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.VITE_PORT) || 5173,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
      }
    }
  }
})
