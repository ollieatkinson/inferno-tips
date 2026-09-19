import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from 'react';
import { TickMeter } from './TickMeter';
import type { LessonId, Prayer } from '../lib/course';
import { stock, type Supply } from '../lib/engine';
import { tabKeyLabel, type Settings } from '../lib/settings';

const prayers = [
  'Thick Skin',
  'Burst of Strength',
  'Clarity of Thought',
  'Sharp Eye',
  'Mystic Will',
  'Rock Skin',
  'Superhuman Strength',
  'Improved Reflexes',
  'Rapid Restore',
  'Rapid Heal',
  'Protect Item',
  'Hawk Eye',
  'Mystic Lore',
  'Steel Skin',
  'Ultimate Strength',
  'Incredible Reflexes',
  'Protect from Magic',
  'Protect from Missiles',
  'Protect from Melee',
  'Eagle Eye',
  'Mystic Might',
  'Retribution',
  'Redemption',
  'Smite',
  'Preserve',
  'Chivalry',
  'Piety',
  'Rigour',
  'Augury',
];
const protections: Record<number, Exclude<Prayer, 'off'>> = {
  16: 'magic',
  17: 'range',
  18: 'melee',
};
const prayerLabel = (prayer: Prayer) =>
  prayer === 'off'
    ? 'None'
    : prayer === 'range'
      ? 'Ranged'
      : prayer === 'magic'
        ? 'Magic'
        : 'Melee';
type Slot = { item: Supply; doses: number } | null;
function inventory(id: LessonId): Slot[] {
  const items: Slot[] =
    id === 'food'
      ? Array.from({ length: stock.shark }, () => ({ item: 'shark', doses: 1 }))
      : id === 'potions'
        ? [
            { item: 'brew', doses: 4 },
            { item: 'brew', doses: 2 },
            { item: 'restore', doses: 2 },
          ]
        : [];
  return [...items, ...Array<null>(28 - items.length).fill(null)];
}
const itemAction = (item: Supply) =>
  item === 'shark'
    ? 'Eat shark'
    : item === 'brew'
      ? 'Drink Saradomin brew'
      : 'Drink super restore';

export function GamePanels({
  id,
  prayerInstruction,
  activePrayer,
  onRetry,
  retryLabel = 'Retry',
  children,
  score,
  tickDeadline,
  paused,
  litPrayers,
  panel,
  tabKeys,
  running,
  consumed,
  queuedSupply,
  supplyMessage,
  onPanel,
  onPrayer,
  onSupply,
}: {
  id: LessonId;
  prayerInstruction?: string;
  activePrayer: Prayer;
  onRetry?: () => void;
  retryLabel?: string;
  children?: ReactNode;
  score: number;
  tickDeadline: RefObject<number | null>;
  paused: boolean;
  litPrayers: Prayer[];
  panel: 'prayers' | 'inventory';
  tabKeys: Settings['tabKeys'];
  running: boolean;
  consumed: Record<Supply, number>;
  queuedSupply: Supply | null;
  supplyMessage: string;
  onPanel: (panel: 'prayers' | 'inventory') => void;
  onPrayer: (prayer: Exclude<Prayer, 'off'>) => void;
  onSupply: (item: Supply) => void;
}) {
  const [slots, setSlots] = useState(() => inventory(id));
  const queuedSlot = useRef<number | null>(null);
  const previous = useRef(consumed);
  // Remove only the clicked item, and only after the engine accepts it.
  // Rejected cooldown clicks leave both the item and its doses intact.
  useEffect(() => {
    const before = previous.current;
    previous.current = consumed;
    if (
      Object.keys(consumed).some(
        (item) => consumed[item as Supply] < before[item as Supply],
      )
    ) {
      setSlots(inventory(id));
      queuedSlot.current = null;
      return;
    }
    const slot = queuedSlot.current;
    if (
      slot === null ||
      !Object.keys(consumed).some(
        (item) => consumed[item as Supply] > before[item as Supply],
      )
    )
      return;
    setSlots((current) =>
      current.map((entry, index) => {
        if (index !== slot || !entry) return entry;
        const used = consumed[entry.item] - before[entry.item];
        return used > 0
          ? entry.doses > used
            ? { ...entry, doses: entry.doses - used }
            : entry.item === 'shark'
              ? null
              : { ...entry, doses: 0 }
          : entry;
      }),
    );
  }, [consumed, id]);
  return (
    <aside className="game-side-panel" aria-label="Player controls">
      <div className="game-panel-tabs" role="group" aria-label="Game panels">
        <button
          aria-pressed={panel === 'inventory'}
          onClick={() => onPanel('inventory')}
        >
          <img src="/icons/inventory.png" alt="" /> Inventory{' '}
          <kbd>{tabKeyLabel(tabKeys.inventory)}</kbd>
        </button>
        <button
          aria-pressed={panel === 'prayers'}
          onClick={() => onPanel('prayers')}
        >
          <img src="/icons/prayer.png" alt="" /> Prayers{' '}
          <kbd>{tabKeyLabel(tabKeys.prayers)}</kbd>
        </button>
      </div>
      <div
        className={`native-panel ${panel}`}
        aria-label={panel === 'prayers' ? 'Prayer panel' : 'Inventory panel'}
      >
        {panel === 'prayers' ? (
          <>
            <div className="native-prayer-grid">
              {prayers.map((name, index) => {
                const protection = protections[index];
                return protection ? (
                  <button
                    key={name}
                    className="prayer-button"
                    data-lit={litPrayers.includes(protection)}
                    aria-label={prayerLabel(protection)}
                    title={name}
                    aria-pressed={litPrayers.includes(protection)}
                    onPointerDown={(event) => {
                      // Two thumbs can overlap during alternating. A second
                      // touch is non-primary but still an intentional press.
                      if (
                        event.button === 0 &&
                        (event.isPrimary || event.pointerType === 'touch')
                      )
                        onPrayer(protection);
                    }}
                    onClick={(event) => {
                      // Keyboard and assistive activation still work. A real
                      // pointer click was handled on press, not on release.
                      if (event.detail === 0) onPrayer(protection);
                    }}
                  >
                    <img
                      className="native-prayer-icon"
                      src={`/game-ui/protect-${protection}.png`}
                      alt=""
                    />
                    <span className="sr-only">{name}</span>
                  </button>
                ) : (
                  <span
                    key={name}
                    className="unavailable-prayer"
                    title={`${name} — not used in this drill`}
                    aria-hidden="true"
                  >
                    <img
                      className="native-prayer-icon"
                      src={`/game-ui/prayers/${name.toLowerCase().replaceAll(' ', '_')}.png`}
                      alt=""
                    />
                  </span>
                );
              })}
            </div>
          </>
        ) : (
          <div className="native-inventory-grid">
            {slots.map((entry, index) =>
              entry && entry.doses > 0 ? (
                <button
                  key={index}
                  className={`inventory-slot supply-button ${queuedSupply === entry.item && queuedSlot.current === index ? 'queued' : ''}`}
                  disabled={!running}
                  data-slot={index}
                  aria-label={`${itemAction(entry.item)}, slot ${index + 1}${entry.item === 'shark' ? '' : `, ${entry.doses} doses remaining`}`}
                  title={`${itemAction(entry.item)}${entry.item === 'shark' ? '' : ` (${entry.doses})`}`}
                  onClick={() => {
                    queuedSlot.current = index;
                    onSupply(entry.item);
                  }}
                >
                  <img
                    src={
                      entry.item === 'shark'
                        ? '/icons/shark.png'
                        : `/icons/${entry.item}-${entry.doses}.png`
                    }
                    alt=""
                  />
                  {entry.item !== 'shark' && (
                    <span className="item-doses">{entry.doses}</span>
                  )}
                </button>
              ) : entry ? (
                <span
                  className="inventory-slot"
                  data-slot={index}
                  key={index}
                  role="img"
                  aria-label={`Empty vial, slot ${index + 1}`}
                  title="Empty vial"
                >
                  <img src="/icons/vial.png" alt="" />
                </span>
              ) : (
                <span
                  className="inventory-slot empty-slot"
                  data-slot={index}
                  key={index}
                  aria-hidden="true"
                />
              ),
            )}
          </div>
        )}
      </div>
      <div className="panel-tick-clock">
        <span>
          {paused ? 'Tick paused' : 'Next tick'} <span>0.6s cycle</span>
        </span>
        <TickMeter deadline={tickDeadline} paused={paused} />
      </div>
      {children}
      <div className="game-panel-status">
        <div className="game-panel-active">
          <span>
            {onRetry
              ? `Run complete · ${score}%`
              : `Active: ${prayerLabel(activePrayer)}`}
          </span>
          {onRetry && (
            <button className="button secondary nearby-retry" onClick={onRetry}>
              {retryLabel}
            </button>
          )}
        </div>
        {panel === 'inventory' && id === 'food' && (
          <span className="supply-count">
            {stock.shark - consumed.shark} sharks left
          </span>
        )}
        {panel === 'inventory' && id === 'potions' && (
          <span className="supply-count">
            Brew: {stock.brew - consumed.brew} doses · Restore:{' '}
            {stock.restore - consumed.restore} doses
          </span>
        )}
        <p>
          {panel === 'prayers'
            ? prayerInstruction || 'Click a protection prayer to toggle it.'
            : id === 'food' || id === 'potions'
              ? queuedSupply
                ? `${itemAction(queuedSupply)} queued for the next tick.`
                : supplyMessage ||
                  'Use a supply in the gap, then return to Prayers.'
              : 'No supplies needed for this lesson.'}
        </p>
      </div>
    </aside>
  );
}
