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
  const theme = usePreferencesStore((state) => state.theme);
  const hasHydrated = usePreferencesStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!hasHydrated) return;

    const root = document.documentElement;

    // First, always remove any existing event listeners
    const existingListener = (window as any).__themeMediaQueryListener;
    if (existingListener) {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', existingListener);
      delete (window as any).__themeMediaQueryListener;
    }

    if (theme === 'dark') {
      root.classList.add('dark');
    } else if (theme === 'light') {
      root.classList.remove('dark');
    } else if (theme === 'auto') {
      // Auto mode: follow system preference
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const updateTheme = (e: MediaQueryListEvent | MediaQueryList) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      updateTheme(mediaQuery);
      mediaQuery.addEventListener('change', updateTheme);

      // Store listener reference for cleanup
      (window as any).__themeMediaQueryListener = updateTheme;

      return () => {
        mediaQuery.removeEventListener('change', updateTheme);
        delete (window as any).__themeMediaQueryListener;
      };
    }
  }, [theme, hasHydrated]);

  return <>{children}</>;
}