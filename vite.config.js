import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy Gemini API calls in dev to avoid CORS issues if they arise
  },
  build: {
    // FIX: Split large vendors into separate chunks for faster page loads
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase':  ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'pdf':       ['jspdf', 'jspdf-autotable'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
    // Raise warning threshold (we know pdf lib is large)
    chunkSizeWarningLimit: 600,
  },
})
