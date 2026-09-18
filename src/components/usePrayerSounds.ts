import { useEffect, useRef } from 'react';
import type { Prayer } from '../lib/course';

const files = [
  'mage-on',
  'mage-off',
  'range-on',
  'range-off',
  'melee-on',
  'melee-off',
];

export function usePrayerSounds(
  enabled: boolean,
  volume: number,
  onError: () => void,
) {
  const audio = useRef<{
    context: AudioContext | null;
    bytes: Promise<ArrayBuffer[]>;
    decoded?: Promise<Map<string, AudioBuffer>>;
    disposed: boolean;
  } | null>(null);
  const error = useRef(onError);
  error.current = onError;
  useEffect(() => {
    if (!enabled) return;
    const abort = new AbortController();
    const instance = {
      context: null as AudioContext | null,
      bytes: Promise.all(
        files.map(async (file) => {
          const response = await fetch(`/sounds/${file}.ogg`, {
            signal: abort.signal,
          });
          if (!response.ok) throw new Error('Prayer sound unavailable');
          return response.arrayBuffer();
        }),
      ),
      disposed: false,
    };
    // Downloads can complete before the first click, without autoplaying audio.
    void instance.bytes.catch(() => {});
    audio.current = instance;
    return () => {
      instance.disposed = true;
      abort.abort();
      void instance.context?.close();
      audio.current = null;
    };
  }, [enabled]);

  return (previous: Prayer, next: Prayer) => {
    if (!enabled || volume === 0 || previous === next || !audio.current) return;
    const instance = audio.current;
    const clicked = performance.now();
    const prayer = next === 'off' ? previous : next;
    if (prayer === 'off') return;
    const key = `${prayer === 'magic' ? 'mage' : prayer}-${next === 'off' ? 'off' : 'on'}`;
    void (async () => {
      try {
        // Create/resume on the actual user gesture, including before a run.
        const context = (instance.context ||= new AudioContext());
        const resumed = context.resume();
        instance.decoded ||= instance.bytes.then(
          async (bytes) =>
            new Map(
              await Promise.all(
                bytes.map(
                  async (data, i) =>
                    [files[i], await context.decodeAudioData(data)] as const,
                ),
              ),
            ),
        );
        const [buffers] = await Promise.all([instance.decoded, resumed]);
        // Never replay stale clicks after slow loading or after leaving a drill.
        if (instance.disposed || performance.now() - clicked > 200) return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffers.get(key)!;
        gain.gain.value = volume / 100;
        source.connect(gain);
        gain.connect(context.destination);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        source.start();
      } catch {
        if (!instance.disposed) error.current();
      }
    })();
  };
}
