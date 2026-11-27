/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const { version: APP_VERSION } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

const PORT = 4317;

/**
 * Strenge Content-Security-Policy für den Produktions-Build.
 * Im Entwicklungsmodus entfällt sie, weil Vite dort Inline-Skripte und
 * eine WebSocket-Verbindung für das Neuladen braucht.
 */
const CSP = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspPlugin(): Plugin {
  return {
    name: 'notenmeister-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return html.replace(
        '<meta charset="UTF-8" />',
        `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`,
      );
    },
  };
}

/**
 * Erzeugt beim Build einen Service Worker, der alle gebauten Dateien
 * vorhält. Danach startet die App auch ohne laufenden Server.
 */
function serviceWorkerPlugin(): Plugin {
  return {
    name: 'notenmeister-sw',
    apply: 'build',
    generateBundle(_options, bundle) {
      const files = Object.keys(bundle).filter((f) => !f.endsWith('.map'));
      const assets = ['./', ...files.map((f) => `./${f}`)];
      const version = createHash('sha256').update(files.sort().join('|')).digest('hex').slice(0, 12);
      const source = `// Automatisch erzeugt – nicht von Hand bearbeiten.
const CACHE = 'notenmeister-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit) return hit;
      if (req.mode === 'navigate') return caches.match('./');
      return fetch(req);
    }),
  );
});
`;
      this.emitFile({ type: 'asset', fileName: 'sw.js', source });
    },
  };
}

export default defineConfig({
  base: './',
  define: { __APP_VERSION__: JSON.stringify(APP_VERSION) },
  plugins: [tailwindcss(), svelte(), cspPlugin(), serviceWorkerPlugin()],
  server: { port: PORT, strictPort: true, host: '127.0.0.1' },
  preview: { port: PORT, strictPort: true, host: '127.0.0.1' },
  build: { target: 'es2022', sourcemap: false, modulePreload: { polyfill: false } },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
