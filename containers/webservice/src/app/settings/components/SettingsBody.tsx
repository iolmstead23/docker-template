'use client';

import ThemeSettings from './ThemeSettings';

interface SettingsBodyProps {
  activeTab: string;
}

export default function SettingsBody({ activeTab }: SettingsBodyProps) {
  return (
    <div className="overflow-hidden rounded-lg bg-white dark:bg-gray-800/50 shadow-sm dark:shadow-none border border-gray-200 dark:border-white/10">
      <div className="px-4 py-6 sm:p-6">
        {activeTab === 'theme' && <ThemeSettings />}

        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Notifications</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Manage how you receive notifications
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Notification settings coming soon...
            </p>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Privacy</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Control your privacy and data sharing preferences
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Privacy settings coming soon...
            </p>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Dashboard</h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Customize your dashboard layout and widgets
              </p>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Dashboard settings coming soon...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
