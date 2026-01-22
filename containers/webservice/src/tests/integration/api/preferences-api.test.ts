import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Preferences API Endpoint', () => {
  // Clean slate before each test - delete preferences and re-initialize with defaults
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/state/preferences');
    // Re-initialize with defaults so subsequent PUTs have valid base state
    await request.get('/api/state/preferences');
  });

  test('should return default preferences on first GET', async ({ request }) => {
    const response = await request.get('/api/state/preferences');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Verify default values match DEFAULT_USER_PREFERENCES
    expect(data.theme).toBe('auto');
    expect(data.language).toBe('en');
    expect(data.notifications).toEqual({
      enabled: true,
      email: false,
      browser: true,
    });
    expect(data.dashboard).toEqual({
      layout: 'default',
      widgets: ['status', 'telemetry', 'events'],
    });
    expect(data.privacy).toEqual({
      analytics: false,
      telemetry: true,
    });
  });

  test('should update theme via PUT', async ({ request }) => {
    // Update theme to dark
    const updateResponse = await request.put('/api/state/preferences', {
      data: { theme: 'dark' },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const updateData = await updateResponse.json();
    expect(updateData.theme).toBe('dark');

    // Verify persistence - read again
    const getResponse = await request.get('/api/state/preferences');
    const getData = await getResponse.json();
    expect(getData.theme).toBe('dark');
  });

  test('should update notifications via PUT', async ({ request }) => {
    // Partial update - only change notifications
    const updateResponse = await request.put('/api/state/preferences', {
      data: {
        notifications: {
          enabled: false,
          email: true,
          browser: false,
        },
      },
    });

    expect(updateResponse.ok()).toBeTruthy();
    const data = await updateResponse.json();

    // Verify notifications updated
    expect(data.notifications).toEqual({
      enabled: false,
      email: true,
      browser: false,
    });

    // Verify other fields unchanged
    expect(data.theme).toBe('auto');
    expect(data.language).toBe('en');
  });

  test('should merge updates correctly', async ({ request }) => {
    // First update: change theme
    await request.put('/api/state/preferences', {
      data: { theme: 'light' },
    });

    // Second update: change language (should not affect theme)
    const response = await request.put('/api/state/preferences', {
      data: { language: 'es' },
    });

    const data = await response.json();

    // Both updates should be present
    expect(data.theme).toBe('light');
    expect(data.language).toBe('es');

    // Other fields should remain at defaults
    expect(data.notifications.enabled).toBe(true);
  });

  test('should update nested objects correctly', async ({ request }) => {
    // Update nested dashboard config
    const response = await request.put('/api/state/preferences', {
      data: {
        dashboard: {
          layout: 'compact',
          widgets: ['status', 'events'],
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.dashboard).toEqual({
      layout: 'compact',
      widgets: ['status', 'events'],
    });
  });

  test('should update privacy settings', async ({ request }) => {
    const response = await request.put('/api/state/preferences', {
      data: {
        privacy: {
          analytics: true,
          telemetry: false,
        },
      },
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.privacy).toEqual({
      analytics: true,
      telemetry: false,
    });
  });

  test('should delete preferences file via DELETE', async ({ request }) => {
    // First create some preferences
    await request.put('/api/state/preferences', {
      data: { theme: 'dark' },
    });

    // Delete preferences
    const deleteResponse = await request.delete('/api/state/preferences');

    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData).toHaveProperty('message');
  });

  test('should return defaults after DELETE', async ({ request }) => {
    // Create custom preferences
    await request.put('/api/state/preferences', {
      data: {
        theme: 'dark',
        language: 'fr',
      },
    });

    // Delete preferences
    await request.delete('/api/state/preferences');

    // GET should return defaults again
    const response = await request.get('/api/state/preferences');
    const data = await response.json();

    // Verify back to defaults
    expect(data.theme).toBe('auto');
    expect(data.language).toBe('en');
  });

  test('should handle invalid JSON gracefully', async ({ request }) => {
    const response = await request.put('/api/state/preferences', {
      data: 'invalid json string',
    });

    // Should return error response
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('should persist multiple updates in sequence', async ({ request }) => {
    // Series of updates
    await request.put('/api/state/preferences', { data: { theme: 'dark' } });
    await request.put('/api/state/preferences', { data: { language: 'es' } });
    await request.put('/api/state/preferences', {
      data: { notifications: { enabled: false, email: false, browser: false } },
    });

    // Verify all updates persisted
    const response = await request.get('/api/state/preferences');
    const data = await response.json();

    expect(data.theme).toBe('dark');
    expect(data.language).toBe('es');
    expect(data.notifications.enabled).toBe(false);
  });
});
