import { StateFile } from './state';

export interface UserPreferences extends StateFile {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: {
    enabled: boolean;
    email: boolean;
    browser: boolean;
  };
  dashboard: {
    layout: string;
    widgets: string[];
  };
  privacy: {
    analytics: boolean;
    telemetry: boolean;
  };
}

export interface EventHistoryItem {
  id: string;
  timestamp: string;
  type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  metadata?: Record<string, unknown>;
}

export interface EventHistory extends StateFile {
  events: EventHistoryItem[];
  maxEvents: number;
}

export interface ApplicationSettings extends StateFile {
  version: string;
  lastUpdated: string;
  features: {
    [key: string]: boolean;
  };
  limits: {
    maxUploadSize: number;
    maxConcurrentRequests: number;
    sessionTimeout: number;
  };
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  theme: 'auto',
  language: 'en',
  notifications: {
    enabled: true,
    email: false,
    browser: true,
  },
  dashboard: {
    layout: 'default',
    widgets: ['status', 'telemetry', 'events'],
  },
  privacy: {
    analytics: false,
    telemetry: true,
  },
};

export const DEFAULT_EVENT_HISTORY: EventHistory = {
  events: [],
  maxEvents: 1000,
};

export const DEFAULT_APPLICATION_SETTINGS: ApplicationSettings = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  features: {
    darkMode: true,
    notifications: true,
    telemetry: true,
  },
  limits: {
    maxUploadSize: 10485760, // 10MB
    maxConcurrentRequests: 10,
    sessionTimeout: 3600000, // 1 hour
  },
};
