# State Management with Zustand + JSON Persistence

This webservice uses Zustand for client-side state management with automatic synchronization to persistent JSON files on the backend.

## Architecture Overview

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  React Components│ ───▶ │  Zustand Stores  │ ───▶ │   API Storage   │
│                 │      │  (Client-Side)   │      │   Adapter       │
└─────────────────┘      └──────────────────┘      └─────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │  Next.js API    │
                                                    │  Routes         │
                                                    └─────────────────┘
                                                             │
                                                             ▼
                                                    ┌─────────────────┐
                                                    │  JSON Files     │
                                                    │  (./state/*.json)│
                                                    └─────────────────┘
```

## Features

- ✅ **Reactive State Management**: Zustand provides fast, reactive state updates
- ✅ **Persistent Storage**: State is saved to JSON files in `./state/` directory
- ✅ **Automatic Sync**: Changes automatically sync between Zustand and JSON files
- ✅ **Container Restart Safe**: State survives container restarts via volume mount
- ✅ **Type-Safe**: Full TypeScript support with defined interfaces
- ✅ **Hydration Aware**: Prevents flash of incorrect content during load

## File Structure

```
src/
├── lib/
│   ├── state.ts              # Backend state manager (server-side)
│   ├── state-types.ts        # TypeScript interfaces and defaults
│   └── api-storage.ts        # Custom Zustand storage adapter
├── stores/
│   ├── preferences-store.ts  # User preferences Zustand store
│   ├── events-store.ts       # Event history Zustand store
│   └── settings-store.ts     # Application settings Zustand store
├── app/
│   ├── api/state/
│   │   ├── preferences/route.ts  # API endpoint for preferences
│   │   ├── events/route.ts       # API endpoint for events
│   │   ├── settings/route.ts     # API endpoint for settings
│   │   └── route.ts              # List all state files
│   ├── components/
│   │   ├── StateProvider.tsx     # Global state initialization
│   │   └── ExampleStateUsage.tsx # Usage example
│   └── layout.tsx            # Root layout with StateProvider
└── state/                    # JSON files stored here (volume mount)
    ├── user-preferences.json
    ├── event-history.json
    └── application-settings.json
```

## Available Stores

### 1. Preferences Store

Manages user preferences like theme, language, notifications, etc.

**File**: `user-preferences.json`

**Usage**:
```typescript
import { usePreferencesStore } from '@/stores/preferences-store';

function MyComponent() {
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);

  return (
    <button onClick={() => setTheme('dark')}>
      Set Dark Theme (current: {theme})
    </button>
  );
}
```

**Available Actions**:
- `setTheme(theme)` - Set theme (light/dark/auto)
- `setLanguage(language)` - Set language
- `updateNotifications(notifications)` - Update notification settings
- `updateDashboard(dashboard)` - Update dashboard layout
- `updatePrivacy(privacy)` - Update privacy settings
- `reset()` - Reset to defaults

### 2. Events Store

Manages event history with automatic pagination.

**File**: `event-history.json`

**Usage**:
```typescript
import { useEventsStore } from '@/stores/events-store';

function MyComponent() {
  const events = useEventsStore((state) => state.events);
  const addEvent = useEventsStore((state) => state.addEvent);

  const handleAction = async () => {
    await addEvent({
      type: 'user_action',
      severity: 'info',
      message: 'User clicked button',
      metadata: { buttonId: 'submit' }
    });
  };

  return (
    <div>
      {events.map(event => (
        <div key={event.id}>{event.message}</div>
      ))}
    </div>
  );
}
```

**Available Actions**:
- `addEvent(event)` - Add new event (async, syncs with backend)
- `clearEvents()` - Clear all events
- `setMaxEvents(max)` - Set maximum event count

### 3. Settings Store

Manages application-level settings.

**File**: `application-settings.json`

**Usage**:
```typescript
import { useSettingsStore } from '@/stores/settings-store';

function MyComponent() {
  const features = useSettingsStore((state) => state.features);
  const toggleFeature = useSettingsStore((state) => state.toggleFeature);

  return (
    <label>
      <input
        type="checkbox"
        checked={features.darkMode}
        onChange={(e) => toggleFeature('darkMode', e.target.checked)}
      />
      Enable Dark Mode
    </label>
  );
}
```

**Available Actions**:
- `updateVersion(version)` - Update app version
- `toggleFeature(feature, enabled)` - Toggle feature flag
- `updateLimits(limits)` - Update resource limits
- `reset()` - Reset to defaults

## Hydration Awareness

Always check if stores are hydrated before rendering content that depends on persisted state:

```typescript
import { useStoreHydration } from '@/app/components/StateProvider';

function MyComponent() {
  const { isHydrated } = useStoreHydration();

  if (!isHydrated) {
    return <div>Loading...</div>;
  }

  // Safe to use store values now
  return <div>Content</div>;
}
```

## How Synchronization Works

1. **On App Load**:
   - `StateProvider` calls `persist.rehydrate()` for each store
   - Custom storage adapter fetches data from API endpoints
   - API endpoints read from JSON files in `./state/` directory
   - Zustand stores are populated with data

2. **On State Change**:
   - User updates state via action (e.g., `setTheme('dark')`)
   - Zustand updates its internal state immediately (reactive)
   - Persist middleware triggers `setItem` on custom storage adapter
   - Storage adapter sends PUT request to API endpoint
   - API endpoint updates JSON file in `./state/` directory

3. **On Container Restart**:
   - JSON files persist in mounted `./state/` volume
   - Next container start follows "On App Load" flow
   - State is restored from JSON files

## Adding New State

To add a new state type:

1. **Define the interface** in `src/lib/state-types.ts`:
```typescript
export interface MyCustomState extends StateFile {
  myField: string;
  myNumber: number;
}

export const DEFAULT_MY_CUSTOM_STATE: MyCustomState = {
  myField: 'default',
  myNumber: 0,
};
```

2. **Create API endpoint** at `src/app/api/state/my-custom/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createStateManager } from '@/lib/state';
import { MyCustomState, DEFAULT_MY_CUSTOM_STATE } from '@/lib/state-types';

const stateManager = createStateManager('my-custom');

export async function GET() {
  const data = await stateManager.readOrInit<MyCustomState>(DEFAULT_MY_CUSTOM_STATE);
  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const updates = await request.json();
  const data = await stateManager.update<MyCustomState>(updates);
  return NextResponse.json(data);
}
```

3. **Create Zustand store** at `src/stores/my-custom-store.ts`:
```typescript
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createApiStorage } from '@/lib/api-storage';
import { MyCustomState, DEFAULT_MY_CUSTOM_STATE } from '@/lib/state-types';

interface MyCustomStore extends MyCustomState {
  updateMyField: (value: string) => void;
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useMyCustomStore = create<MyCustomStore>()(
  persist(
    (set) => ({
      ...DEFAULT_MY_CUSTOM_STATE,
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),
      updateMyField: (value) => set({ myField: value }),
    }),
    {
      name: 'my-custom',
      storage: createJSONStorage(() =>
        createApiStorage({
          apiEndpoint: '/api/state/my-custom',
          onError: (error) => console.error('My custom sync error:', error),
        })
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        myField: state.myField,
        myNumber: state.myNumber,
      }),
    }
  )
);
```

4. **Add to StateProvider** in `src/app/components/StateProvider.tsx`:
```typescript
import { useMyCustomStore } from '@/stores/my-custom-store';

// In the initializeState function:
await useMyCustomStore.persist.rehydrate();

// In useStoreHydration:
const myCustomHydrated = useMyCustomStore((state) => state._hasHydrated);
```

## API Endpoints

All state endpoints follow RESTful conventions:

- `GET /api/state/preferences` - Get user preferences
- `PUT /api/state/preferences` - Update user preferences
- `DELETE /api/state/preferences` - Reset to defaults

- `GET /api/state/events` - Get event history
- `POST /api/state/events` - Add new event
- `DELETE /api/state/events` - Clear event history

- `GET /api/state/settings` - Get application settings
- `PUT /api/state/settings` - Update application settings
- `DELETE /api/state/settings` - Reset to defaults

- `GET /api/state` - List all state files

## Troubleshooting

### State not persisting
- Check if `./state/` directory exists and has write permissions
- Verify container volume mount in `docker-compose.yml`
- Check API endpoint responses in browser DevTools Network tab

### State not loading on refresh
- Ensure `StateProvider` wraps your app in `layout.tsx`
- Check browser console for hydration errors
- Verify API endpoints return valid JSON

### State conflicts between tabs
- This is expected behavior - last write wins
- Consider implementing optimistic locking if needed

## References

- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Zustand Persist Middleware](https://zustand.docs.pmnd.rs/middlewares/persist)
- [Persisting Store Data](https://zustand.docs.pmnd.rs/integrations/persisting-store-data)
