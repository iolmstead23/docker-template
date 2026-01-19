import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { createApiStorage } from '@/lib/api-storage';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/lib/state-types';

interface PreferencesState extends UserPreferences {
  // Actions
  setTheme: (theme: UserPreferences['theme']) => void;
  setLanguage: (language: string) => void;
  updateNotifications: (notifications: Partial<UserPreferences['notifications']>) => void;
  updateDashboard: (dashboard: Partial<UserPreferences['dashboard']>) => void;
  updatePrivacy: (privacy: Partial<UserPreferences['privacy']>) => void;
  reset: () => void;

  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (hasHydrated: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      // Initial state from defaults
      ...DEFAULT_USER_PREFERENCES,

      // Hydration state
      _hasHydrated: false,
      setHasHydrated: (hasHydrated) => set({ _hasHydrated: hasHydrated }),

      // Actions
      setTheme: (theme) => set({ theme }),

      setLanguage: (language) => set({ language }),

      updateNotifications: (notifications) =>
        set((state) => ({
          notifications: { ...state.notifications, ...notifications },
        })),

      updateDashboard: (dashboard) =>
        set((state) => ({
          dashboard: { ...state.dashboard, ...dashboard },
        })),

      updatePrivacy: (privacy) =>
        set((state) => ({
          privacy: { ...state.privacy, ...privacy },
        })),

      reset: () => set({ ...DEFAULT_USER_PREFERENCES }),
    }),
    {
      name: 'user-preferences',
      storage: createJSONStorage(() =>
        createApiStorage({
          apiEndpoint: '/api/state/preferences',
          onError: (error) => {
            console.error('Preferences sync error:', error);
          },
        })
      ),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      // Partial persist - only persist the state data, not the actions
      partialize: (state) => ({
        theme: state.theme,
        language: state.language,
        notifications: state.notifications,
        dashboard: state.dashboard,
        privacy: state.privacy,
      }),
    }
  )
);