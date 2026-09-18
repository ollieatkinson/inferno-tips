import type { Mode } from './course';

export const SETTINGS_KEY = 'inferno-tips-settings-v1';
export const LEGACY_TAB_KEYS = 'inferno-tips-tab-keys-v1';
export const tabKeyOptions = [
  'Escape',
  ...Array.from({ length: 12 }, (_, i) => `F${i + 1}`),
];
export const tabKeyLabel = (key: string) => (key === 'Escape' ? 'Esc' : key);
export interface Settings {
  tabKeys: { inventory: string; prayers: string };
  defaultMode: Mode;
  tickSound: boolean;
  prayerSound: boolean;
  prayerVolume: number;
  supplySound: boolean;
  supplyVolume: number;
  volume: number;
}
export const defaultSettings: Settings = {
  tabKeys: { inventory: 'Escape', prayers: 'F1' },
  defaultMode: 'guided',
  tickSound: false,
  prayerSound: true,
  prayerVolume: 50,
  supplySound: true,
  supplyVolume: 50,
  volume: 50,
};
function parse(raw: string | null): unknown {
  try {
    return JSON.parse(raw || 'null');
  } catch {
    return null;
  }
}
function validKeys(value: unknown): value is Settings['tabKeys'] {
  if (!value || typeof value !== 'object') return false;
  const keys = value as Settings['tabKeys'];
  return (
    tabKeyOptions.includes(keys.inventory) &&
    tabKeyOptions.includes(keys.prayers) &&
    keys.inventory !== keys.prayers
  );
}
export function parseSettings(
  raw: string | null,
  legacy: string | null = null,
): Settings {
  const value = parse(raw) as Partial<Settings> | null;
  const oldKeys = parse(legacy);
  return {
    tabKeys: validKeys(value?.tabKeys)
      ? value.tabKeys
      : validKeys(oldKeys)
        ? oldKeys
        : { ...defaultSettings.tabKeys },
    defaultMode: value?.defaultMode === 'challenge' ? 'challenge' : 'guided',
    tickSound: value?.tickSound === true,
    prayerSound:
      typeof value?.prayerSound === 'boolean'
        ? value.prayerSound
        : defaultSettings.prayerSound,
    prayerVolume:
      typeof value?.prayerVolume === 'number' &&
      Number.isFinite(value.prayerVolume) &&
      value.prayerVolume >= 0 &&
      value.prayerVolume <= 100
        ? value.prayerVolume
        : defaultSettings.prayerVolume,
    supplySound:
      typeof value?.supplySound === 'boolean'
        ? value.supplySound
        : defaultSettings.supplySound,
    supplyVolume:
      typeof value?.supplyVolume === 'number' &&
      Number.isFinite(value.supplyVolume) &&
      value.supplyVolume >= 0 &&
      value.supplyVolume <= 100
        ? value.supplyVolume
        : defaultSettings.supplyVolume,
    volume:
      typeof value?.volume === 'number' &&
      Number.isFinite(value.volume) &&
      value.volume >= 0 &&
      value.volume <= 100
        ? value.volume
        : defaultSettings.volume,
  };
}
export function readSettings(): Settings {
  if (typeof window === 'undefined') return defaultSettings;
  try {
    return parseSettings(
      localStorage.getItem(SETTINGS_KEY),
      localStorage.getItem(LEGACY_TAB_KEYS),
    );
  } catch {
    return defaultSettings;
  }
}
export function rebindTab(
  settings: Settings,
  tab: keyof Settings['tabKeys'],
  key: string,
): Settings {
  const other = tab === 'inventory' ? 'prayers' : 'inventory';
  return {
    ...settings,
    tabKeys: {
      ...settings.tabKeys,
      [tab]: key,
      ...(settings.tabKeys[other] === key
        ? { [other]: settings.tabKeys[tab] }
        : {}),
    },
  };
}
