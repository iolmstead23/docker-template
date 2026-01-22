import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Settings API Endpoint', () => {
  // Clean slate before each test - delete settings and re-initialize with defaults
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/state/settings');
    // Re-initialize with defaults so subsequent PUTs have valid base state
    await request.get('/api/state/settings');
  });

  test('should return default settings on first GET', async ({ request }) => {
    const response = await request.get('/api/state/settings');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Verify default values match DEFAULT_APPLICATION_SETTINGS
    expect(data.version).toBe('1.0.0');
    expect(data).toHaveProperty('lastUpdated');
    expect(data.features).toEqual({
      darkMode: true,
      notifications: true,
      telemetry: true,
    });
    expect(data.limits).toEqual({
      maxUploadSize: 10485760, // 10MB
      maxConcurrentRequests: 10,
      sessionTimeout: 3600000, // 1 hour
    });
  });

  test('should update features via PUT', async ({ request }) => {
    // Update features
    const updateResponse = await request.put('/api/state/settings', {
      data: {
        features: {
          darkMode: false,
          notifications: false,
          telemetry: false,
        },
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updateData = await updateResponse.json();

    expect(updateData.features).toEqual({
      darkMode: false,
      notifications: false,
      telemetry: false,
    });

    // Verify persistence
    const getResponse = await request.get('/api/state/settings');
    const getData = await getResponse.json();
    expect(getData.features.darkMode).toBe(false);
  });

  test('should update limits via PUT', async ({ request }) => {
    const updateResponse = await request.put('/api/state/settings', {
      data: {
        limits: {
          maxUploadSize: 5242880, // 5MB
          maxConcurrentRequests: 5,
          sessionTimeout: 1800000, // 30 minutes
        },
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const data = await updateResponse.json();

    expect(data.limits).toEqual({
      maxUploadSize: 5242880,
      maxConcurrentRequests: 5,
      sessionTimeout: 1800000,
    });
  });

  test('should update lastUpdated timestamp on PUT', async ({ request }) => {
    // Get initial timestamp
    const initialResponse = await request.get('/api/state/settings');
    const initialData = await initialResponse.json();
    const initialTimestamp = new Date(initialData.lastUpdated);

    // Wait a moment to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 100));

    // Update settings
    const updateResponse = await request.put('/api/state/settings', {
      data: {
        features: { darkMode: false, notifications: true, telemetry: true },
      },
    });

    const updateData = await updateResponse.json();
    const updatedTimestamp = new Date(updateData.lastUpdated);

    // Verify timestamp was updated
    expect(updatedTimestamp.getTime()).toBeGreaterThan(initialTimestamp.getTime());

    // Verify timestamp is recent (within last 5 seconds)
    const now = new Date();
    expect(now.getTime() - updatedTimestamp.getTime()).toBeLessThan(5000);
  });

  test('should merge updates correctly', async ({ request }) => {
    // First update: change version
    await request.put('/api/state/settings', {
      data: { version: '2.0.0' },
    });

    // Second update: change features (should not affect version)
    const response = await request.put('/api/state/settings', {
      data: {
        features: { darkMode: false, notifications: false, telemetry: false },
      },
    });

    const data = await response.json();

    // Both updates should be present
    expect(data.version).toBe('2.0.0');
    expect(data.features.darkMode).toBe(false);
  });

  test('should add new feature flags dynamically', async ({ request }) => {
    // Add a new feature flag not in defaults
    const response = await request.put('/api/state/settings', {
      data: {
        features: {
          darkMode: true,
          notifications: true,
          telemetry: true,
          newFeature: true, // New feature flag
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.features.newFeature).toBe(true);

    // Verify persistence
    const getResponse = await request.get('/api/state/settings');
    const getData = await getResponse.json();
    expect(getData.features.newFeature).toBe(true);
  });

  test('should delete settings via DELETE', async ({ request }) => {
    // Create custom settings
    await request.put('/api/state/settings', {
      data: { version: '3.0.0' },
    });

    // Delete settings
    const deleteResponse = await request.delete('/api/state/settings');

    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData).toHaveProperty('message');
    expect(deleteData.message).toContain('reset to defaults');
  });

  test('should return defaults after DELETE', async ({ request }) => {
    // Create custom settings
    await request.put('/api/state/settings', {
      data: {
        version: '5.0.0',
        features: { darkMode: false, notifications: false, telemetry: false },
      },
    });

    // Delete settings
    await request.delete('/api/state/settings');

    // GET should return defaults again
    const response = await request.get('/api/state/settings');
    const data = await response.json();

    // Verify back to defaults
    expect(data.version).toBe('1.0.0');
    expect(data.features.darkMode).toBe(true);
  });

  test('should update individual limit values', async ({ request }) => {
    // First set all limits to custom values
    await request.put('/api/state/settings', {
      data: {
        limits: {
          maxUploadSize: 5242880,
          maxConcurrentRequests: 5,
          sessionTimeout: 1800000,
        },
      },
    });

    // Now update only one limit
    const response = await request.put('/api/state/settings', {
      data: {
        limits: {
          maxUploadSize: 20971520, // 20MB
          maxConcurrentRequests: 5,
          sessionTimeout: 1800000,
        },
      },
    });

    const data = await response.json();
    expect(data.limits.maxUploadSize).toBe(20971520);
  });

  test('should validate lastUpdated is ISO 8601 format', async ({ request }) => {
    const response = await request.put('/api/state/settings', {
      data: { version: '2.0.0' },
    });

    const data = await response.json();

    // Verify ISO 8601 format (should parse without throwing)
    expect(() => new Date(data.lastUpdated)).not.toThrow();

    // Verify format includes timestamp components
    expect(data.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('should persist multiple updates in sequence', async ({ request }) => {
    // Series of updates
    await request.put('/api/state/settings', { data: { version: '2.0.0' } });
    await request.put('/api/state/settings', {
      data: { features: { darkMode: false, notifications: true, telemetry: true } },
    });
    await request.put('/api/state/settings', {
      data: { limits: { maxUploadSize: 5242880, maxConcurrentRequests: 3, sessionTimeout: 900000 } },
    });

    // Verify all updates persisted
    const response = await request.get('/api/state/settings');
    const data = await response.json();

    expect(data.version).toBe('2.0.0');
    expect(data.features.darkMode).toBe(false);
    expect(data.limits.maxUploadSize).toBe(5242880);
  });
});
