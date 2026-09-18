// Regenerate after editing docs/los-setups.json. Uses the companion's public
// encoder and simulator; the application/build has no sibling-repo dependency.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createServer } from 'vite';
const root = path.resolve(process.argv[2] || '../inferno-los');
const server = await createServer({
  configFile: false,
  root,
  cacheDir: '/tmp/inferno-tips-los-generator',
  server: { middlewareMode: true },
  appType: 'custom',
});
try {
  const { encodeLink, decodeLink } =
    await server.ssrLoadModule('/src/links.ts');
  const { canAttack, legal } = await server.ssrLoadModule('/src/geometry.ts');
  const { Simulation } = await server.ssrLoadModule('/src/simulation.ts');
  const fixtures = JSON.parse(
    await fs.readFile('docs/los-setups.json', 'utf8'),
  );
  const output = {};
  for (const [id, { label, description, scenario }] of Object.entries(
    fixtures,
  )) {
    for (const mob of scenario.mobs)
      assert(legal(mob, scenario), `${id}: invalid or overlapping NPC`);
    const href = encodeLink(scenario, 'https://los.inferno.tips/');
    assert.deepEqual(decodeLink(href), { scenario, steps: [] });
    output[id] = { label, description, href };
  }
  const scene = (id) => fixtures[id].scenario;
  const flinch = scene('blob-flinch');
  assert(!canAttack(flinch.mobs[0], flinch.player, flinch.pillars));
  const sim = new Simulation(flinch);
  assert.equal(sim.step(flinch.player, 'mage').attacks.length, 0);
  assert.equal(sim.step(flinch.player, 'mage').attacks.length, 0);
  assert.deepEqual(
    sim.step(flinch.player, 'mage').attacks.map((a) => a.style),
    ['mage'],
  );
  assert(!canAttack(sim.scenario.mobs[0], flinch.player, flinch.pillars));
  const stack = new Simulation(scene('pillar-stack'));
  assert.deepEqual(
    stack.step([16, 8], 'mage').attacks.map((a) => a.style),
    ['mage'],
  );
  assert.deepEqual(
    stack.step([16, 8], 'range').attacks.map((a) => a.style),
    ['range'],
  );
  const corner = scene('corner');
  assert.equal(new Simulation(corner).step([21, 7], 'range').attacks.length, 0);
  assert.deepEqual(
    new Simulation(corner).step([20, 8], 'range').attacks.map((a) => a.style),
    ['range'],
  );
  const range = scene('weapon-range');
  assert(canAttack(range.mobs[0], range.player, range.pillars));
  assert(!canAttack(range.mobs[1], range.player, range.pillars));
  assert(canAttack(range.mobs[1], [16, 9], range.pillars));
  const collision = new Simulation(scene('collision'));
  assert.deepEqual(
    collision.step(collision.scenario.player, null).attacks.map((a) => a.style),
    ['mage', 'range'],
  );
  const dig = new Simulation(scene('melee-dig'));
  for (let i = 0; i < 2; i++)
    assert.equal(dig.step(dig.scenario.player, 'mage').digs.length, 0);
  assert.equal(dig.step(dig.scenario.player, 'mage').digs[0]?.phase, 'burrow');
  const movement = scene('two-tick-movement');
  assert.deepEqual(
    movement.mobs.map((m) => canAttack(m, movement.player, movement.pillars)),
    [true, true, false],
  );
  await fs.writeFile(
    'src/lib/losSetups.json',
    JSON.stringify(output, null, 2) + '\n',
  );
  console.log(
    `Validated and generated ${Object.keys(output).length} LoS setups.`,
  );
} finally {
  await server.close();
}
