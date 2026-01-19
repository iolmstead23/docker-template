import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createApiStorage } from '@/lib/api-storage';
import { ApplicationSettings, DEFAULT_APPLICATION_SETTINGS } from '@/lib/state-types';

interface SettingsState extends ApplicationSettings {
  // Actions
  updateVersion: (version: string) => void;
  toggleFeature: (feature: string, enabled: boolean) => void;
  updateLimits: (limits: Partial<ApplicationSettings['limits']>) => void;
  reset: () => void;

  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Initial state from defaults
      ...DEFAULT_APPLICATION_SETTINGS,

      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),

      // Actions
      updateVersion: (version) =>
        set({
          version,
          lastUpdated: new Date().toISOString(),
        }),

      toggleFeature: (feature, enabled) =>
        set((state) => ({
          features: { ...state.features, [feature]: enabled },
          lastUpdated: new Date().toISOString(),
        })),

      updateLimits: (limits) =>
        set((state) => ({
          limits: { ...state.limits, ...limits },
          lastUpdated: new Date().toISOString(),
        })),

      reset: () => set({ ...DEFAULT_APPLICATION_SETTINGS }),
    }),
    {
      name: 'application-settings',
      storage: createJSONStorage(() =>
        createApiStorage({
          apiEndpoint: '/api/state/settings',
          onError: (error) => {
            console.error('Settings sync error:', error);
          },
        })
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state) => ({
        version: state.version,
        lastUpdated: state.lastUpdated,
        features: state.features,
        limits: state.limits,
      }),
    }
  )
);
