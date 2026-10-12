import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite configuration for GlobeSync React frontend
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'spa-fallback-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const [pathname] = (req.url || '').split('?');
          // If request is for an SPA route (no extension) and accepts HTML, route to index.html
          if (
            req.method === 'GET' &&
            req.headers.accept?.includes('text/html') &&
            !pathname.includes('.')
          ) {
            req.url = '/index.html';
          }
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    open: false,
  },
});
