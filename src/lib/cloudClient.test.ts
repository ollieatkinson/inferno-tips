import { afterEach, describe, expect, it, vi } from 'vitest';
import { CloudRecorder, pendingRuns } from './cloudClient';
import type { CloudTicket } from './cloudProtocol';
const ticket: CloudTicket = {
  id: 'test-run',
  mode: 'hard',
  seed: 7,
  version: 1,
};
afterEach(() => vi.unstubAllGlobals());
function storage() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  });
}
describe('pending cloud submissions', () => {
  it('retains a failed upload and resumes its exact batch after a reload', async () => {
    storage();
    let offline = true;
    const requests: { path: string; data: unknown }[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (path: string, init: RequestInit) => {
        if (offline) throw new TypeError('offline');
        requests.push({ path, data: JSON.parse(init.body as string) });
        return new Response(
          JSON.stringify(
            path.endsWith('/finish')
              ? { points: 20, stage: 1, cleared: false, practice: false }
              : { accepted: 0 },
          ),
          { headers: { 'Content-Type': 'application/json' } },
        );
      }),
    );
    const original = new CloudRecorder(ticket);
    original.record(0, {
      tick: 1,
      prayer: 'magic',
      tile: 12,
      supply: null,
      transitions: ['magic'],
      blowpipe: null,
    });
    original.finish(false);
    await expect(original.sync()).rejects.toThrow('Connection unavailable');
    expect(pendingRuns()[0].batches).toHaveLength(1);
    const saved = pendingRuns()[0];
    const originalBatch = structuredClone(saved.batches[0]);
    offline = false;
    const recovered = new CloudRecorder(ticket, saved);
    await recovered.sync();
    expect(requests.map((r) => r.path)).toEqual([
      '/api/v1/runs/test-run/batches',
      '/api/v1/runs/test-run/finish',
    ]);
    expect(requests[0].data).toEqual(originalBatch);
    expect(pendingRuns()[0].result?.points).toBe(20);
    await recovered.publish('Player', 'token');
    expect(pendingRuns()).toEqual([]);
  });
  it('does not publish practice and can still save from memory when storage is unavailable', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('quota');
      },
    });
    const fetcher = vi.fn(
      async (path: string) =>
        new Response(
          JSON.stringify(
            path.endsWith('/finish')
              ? { points: 20, stage: 1, cleared: false, practice: true }
              : { accepted: 0 },
          ),
        ),
    );
    vi.stubGlobal('fetch', fetcher);
    const recorder = new CloudRecorder(ticket);
    recorder.record(0, {
      tick: 1,
      prayer: 'magic',
      tile: 12,
      supply: null,
      transitions: [],
      blowpipe: null,
    });
    expect(recorder.persistent).toBe(false);
    recorder.finish(true);
    await recorder.sync();
    await expect(recorder.publish('Player', 'token')).rejects.toThrow(
      'practice only',
    );
    expect(fetcher.mock.calls.some(([path]) => path.endsWith('/publish'))).toBe(
      false,
    );
  });
});
