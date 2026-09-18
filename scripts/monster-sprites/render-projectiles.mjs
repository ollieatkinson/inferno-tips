// Compact, local projectile artwork from the same game models as the enemies.
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
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'inferno-projectiles-'));
const models = {
  magic: 'mage_projectile',
  range: 'range_projectile',
  'jad-magic': 'jad_mage_front',
  'jad-range': 'jad_range',
};
const provenance = {};
for (const [name, file] of Object.entries(models)) {
  const url = `https://oldschool-cdn.com/models/${file}.glb`;
  const target = path.join(work, `${name}.glb`);
  execFileSync('curl', ['-fsSL', url, '-o', target]);
  provenance[name] = {
    url,
    sha256: createHash('sha256')
      .update(await fs.readFile(target))
      .digest('hex'),
  };
}
const server = http.createServer(async (req, res) => {
  try {
    const name = new URL(req.url, 'http://localhost').pathname;
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
  await fs.mkdir(path.join(root, 'public/effects'), { recursive: true });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => window.loadModel);
  for (const name of Object.keys(models)) {
    await page.evaluate((name) => window.loadModel(name, []), name);
    const data = await page.evaluate(() =>
      /** @type {Window & {frame: (index: number, time: number) => string}} */ (
        window
      ).frame(-1, 0),
    );
    await sharp(Buffer.from(data.split(',')[1], 'base64'))
      .trim()
      .resize({ width: 64, height: 64, fit: 'inside' })
      .webp({ lossless: true })
      .toFile(path.join(root, `public/effects/projectile-${name}.webp`));
    console.log(name);
  }
  await fs.writeFile(
    path.join(root, 'docs/projectile-models.json'),
    JSON.stringify(provenance, null, 2) + '\n',
  );
} finally {
  await browser.close();
  server.close();
  await fs.rm(work, { recursive: true, force: true });
}
