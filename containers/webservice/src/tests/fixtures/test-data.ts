import { UserPreferences, ApplicationSettings, EventHistoryItem } from '@/lib/state-types';

// Mock preferences for testing
export const mockPreferences: UserPreferences = {
  theme: 'dark',
  language: 'en',
  notifications: {
    enabled: true,
    email: true,
    browser: false,
  },
  dashboard: {
    layout: 'compact',
    widgets: ['status', 'events'],
  },
  privacy: {
    analytics: false,
    telemetry: false,
  },
};

// Mock settings for testing
export const mockSettings: ApplicationSettings = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  features: {
    darkMode: true,
    notifications: false,
    telemetry: false,
  },
  limits: {
    maxUploadSize: 5242880, // 5MB
    maxConcurrentRequests: 5,
    sessionTimeout: 1800000, // 30min
  },
};

// Mock event for testing
export const mockEvent: EventHistoryItem = {
  id: 'evt_123',
  timestamp: new Date().toISOString(),
  type: 'user_action',
  severity: 'info',
  message: 'User logged in',
  metadata: {
    userId: 'user_456',
    ipAddress: '192.168.1.1',
  },
};

// Helper to generate test events
export function generateMockEvents(count: number): EventHistoryItem[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `evt_${i}`,
    timestamp: new Date(Date.now() - i * 1000).toISOString(),
    type: 'test_event',
    severity: (['info', 'warning', 'error', 'critical'] as const)[i % 4],
    message: `Test event ${i}`,
  }));
}
