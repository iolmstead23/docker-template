'use client';

import { ChevronDownIcon } from "@heroicons/react/16/solid";

const tabs = [
  { id: "theme", name: "Theme" },
  { id: "notifications", name: "Notifications" },
  { id: "privacy", name: "Privacy" },
  { id: "dashboard", name: "Dashboard" },
];

function classNames(...classes: unknown[]) {
  return classes.filter(Boolean).join(" ");
}

interface SettingsHeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function SettingsHeader({ activeTab, setActiveTab }: SettingsHeaderProps) {
  return (
    <div className="border-b border-gray-200 pb-5 sm:pb-0 dark:border-white/10 px-4 py-6 sm:px-6">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        Settings
      </h3>
      <div className="mt-3 sm:mt-4">
        <div className="grid grid-cols-1 sm:hidden">
          {/* Mobile select dropdown */}
          <select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            aria-label="Select a setting"
            className="col-start-1 row-start-1 w-full appearance-none rounded-md bg-white py-2 pr-8 pl-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:*:bg-gray-800 dark:focus:outline-white"
          >
            {tabs.map((tab) => (
              <option key={tab.id} value={tab.id}>
                {tab.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon
            aria-hidden="true"
            className="pointer-events-none col-start-1 row-start-1 mr-2 size-5 self-center justify-self-end fill-gray-500 dark:fill-gray-400"
          />
        </div>
        <div className="hidden sm:block">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={classNames(
                  activeTab === tab.id
                    ? "border-indigo-500 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-white/20 dark:hover:text-white",
                  "border-b-2 px-1 pb-4 text-sm font-medium whitespace-nowrap",
                )}
              >
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  );
}
