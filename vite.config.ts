import { defineConfig, type Plugin } from 'vite';

// Dev-server parity with Cloudflare Pages' static directory route:
// /cat (and /cat/) must serve cat/index.html, not the SPA fallback.
// configureServer installs this middleware BEFORE Vite's SPA fallback.
function catRoute(): Plugin {
  return {
    name: 'cat-route',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/cat' || req.url === '/cat/') {
          req.url = '/cat/index.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [catRoute()],
});
