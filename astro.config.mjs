import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import UnoCSS from 'unocss/astro';
import partytown from '@astrojs/partytown';

export default defineConfig({
  site: 'https://thecoderoom.dev/',
  // site:
  // process.env.VERCEL_URL
  //   ? `https://${process.env.VERCEL_URL}/`
  //   : 'https://localhost:3000/',
  trailingSlash: 'ignore',
  integrations: [
    sitemap(), 
    UnoCSS({ injectReset: true }),
    partytown({
      config: {
        forward: ['dataLayer.push']
      }
    })
  ],
  experimental: {
    devOverlay: true,
  },
  vite: {
    optimizeDeps: {
      exclude: ['@resvg/resvg-js'],
    },
  },
});
