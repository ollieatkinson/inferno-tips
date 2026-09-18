// Offline asset preparation only. The site ships WebP sheets, not Three.js.
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'inferno-sprites-'));
const models = {
  mager: { file: '7699_33000', actions: { idle: 0, magic: 2 } },
  ranger: { file: '7698_33014', actions: { idle: 0, range: 2 } },
  blob: { file: '7693_33001', actions: { idle: 0, magic: 2, range: 4 } },
  melee: { file: '7697_33010', actions: { idle: 0, melee: 2 } },
  bat: { file: '7692_33018', actions: { idle: 0, range: 1 } },
  jad: { file: '7700_33012', actions: { idle: 0, magic: 2, range: 3 } },
};
const provenance = {};
for (const [name, { file, actions }] of Object.entries(models)) {
  const url = `https://oldschool-cdn.com/models/${file}.glb`;
  const target = path.join(work, `${name}.glb`);
  execFileSync('curl', ['-fsSL', url, '-o', target]);
  provenance[name] = {
    url,
    sha256: createHash('sha256')
      .update(await fs.readFile(target))
      .digest('hex'),
    actions,
  };
}
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const name = decodeURIComponent(url.pathname);
    if (name.includes('..')) throw new Error('Invalid path');
    const file = name.startsWith('/models/')
      ? path.join(work, path.basename(name))
      : name.startsWith('/node_modules/three/')
        ? path.join(here, name.slice(1))
        : path.join(here, 'viewer.html');
    res.setHeader(
      'Content-Type',
      file.endsWith('.js')
        ? 'text/javascript'
        : file.endsWith('.html')
          ? 'text/html'
          : 'application/octet-stream',
    );
    res.end(await fs.readFile(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  headless: true,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader'],
});
try {
  const out = path.join(root, 'public/monsters');
  await fs.mkdir(out, { recursive: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.loadModel);
  const manifest = {};
  for (const [name, { actions }] of Object.entries(models)) {
    const info = await page.evaluate(
      ({ name, indices }) => window.loadModel(name, indices),
      { name, indices: Object.values(actions) },
    );
    manifest[name] = {};
    for (const [action, index] of Object.entries(actions)) {
      const durationMs = Math.round(info.clips[index].duration * 1000);
      const frames = action === 'idle' ? 1 : Math.ceil(durationMs / 50);
      const parts = [];
      for (let i = 0; i < frames; i++) {
        const data = await page.evaluate(
          ({ index, time }) =>
            /** @type {Window & {frame: (index: number, time: number) => string}} */ (
              window
            ).frame(index, time),
          { index, time: i / 20 },
        );
        parts.push({
          input: Buffer.from(data.split(',')[1], 'base64'),
          left: (i % 8) * 192,
          top: Math.floor(i / 8) * 192,
        });
      }
      await sharp({
        create: {
          width: 8 * 192,
          height: Math.ceil(frames / 8) * 192,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
        .composite(parts)
        .webp({ lossless: true })
        .toFile(path.join(out, `${name}-${action}.webp`));
      manifest[name][action] = {
        frames,
        durationMs,
        src: `/monsters/${name}-${action}.webp`,
      };
      console.log(name, action, frames, durationMs);
    }
  }
  await fs.writeFile(
    path.join(root, 'src/lib/monsterSprites.json'),
    JSON.stringify(manifest, null, 2) + '\n',
  );
  await fs.writeFile(
    path.join(root, 'docs/monster-models.json'),
    JSON.stringify(provenance, null, 2) + '\n',
  );
} finally {
  await browser.close();
  server.close();
  await fs.rm(work, { recursive: true, force: true });
}
