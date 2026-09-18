import type { Prayer } from './course';
export type PhasePattern = 'one' | 'two' | 'shifted';
export function phaseTimeline(pattern: PhasePattern, firstScan: number) {
  const patterns: Record<PhasePattern, Prayer[]> = {
    one: ['magic', 'range'],
    two: ['magic', 'magic', 'range', 'range'],
    shifted: ['magic', 'range', 'range', 'magic'],
  };
  let pending: Prayer = 'off';
  return Array.from({ length: 12 }, (_, i) => {
    const tick = i + 1,
      prayer = patterns[pattern][i % patterns[pattern].length];
    const read = tick >= firstScan && (tick - firstScan) % 6 === 0;
    if (read) pending = prayer === 'magic' ? 'range' : 'magic';
    const attack =
      tick >= firstScan + 3 && (tick - firstScan - 3) % 6 === 0
        ? pending
        : null;
    return { tick, prayer, read, attack, protected: attack === prayer };
  });
}
