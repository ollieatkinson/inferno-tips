import { describe, expect, it } from 'vitest';
import { defaultSettings, parseSettings, rebindTab } from './settings';

describe('saved site settings', () => {
  it.each([null, '{broken', 'null', '[]', 'false'])(
    'uses defaults for an invalid save: %s',
    (raw) => {
      expect(parseSettings(raw)).toEqual(defaultSettings);
    },
  );
  it('retains legacy keybinds and gives new preferences their defaults', () => {
    const legacy = JSON.stringify({ inventory: 'F4', prayers: 'Escape' });
    expect(parseSettings(null, legacy)).toEqual({
      ...defaultSettings,
      tabKeys: { inventory: 'F4', prayers: 'Escape' },
    });
    expect(parseSettings('{bad', legacy).tabKeys.prayers).toBe('Escape');
  });
  it('prefers new settings and rejects corrupt fields independently', () => {
    const legacy = JSON.stringify({ inventory: 'F4', prayers: 'F5' });
    expect(
      parseSettings(
        JSON.stringify({
          tabKeys: { inventory: 'F2', prayers: 'F1' },
          defaultMode: 'challenge',
          tickSound: true,
          volume: 25,
        }),
        legacy,
      ),
    ).toEqual({
      ...defaultSettings,
      tabKeys: { inventory: 'F2', prayers: 'F1' },
      defaultMode: 'challenge',
      tickSound: true,
      volume: 25,
    });
    expect(
      parseSettings(
        JSON.stringify({
          tabKeys: { inventory: 'F1', prayers: 'F1' },
          defaultMode: 'slow',
          tickSound: 'true',
          volume: 999,
        }),
        legacy,
      ),
    ).toEqual({
      ...defaultSettings,
      tabKeys: { inventory: 'F4', prayers: 'F5' },
    });
  });
  it('saves prayer audio independently and migrates existing settings', () => {
    expect(
      parseSettings(JSON.stringify({ tickSound: true, volume: 25 })),
    ).toMatchObject({
      tickSound: true,
      volume: 25,
      prayerSound: true,
      prayerVolume: 50,
    });
    expect(
      parseSettings(JSON.stringify({ prayerSound: false, prayerVolume: 0 })),
    ).toMatchObject({ prayerSound: false, prayerVolume: 0 });
    expect(
      parseSettings(JSON.stringify({ prayerSound: 'false', prayerVolume: -1 })),
    ).toMatchObject({ prayerSound: true, prayerVolume: 50 });
  });
  it('swaps colliding bindings without mutating the previous settings', () => {
    const original = { ...defaultSettings, tickSound: true, volume: 25 };
    expect(rebindTab(original, 'prayers', 'Escape')).toEqual({
      ...original,
      tabKeys: { inventory: 'F1', prayers: 'Escape' },
    });
    expect(original.tabKeys).toEqual({ inventory: 'Escape', prayers: 'F1' });
  });
});
