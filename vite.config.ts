import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (
              id.includes('@react-three/fiber') ||
              id.includes('@react-three/drei') ||
              id.includes('@react-three/postprocessing')
            ) return 'r3f'
            if (id.includes('/three/') || id.includes('/three@')) return 'three-core'
            if (id.includes('gsap')) return 'gsap'
            if (id.includes('lottie-web')) return 'lottie'
            if (id.includes('framer-motion')) return 'framer'
            if (id.includes('lenis')) return 'lenis'
            if (
              id.includes('react-dom') ||
              id.includes('react-router') ||
              id.includes('/react/')
            ) return 'react-vendor'
          }
        },
      },
    },
  },
})
