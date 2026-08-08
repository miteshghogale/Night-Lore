// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import fs from 'node:fs';
import path from 'node:path';

const SITE_URL = process.env.SITE_URL || 'https://mynightlore.com';

function getStoryDates() {
  const datesMap = new Map();
  try {
    const dir = path.resolve('src/content/stories');
    if (fs.existsSync(dir)) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.md')) {
          const content = fs.readFileSync(path.join(dir, file), 'utf-8');
          const slug = file.replace(/\.md$/, '');
          const updatedMatch = content.match(/^updatedDate:\s*["']?([^"'\r\n]+)["']?/m);
          const pubMatch = content.match(/^pubDate:\s*["']?([^"'\r\n]+)["']?/m);
          const dateStr = updatedMatch?.[1] || pubMatch?.[1];
          if (dateStr) {
            datesMap.set(`/story/${slug}/`, new Date(dateStr).toISOString());
          }
        }
      }
    }
  } catch (e) {
    console.error('Error parsing story dates for sitemap:', e);
  }
  return datesMap;
}

const storyDates = getStoryDates();
const buildDate = new Date().toISOString();

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
      filter: (page) => !page.includes('/admin') && !page.includes('/api') && !page.includes('/404') && !page.includes('/500'),
      serialize(item) {
        try {
          const url = new URL(item.url);
          const pathname = url.pathname;
          if (storyDates.has(pathname)) {
            item.lastmod = storyDates.get(pathname);
          } else {
            item.lastmod = buildDate;
          }
        } catch (e) {
          item.lastmod = buildDate;
        }
        return item;
      }
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

