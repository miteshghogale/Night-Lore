// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

const SITE_URL = process.env.SITE_URL || 'https://night-lore.lifterplate.workers.dev';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  server: {
    host: true,
    port: 4321
  },
  adapter: cloudflare({
    imageService: 'passthrough',
  }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/api')
    })
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ['@astrojs/cloudflare'],
    },
    ssr: {
      external: ['cloudflare:workers'],
    },
  },
});
