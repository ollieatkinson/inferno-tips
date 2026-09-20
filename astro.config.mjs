import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({
  site: 'https://inferno.tips',
  integrations: [react()],
  security: {
    csp: {
      directives: [
        "default-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'self'",
        'frame-src https://challenges.cloudflare.com',
        "connect-src 'self' https://challenges.cloudflare.com https://cloudflareinsights.com",
        "img-src 'self' data:",
        "font-src 'self' https://fonts.gstatic.com",
      ],
      scriptDirective: {
        resources: [
          "'self'",
          'https://challenges.cloudflare.com',
          'https://static.cloudflareinsights.com',
        ],
      },
      // React uses inline styles for tick progress, sprites and arena positions.
      styleDirective: {
        resources: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
        ],
      },
    },
  },
  vite: {
    server: { proxy: { '/api/v1': 'http://127.0.0.1:8787' } },
    preview: { proxy: { '/api/v1': 'http://127.0.0.1:8787' } },
  },
});
