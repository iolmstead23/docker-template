'use client';

import { useState } from 'react';
import SettingsHeader from './components/SettingsHeader';
import SettingsBody from './components/SettingsBody';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('theme');

  return (
    <div className="lg:pl-72">
      <SettingsHeader activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="py-10">
        <div className="px-4 sm:px-6 lg:px-8">
          <SettingsBody activeTab={activeTab} />
        </div>
      </main>
    </div>
  );
}
