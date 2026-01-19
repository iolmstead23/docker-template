import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createApiStorage } from '@/lib/api-storage';
import { EventHistory, EventHistoryItem, DEFAULT_EVENT_HISTORY } from '@/lib/state-types';

interface EventsState extends EventHistory {
  // Actions
  addEvent: (event: Omit<EventHistoryItem, 'id' | 'timestamp'>) => Promise<void>;
  clearEvents: () => void;
  setMaxEvents: (maxEvents: number) => void;

  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useEventsStore = create<EventsState>()(
  persist(
    (set) => ({
      // Initial state from defaults
      ...DEFAULT_EVENT_HISTORY,

      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),

      // Actions
      addEvent: async (event) => {
        try {
          const response = await fetch('/api/state/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(event),
          });

          if (!response.ok) {
            throw new Error('Failed to add event');
          }

          const newEvent = await response.json();

          set((state) => {
            const events = [newEvent, ...state.events];
            if (events.length > state.maxEvents) {
              events.splice(state.maxEvents);
            }
            return { events };
          });
        } catch (error) {
          console.error('Error adding event:', error);
        }
      },

      clearEvents: () => set({ events: [] }),

      setMaxEvents: (maxEvents) => set({ maxEvents }),
    }),
    {
      name: 'event-history',
      storage: createJSONStorage(() =>
        createApiStorage({
          apiEndpoint: '/api/state/events',
          onError: (error) => {
            console.error('Events sync error:', error);
          },
        })
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        events: state.events,
        maxEvents: state.maxEvents,
      }),
    }
  )
);
