import {
  defaultSettings,
  rebindTab,
  tabKeyLabel,
  tabKeyOptions,
  type Settings,
} from '../lib/settings';

export function SettingsPage({
  settings,
  onChange,
  saveError,
}: {
  settings: Settings;
  onChange: (settings: Settings) => void;
  saveError: boolean;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Settings</h1>
          <p>
            Preferences for every drill. Changes save automatically in this
            browser.
          </p>
        </div>
      </div>
      <div className="settings-page">
        {saveError && (
          <p className="storage-notice" role="status">
            Settings work for this visit, but could not be saved in this
            browser.
          </p>
        )}
        <section aria-labelledby="settings-tabs-title">
          <div>
            <h2 id="settings-tabs-title">Tab keybinds</h2>
            <p>
              Match your OSRS controls. Keys open Inventory or Prayers; items
              and prayers still need a click.
            </p>
          </div>
          <div className="settings-fields">
            {(['inventory', 'prayers'] as const).map((tab) => (
              <label key={tab}>
                {tab === 'inventory' ? 'Inventory key' : 'Prayer tab key'}
                <select
                  aria-label={
                    tab === 'inventory' ? 'Inventory key' : 'Prayer tab key'
                  }
                  value={settings.tabKeys[tab]}
                  onChange={(e) =>
                    onChange(rebindTab(settings, tab, e.target.value))
                  }
                >
                  {tabKeyOptions.map((key) => (
                    <option key={key} value={key}>
                      {tabKeyLabel(key)}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <p className="setting-help">
              Defaults: Esc for Inventory, F1 for Prayers. Choosing an assigned
              key swaps the two bindings.
            </p>
          </div>
        </section>
        <section aria-labelledby="settings-practice-title">
          <div>
            <h2 id="settings-practice-title">Practice mode</h2>
            <p>
              Choose how a drill opens. You can still change mode before
              starting each run.
            </p>
          </div>
          <div className="settings-fields">
            <label>
              Default practice mode
              <select
                aria-label="Default practice mode"
                value={settings.defaultMode}
                onChange={(e) =>
                  onChange({
                    ...settings,
                    defaultMode: e.target.value as Settings['defaultMode'],
                  })
                }
              >
                <option value="guided">Guided practice</option>
                <option value="challenge">Challenge</option>
              </select>
            </label>
            <p className="setting-help">
              Guided practice shows prayer hints. Challenge hides them and
              awards passes at 90% or more. Both use 0.6-second ticks.
            </p>
          </div>
        </section>
        <section aria-labelledby="settings-prayer-sound-title">
          <div>
            <h2 id="settings-prayer-sound-title">Prayer sounds</h2>
            <p>
              The game's protection-prayer activation and deactivation sounds.
            </p>
          </div>
          <div className="settings-fields">
            <label className="settings-check">
              <input
                type="checkbox"
                checked={settings.prayerSound}
                onChange={(e) =>
                  onChange({ ...settings, prayerSound: e.target.checked })
                }
              />
              Enable prayer sounds
            </label>
            <label>
              Prayer sound volume
              <div className="settings-volume">
                <input
                  type="range"
                  aria-label="Prayer sound volume"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.prayerVolume}
                  onChange={(e) =>
                    onChange({
                      ...settings,
                      prayerVolume: Number(e.target.value),
                    })
                  }
                  aria-valuetext={`${settings.prayerVolume}%`}
                />
                <output>{settings.prayerVolume}%</output>
              </div>
            </label>
            <p className="setting-help">
              Plays when you click a prayer. Switching tabs is silent. Tick
              sound has its own controls below.
            </p>
          </div>
        </section>
        <section aria-labelledby="settings-sound-title">
          <div>
            <h2 id="settings-sound-title">Tick sound</h2>
            <p>A short sound on each game tick, including the count-in.</p>
          </div>
          <div className="settings-fields">
            <label className="settings-check">
              <input
                type="checkbox"
                checked={settings.tickSound}
                onChange={(e) =>
                  onChange({ ...settings, tickSound: e.target.checked })
                }
              />
              Enable tick sound
            </label>
            <label>
              Tick sound volume
              <div className="settings-volume">
                <input
                  type="range"
                  aria-label="Tick sound volume"
                  min="0"
                  max="100"
                  step="5"
                  value={settings.volume}
                  onChange={(e) =>
                    onChange({ ...settings, volume: Number(e.target.value) })
                  }
                  aria-valuetext={`${settings.volume}%`}
                />
                <output>{settings.volume}%</output>
              </div>
            </label>
            <p className="setting-help">
              Sound starts when you begin a run. The visual tick bar remains
              available with sound off.
            </p>
          </div>
        </section>
        <div className="settings-reset">
          <button
            className="button secondary"
            onClick={() => onChange(defaultSettings)}
          >
            Restore default settings
          </button>
          <p>Your scores and lesson answers are kept.</p>
        </div>
      </div>
    </>
  );
}
