import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/react-markdown') || id.includes('node_modules/remark') || id.includes('node_modules/unified')) {
            return 'markdown'
          }
          if (id.includes('react-syntax-highlighter') || id.includes('refractor')) {
            return 'syntax-highlighter'
          }
          if (id.includes('framer-motion')) {
            return 'motion'
          }
          if (id.includes('@clerk/clerk-react')) {
            return 'clerk'
          }
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/react-router')) {
            return 'router'
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
