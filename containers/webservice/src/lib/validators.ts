import { z } from 'zod';
import type { UserPreferences, ApplicationSettings, EventHistory } from './state-types';

// Custom error types for better error handling
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly value: unknown,
    public readonly zodError?: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class StateError extends Error {
  constructor(
    message: string,
    public readonly operation: 'read' | 'write' | 'delete' | 'update',
    public readonly filePath: string
  ) {
    super(message);
    this.name = 'StateError';
  }
}

// Zod schema for UserPreferences
export const UserPreferencesSchema = z.object({
  theme: z.enum(['light', 'dark', 'auto'], { message: 'Theme must be light, dark, or auto' }),
  language: z.string().min(2).max(10),
  notifications: z.object({
    enabled: z.boolean(),
    email: z.boolean(),
    browser: z.boolean(),
  }),
  dashboard: z.object({
    layout: z.string(),
    widgets: z.array(z.string()),
  }),
  privacy: z.object({
    analytics: z.boolean(),
    telemetry: z.boolean(),
  }),
});

// Partial schema for PUT requests (all fields optional)
export const UserPreferencesUpdateSchema = UserPreferencesSchema.partial();

// Zod schema for EventHistoryItem
export const EventHistoryItemSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.string(),
  type: z.string().min(1),
  severity: z.enum(['info', 'warning', 'error', 'critical']),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Zod schema for EventHistory
export const EventHistorySchema = z.object({
  events: z.array(EventHistoryItemSchema),
  maxEvents: z.number().int().positive().max(10000),
});

// Partial schema for PUT requests
export const EventHistoryUpdateSchema = EventHistorySchema.partial();

// Schema for POST event creation (without id and timestamp - generated server-side)
export const EventCreateSchema = z.object({
  type: z.string().min(1),
  severity: z.enum(['info', 'warning', 'error', 'critical']).default('info'),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// Zod schema for ApplicationSettings
export const ApplicationSettingsSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/, { message: 'Version must follow semver format (e.g., 1.0.0)' }),
  lastUpdated: z.string(),
  features: z.record(z.string(), z.boolean()),
  limits: z.object({
    maxUploadSize: z.number().int().positive().max(104857600), // Max 100MB
    maxConcurrentRequests: z.number().int().positive().max(100),
    sessionTimeout: z.number().int().positive().max(86400000), // Max 24 hours
  }),
});

// Partial schema for PUT requests
export const ApplicationSettingsUpdateSchema = ApplicationSettingsSchema.partial().extend({
  // lastUpdated is auto-generated, so exclude from user input
  lastUpdated: z.never().optional(),
});

// Validator functions with better error messages
export function validateUserPreferences(data: unknown): UserPreferences {
  try {
    return UserPreferencesSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Invalid user preferences: ${firstError.message}`,
        firstError.path.join('.'),
        data,
        error
      );
    }
    throw error;
  }
}

export function validateUserPreferencesUpdate(data: unknown): Partial<UserPreferences> {
  try {
    return UserPreferencesUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Invalid user preferences update: ${firstError.message}`,
        firstError.path.join('.'),
        data,
        error
      );
    }
    throw error;
  }
}

export function validateEventHistory(data: unknown): EventHistory {
  try {
    return EventHistorySchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Invalid event history: ${firstError.message}`,
        firstError.path.join('.'),
        data,
        error
      );
    }
    throw error;
  }
}

export function validateEventHistoryUpdate(data: unknown): Partial<EventHistory> {
  try {
    return EventHistoryUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Invalid event history update: ${firstError.message}`,
        firstError.path.join('.'),
        data,
        error
      );
    }
    throw error;
  }
}

export function validateEventCreate(data: unknown): z.infer<typeof EventCreateSchema> {
  try {
    return EventCreateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Invalid event data: ${firstError.message}`,
        firstError.path.join('.'),
        data,
        error
      );
    }
    throw error;
  }
}

export function validateApplicationSettings(data: unknown): ApplicationSettings {
  try {
    return ApplicationSettingsSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Invalid application settings: ${firstError.message}`,
        firstError.path.join('.'),
        data,
        error
      );
    }
    throw error;
  }
}

export function validateApplicationSettingsUpdate(data: unknown): Partial<ApplicationSettings> {
  try {
    return ApplicationSettingsUpdateSchema.parse(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues[0];
      throw new ValidationError(
        `Invalid application settings update: ${firstError.message}`,
        firstError.path.join('.'),
        data,
        error
      );
    }
    throw error;
  }
}
