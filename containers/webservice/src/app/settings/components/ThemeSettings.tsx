'use client';

import { RadioGroup, Label, Description } from '@headlessui/react';
import { usePreferencesStore } from '@/stores/preferences-store';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

const themeOptions = [
  {
    value: 'light' as const,
    label: 'Light',
    description: 'Always use light theme',
    icon: SunIcon,
  },
  {
    value: 'dark' as const,
    label: 'Dark',
    description: 'Always use dark theme',
    icon: MoonIcon,
  },
  {
    value: 'auto' as const,
    label: 'Auto',
    description: 'Match system preference',
    icon: ComputerDesktopIcon,
  },
];

export default function ThemeSettings() {
  const theme = usePreferencesStore((state) => state.theme);
  const setTheme = usePreferencesStore((state) => state.setTheme);

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Theme Appearance</h3>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Choose how the interface looks, or sync with your system preferences
        </p>
      </div>

      <RadioGroup value={theme} onChange={handleThemeChange}>
        <Label className="sr-only">Theme preference</Label>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {themeOptions.map((option) => (
            <RadioGroup.Option
              key={option.value}
              value={option.value}
              className={({ checked }) =>
                `relative flex cursor-pointer rounded-lg border ${
                  checked
                    ? 'border-indigo-600 dark:border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                    : 'border-gray-200 dark:border-white/10 bg-white dark:bg-gray-800/50'
                } p-4 shadow-sm dark:shadow-none focus:outline-none`
              }
            >
              {({ checked }) => (
                <div className="flex flex-col items-center justify-center w-full">
                  <option.icon
                    className={`h-8 w-8 ${
                      checked
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                  />
                  <Label
                    as="span"
                    className="mt-2 block text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {option.label}
                  </Label>
                  <Description
                    as="span"
                    className="mt-1 text-xs text-center text-gray-500 dark:text-gray-400"
                  >
                    {option.description}
                  </Description>
                </div>
              )}
            </RadioGroup.Option>
          ))}
        </div>
      </RadioGroup>
    </div>
  );
}
