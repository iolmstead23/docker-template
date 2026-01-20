'use client';

import { usePreferencesStore } from '@/stores/preferences-store';
import { useEventsStore } from '@/stores/events-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useStoreHydration } from './StateProvider';

/**
 * Example component demonstrating how to use Zustand stores with JSON persistence.
 *
 * Features:
 * - Zustand state management for reactive UI updates
 * - Automatic sync with backend JSON files via API
 * - Hydration awareness to prevent flash of incorrect content
 */
export function ExampleStateUsage() {
  // Check if stores are hydrated (loaded from backend)
  const { isHydrated } = useStoreHydration();

  // Access state and actions from preferences store
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);
  const notifications = usePreferencesStore((state) => state.notifications);
  const updateNotifications = usePreferencesStore((state) => state.updateNotifications);

  // Access state and actions from events store
  const events = useEventsStore((state) => state.events);
  const addEvent = useEventsStore((state) => state.addEvent);

  // Access state and actions from settings store
  const features = useSettingsStore((state) => state.features);
  const toggleFeature = useSettingsStore((state) => state.toggleFeature);

  // Show loading state while hydrating
  if (!isHydrated) {
    return <div>Loading state...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h2 className="text-2xl font-bold">State Management Example</h2>

      {/* Preferences Example */}
      <section className="border p-4 rounded">
        <h3 className="text-xl font-semibold mb-4">User Preferences</h3>

        <div className="space-y-2">
          <div>
            <label className="block font-medium">Theme: {theme}</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as any)}
              className="mt-1 block w-full rounded border-gray-300"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={notifications.enabled}
                onChange={(e) =>
                  updateNotifications({ enabled: e.target.checked })
                }
                className="mr-2"
              />
              Enable Notifications
            </label>
          </div>
        </div>
      </section>

      {/* Events Example */}
      <section className="border p-4 rounded">
        <h3 className="text-xl font-semibold mb-4">Events</h3>

        <button
          onClick={() =>
            addEvent({
              type: 'user_action',
              severity: 'info',
              message: 'Button clicked at ' + new Date().toLocaleTimeString(),
            })
          }
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Event
        </button>

        <div className="mt-4 space-y-2">
          <p className="font-medium">Recent Events ({events.length}):</p>
          {events.slice(0, 5).map((event) => (
            <div key={event.id} className="text-sm bg-gray-50 p-2 rounded">
              <span className="font-semibold">[{event.severity}]</span>{' '}
              {event.message}
            </div>
          ))}
        </div>
      </section>

      {/* Settings Example */}
      <section className="border p-4 rounded">
        <h3 className="text-xl font-semibold mb-4">Application Settings</h3>

        <div className="space-y-2">
          {Object.entries(features).map(([feature, enabled]) => (
            <label key={feature} className="flex items-center">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => toggleFeature(feature, e.target.checked)}
                className="mr-2"
              />
              {feature}
            </label>
          ))}
        </div>
      </section>

      <section className="border p-4 rounded bg-blue-50">
        <h3 className="text-xl font-semibold mb-2">How It Works</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li>Changes are automatically saved to backend JSON files via API</li>
          <li>State persists across page reloads and container restarts</li>
          <li>JSON files are stored in ./appdata directory for easy access</li>
          <li>Zustand provides reactive updates to all components</li>
          <li>Custom storage adapter keeps Zustand and JSON in sync</li>
        </ul>
      </section>
    </div>
  );
}
