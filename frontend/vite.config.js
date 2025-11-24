import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',  // 允许所有网络接口访问
    port: 5173
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})