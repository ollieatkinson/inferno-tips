import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
export default defineConfig({ site: 'https://inferno.tips', integrations: [react()] });
