'use client';

import { useEffect } from 'react';
import { usePreferencesStore } from '@/stores/preferences-store';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * ThemeProvider applies the theme class to the html element based on user preferences.
 * This enables Tailwind's dark mode classes to work correctly.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  // Subscribe to theme preference from Zustand store
  const theme = usePreferencesStore((state) => state.theme);
  // Wait for Zustand store hydration to avoid SSR/client mismatch
  const hasHydrated = usePreferencesStore((state) => state._hasHydrated);

  useEffect(() => {
    // Skip theme application until store is hydrated (prevents flash of wrong theme)
    if (!hasHydrated) return;

    const root = document.documentElement;

    // Define window extension type for storing theme listener reference
    interface WindowWithThemeListener extends Window {
      __themeMediaQueryListener?: (e: MediaQueryListEvent | MediaQueryList) => void;
    }

    // Clean up any previous listener before applying new theme (prevents memory leaks)
    const existingListener = (window as WindowWithThemeListener).__themeMediaQueryListener;
    if (existingListener) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', existingListener);
      delete (window as WindowWithThemeListener).__themeMediaQueryListener;
    }

    if (theme === 'dark') {
      // Dark mode: add 'dark' class to enable Tailwind dark: variants
      root.classList.add('dark');
    } else if (theme === 'light') {
      // Light mode: remove 'dark' class to disable Tailwind dark: variants
      root.classList.remove('dark');
    } else if (theme === 'auto') {
      // Auto mode: dynamically follow system color scheme preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      // Handler updates theme when system preference changes
      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      // Apply initial theme based on current system preference
      updateTheme(mediaQuery);
      // Listen for system preference changes (e.g., user switches OS theme)
      mediaQuery.addEventListener('change', updateTheme);

      // Store listener on window for cleanup in next effect run
      (window as WindowWithThemeListener).__themeMediaQueryListener = updateTheme;

      // Cleanup function removes listener when theme changes or component unmounts
      return () => {
        mediaQuery.removeEventListener('change', updateTheme);
        delete (window as WindowWithThemeListener).__themeMediaQueryListener;
      };
    }
  }, [theme, hasHydrated]);

  return <>{children}</>;
}