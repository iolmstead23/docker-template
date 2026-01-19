'use client';

import { useEffect, useState } from 'react';
import { usePreferencesStore } from '@/stores/preferences-store';
import { useEventsStore } from '@/stores/events-store';
import { useSettingsStore } from '@/stores/settings-store';

interface StateProviderProps {
  children: React.ReactNode;
}

/**
 * StateProvider component that initializes and syncs Zustand stores with backend JSON files.
 * Uses useEffect to rehydrate state on mount and keep stores in sync.
 */
export function StateProvider({ children }: StateProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  const preferencesHydrated = usePreferencesStore((state) => state._hasHydrated);
  const eventsHydrated = useEventsStore((state) => state._hasHydrated);
  const settingsHydrated = useSettingsStore((state) => state._hasHydrated);

  useEffect(() => {
    // Initialize state from backend if needed
    const initializeState = async () => {
      try {
        // Trigger rehydration for all stores
        await Promise.all([
          usePreferencesStore.persist.rehydrate(),
          useEventsStore.persist.rehydrate(),
          useSettingsStore.persist.rehydrate(),
        ]);

        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing state:', error);
        // Still mark as initialized to allow app to render
        setIsInitialized(true);
      }
    };

    initializeState();
  }, []);

  useEffect(() => {
    // Log hydration status
    if (preferencesHydrated && eventsHydrated && settingsHydrated) {
      console.log('All stores hydrated successfully');
    }
  }, [preferencesHydrated, eventsHydrated, settingsHydrated]);

  // Optional: Show loading state while hydrating
  // Uncomment if you want to prevent rendering until state is loaded
  // if (!isInitialized || !preferencesHydrated || !eventsHydrated || !settingsHydrated) {
  //   return <div>Loading state...</div>;
  // }

  return <>{children}</>;
}

/**
 * Hook to check if all stores are hydrated
 */
export function useStoreHydration() {
  const preferencesHydrated = usePreferencesStore((state) => state._hasHydrated);
  const eventsHydrated = useEventsStore((state) => state._hasHydrated);
  const settingsHydrated = useSettingsStore((state) => state._hasHydrated);

  return {
    isHydrated: preferencesHydrated && eventsHydrated && settingsHydrated,
    preferencesHydrated,
    eventsHydrated,
    settingsHydrated,
  };
}
