import { spawnSync } from 'node:child_process';
const [environment, action, id] = process.argv.slice(2);
if (
  !['staging', 'production'].includes(environment) ||
  !['hide', 'block', 'unblock'].includes(action) ||
  !/^[a-f0-9-]{36}$/.test(id || '')
) {
  console.error(
    'Usage: node scripts/moderate-scores.mjs staging|production hide|block|unblock RUN_ID',
  );
  process.exit(1);
}
const sql =
  action === 'hide'
    ? `UPDATE scores SET hidden = 1 WHERE id = '${id}'`
    : `UPDATE guests SET blocked = ${action === 'block' ? 1 : 0} WHERE id = (SELECT guest_id FROM runs WHERE id = '${id}')`;
const child = spawnSync(
  'npx',
  [
    'wrangler',
    'd1',
    'execute',
    'DB',
    '--remote',
    '--config',
    'worker/wrangler.jsonc',
    '--env',
    environment,
    '--command',
    sql,
  ],
  { stdio: 'inherit' },
);
process.exit(child.status ?? 1);
