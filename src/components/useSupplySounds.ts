import { useEffect, useRef } from 'react';
import type { Supply } from '../lib/engine';

const files = ['eat', 'drink'] as const;

export function useSupplySounds(
  consumed: Record<Supply, number>,
  enabled: boolean,
  volume: number,
  onError: () => void,
) {
  const previous = useRef(consumed);
  const error = useRef(onError);
  error.current = onError;
  const audio = useRef<{
    context: AudioContext | null;
    bytes: Promise<ArrayBuffer[]>;
    decoded?: Promise<AudioBuffer[]>;
    disposed: boolean;
  } | null>(null);

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
          if (!response.ok) throw new Error('Supply sound unavailable');
          return response.arrayBuffer();
        }),
      ),
      disposed: false,
    };
    void instance.bytes.catch(() => {});
    audio.current = instance;
    return () => {
      instance.disposed = true;
      abort.abort();
      void instance.context?.close();
      audio.current = null;
    };
  }, [enabled]);

  useEffect(() => {
    const before = previous.current;
    previous.current = consumed;
    const item = (Object.keys(consumed) as Supply[]).find(
      (key) => consumed[key] > before[key],
    );
    const instance = audio.current;
    // Only the accepted tick consumes an item. Reset and rejected clicks are silent.
    if (!item || !enabled || !volume || !instance?.decoded) return;
    const accepted = performance.now();
    let cancelled = false;
    void instance.decoded
      .then((buffers) => {
        if (
          cancelled ||
          instance.disposed ||
          performance.now() - accepted > 200
        )
          return;
        const context = instance.context!;
        if (context.state !== 'running') return;
        const source = context.createBufferSource();
        const gain = context.createGain();
        source.buffer = buffers[item === 'shark' ? 0 : 1];
        gain.gain.value = volume / 100;
        source.connect(gain);
        gain.connect(context.destination);
        source.onended = () => {
          source.disconnect();
          gain.disconnect();
        };
        source.start();
      })
      .catch(() => {
        if (!instance.disposed) error.current();
      });
    return () => {
      cancelled = true;
    };
  }, [consumed, enabled, volume]);

  // Called on the inventory click so browsers permit audio on the following tick.
  return () => {
    const instance = audio.current;
    if (!enabled || !volume || !instance) return;
    try {
      const context = (instance.context ||= new AudioContext());
      void context.resume().catch(() => {
        if (!instance.disposed) error.current();
      });
      instance.decoded ||= instance.bytes.then((bytes) =>
        Promise.all(bytes.map((data) => context.decodeAudioData(data))),
      );
      void instance.decoded.catch(() => {
        if (!instance.disposed) error.current();
      });
    } catch {
      error.current();
    }
  };
}
