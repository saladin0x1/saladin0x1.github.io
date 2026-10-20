import { defineConfig, type Plugin } from 'vite';

// Dev-server parity with Cloudflare Pages _redirects:
// /cat (and /cat/) must serve the cat page, not the SPA fallback.
// configureServer installs this middleware BEFORE Vite's SPA fallback.
function catRoute(): Plugin {
  return {
    name: 'cat-route',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === '/cat' || req.url === '/cat/') {
          req.url = '/cat.html';
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [catRoute()],
});
