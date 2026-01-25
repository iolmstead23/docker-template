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
      updateVersion: (version) => {
        // Ensure version is a string
        const versionStr = String(version);
        set({
          version: versionStr,
          lastUpdated: new Date().toISOString(),
        });
      },

      toggleFeature: (feature, enabled) =>
        set((state) => ({
          features: { ...state.features, [String(feature)]: Boolean(enabled) },
          lastUpdated: new Date().toISOString(),
        })),

      updateLimits: (limits) =>
        set((state) => ({
          limits: {
            ...state.limits,
            ...(limits.maxUploadSize !== undefined ? { maxUploadSize: Number(limits.maxUploadSize) } : {}),
            ...(limits.maxConcurrentRequests !== undefined ? { maxConcurrentRequests: Number(limits.maxConcurrentRequests) } : {}),
            ...(limits.sessionTimeout !== undefined ? { sessionTimeout: Number(limits.sessionTimeout) } : {}),
          },
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
      partialize: (state) => {
        // Only include fields that should be persisted to API
        // Explicitly exclude lastUpdated (auto-generated server-side)
        // Ensure proper types before sending
        const partialized: Partial<ApplicationSettings> = {
          version: String(state.version),
          features: Object.fromEntries(
            Object.entries(state.features).map(([k, v]) => [String(k), Boolean(v)])
          ),
          limits: {
            maxUploadSize: Number(state.limits.maxUploadSize),
            maxConcurrentRequests: Number(state.limits.maxConcurrentRequests),
            sessionTimeout: Number(state.limits.sessionTimeout),
          },
        };
        return partialized;
      },
    }
  )
);
