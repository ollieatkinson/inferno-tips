import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({
  site: 'https://inferno.tips',
  integrations: [react()],
  vite: {
    server: { proxy: { '/api/v1': 'http://127.0.0.1:8787' } },
    preview: { proxy: { '/api/v1': 'http://127.0.0.1:8787' } },
  },
});
