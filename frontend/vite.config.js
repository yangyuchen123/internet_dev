import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',  // 允许所有网络接口访问
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_BASE_URL ?? 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})