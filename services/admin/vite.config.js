import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: Set base path to match the Nginx subpath.
  // This ensures assets are referenced as /admin/assets/file.js instead of /assets/file.js
  base: '/admin/',
  server: {
    port: 8080,
    host: true
  }
})
