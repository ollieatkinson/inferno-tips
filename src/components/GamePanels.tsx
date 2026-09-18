import { useEffect, useRef, useState } from 'react';
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
  prayer,
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
  prayer: Prayer;
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
            : null
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
                    className={`prayer-button ${prayer === protection ? 'selected' : ''}`}
                    aria-label={prayerLabel(protection)}
                    title={name}
                    aria-pressed={prayer === protection}
                    onClick={() => onPrayer(protection)}
                  >
                    <span className="sr-only">{name}</span>
                  </button>
                ) : (
                  <span
                    key={name}
                    className="unavailable-prayer"
                    title={`${name} — not used in this drill`}
                    aria-hidden="true"
                  />
                );
              })}
            </div>
            <div className="native-prayer-footer">
              No prayer drain in drills
            </div>
          </>
        ) : (
          <div className="native-inventory-grid">
            {slots.map((entry, index) =>
              entry ? (
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
                  <img src={`/icons/${entry.item}.png`} alt="" />
                  {entry.item !== 'shark' && (
                    <span className="item-doses">{entry.doses}</span>
                  )}
                </button>
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
      <div className="game-panel-status">
        <span>Active: {prayerLabel(prayer)}</span>
        <p>
          {panel === 'prayers'
            ? 'Click a protection prayer to toggle it.'
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
