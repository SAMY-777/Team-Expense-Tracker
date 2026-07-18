// client/vite.config.js
// Standard Vite + React configuration. The dev server runs on port 5173 by
// default, which matches CLIENT_ORIGIN in server/.env.example for CORS.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
