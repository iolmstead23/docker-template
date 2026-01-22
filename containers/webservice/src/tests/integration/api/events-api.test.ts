import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'serial' });

test.describe('Events API Endpoint', () => {
  // Clean slate before each test - DELETE resets events to default empty array
  test.beforeEach(async ({ request }) => {
    await request.delete('/api/state/events');
    // Verify deletion worked
    const response = await request.get('/api/state/events');
    const data = await response.json();
    if (data.events.length !== 0) {
      throw new Error(`beforeEach cleanup failed: expected 0 events, got ${data.events.length}`);
    }
  });

  test('should return empty array initially', async ({ request }) => {
    const response = await request.get('/api/state/events');

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    const data = await response.json();

    // Verify default EventHistory structure
    expect(data).toHaveProperty('events');
    expect(data).toHaveProperty('maxEvents');
    expect(data.events).toEqual([]);
    expect(data.maxEvents).toBe(1000);
  });

  test('should add event via POST', async ({ request }) => {
    const newEvent = {
      type: 'user_action',
      severity: 'info',
      message: 'Test event created',
      metadata: {
        userId: 'test-user',
        action: 'test',
      },
    };

    const response = await request.post('/api/state/events', {
      data: newEvent,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    // Verify event structure
    expect(data).toHaveProperty('id');
    expect(data).toHaveProperty('timestamp');
    expect(data.type).toBe('user_action');
    expect(data.severity).toBe('info');
    expect(data.message).toBe('Test event created');
    expect(data.metadata).toEqual({
      userId: 'test-user',
      action: 'test',
    });
  });

  test('should generate unique IDs for events', async ({ request }) => {
    // Create two events
    const event1Response = await request.post('/api/state/events', {
      data: { type: 'test', message: 'Event 1' },
    });
    const event1 = await event1Response.json();

    const event2Response = await request.post('/api/state/events', {
      data: { type: 'test', message: 'Event 2' },
    });
    const event2 = await event2Response.json();

    // IDs should be different
    expect(event1.id).not.toBe(event2.id);

    // IDs should be valid UUIDs (match UUID format)
    expect(event1.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    expect(event2.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  test('should include timestamp in events', async ({ request }) => {
    const response = await request.post('/api/state/events', {
      data: { type: 'test', message: 'Timestamp test' },
    });

    const data = await response.json();

    expect(data).toHaveProperty('timestamp');

    // Verify timestamp is recent (within last 5 seconds)
    const timestamp = new Date(data.timestamp);
    const now = new Date();
    expect(now.getTime() - timestamp.getTime()).toBeLessThan(5000);

    // Verify ISO 8601 format
    expect(data.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('should maintain event order (LIFO - newest first)', async ({ request }) => {
    // Add three events in sequence
    await request.post('/api/state/events', {
      data: { type: 'test', message: 'First event', severity: 'info' },
    });

    await request.post('/api/state/events', {
      data: { type: 'test', message: 'Second event', severity: 'warning' },
    });

    await request.post('/api/state/events', {
      data: { type: 'test', message: 'Third event', severity: 'error' },
    });

    // Retrieve events
    const response = await request.get('/api/state/events');
    const data = await response.json();

    // Verify order (newest first)
    expect(data.events).toHaveLength(3);
    expect(data.events[0].message).toBe('Third event');
    expect(data.events[1].message).toBe('Second event');
    expect(data.events[2].message).toBe('First event');
  });

  test('should default severity to info if not provided', async ({ request }) => {
    const response = await request.post('/api/state/events', {
      data: {
        type: 'test',
        message: 'Event without severity',
      },
    });

    const data = await response.json();
    expect(data.severity).toBe('info');
  });

  test('should accept all severity levels', async ({ request }) => {
    const severities = ['info', 'warning', 'error', 'critical'];

    for (const severity of severities) {
      const response = await request.post('/api/state/events', {
        data: {
          type: 'test',
          message: `Event with ${severity} severity`,
          severity,
        },
      });

      const data = await response.json();
      expect(data.severity).toBe(severity);
    }

    // Verify all events stored
    const getResponse = await request.get('/api/state/events');
    const history = await getResponse.json();
    expect(history.events).toHaveLength(4);
  });

  test('should include metadata in events', async ({ request }) => {
    const metadata = {
      userId: 'user-123',
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
      customField: 'custom value',
    };

    const response = await request.post('/api/state/events', {
      data: {
        type: 'user_login',
        message: 'User logged in',
        metadata,
      },
    });

    const data = await response.json();
    expect(data.metadata).toEqual(metadata);

    // Verify persistence
    const getResponse = await request.get('/api/state/events');
    const history = await getResponse.json();
    expect(history.events[0].metadata).toEqual(metadata);
  });

  test('should enforce maxEvents limit', async ({ request }) => {
    // First, set a low maxEvents limit
    await request.put('/api/state/events', {
      data: {
        events: [],
        maxEvents: 3,
      },
    });

    // Add 5 events
    for (let i = 1; i <= 5; i++) {
      await request.post('/api/state/events', {
        data: {
          type: 'test',
          message: `Event ${i}`,
        },
      });
    }

    // Retrieve events
    const response = await request.get('/api/state/events');
    const data = await response.json();

    // Should only keep the 3 most recent events
    expect(data.events).toHaveLength(3);
    expect(data.events[0].message).toBe('Event 5');
    expect(data.events[1].message).toBe('Event 4');
    expect(data.events[2].message).toBe('Event 3');
  });

  test('should clear all events via DELETE', async ({ request }) => {
    // Add some events
    await request.post('/api/state/events', {
      data: { type: 'test', message: 'Event 1' },
    });
    await request.post('/api/state/events', {
      data: { type: 'test', message: 'Event 2' },
    });

    // Delete events
    const deleteResponse = await request.delete('/api/state/events');

    expect(deleteResponse.ok()).toBeTruthy();
    const deleteData = await deleteResponse.json();
    expect(deleteData).toHaveProperty('message');
    expect(deleteData.message).toContain('cleared successfully');

    // Verify events are empty
    const getResponse = await request.get('/api/state/events');
    const history = await getResponse.json();
    expect(history.events).toEqual([]);
  });

  test('should reset maxEvents to default after DELETE', async ({ request }) => {
    // Set custom maxEvents
    await request.put('/api/state/events', {
      data: {
        events: [],
        maxEvents: 50,
      },
    });

    // Delete (should reset to defaults)
    await request.delete('/api/state/events');

    // Verify maxEvents reset to default (1000)
    const response = await request.get('/api/state/events');
    const data = await response.json();
    expect(data.maxEvents).toBe(1000);
  });

  test('should persist events across multiple operations', async ({ request }) => {
    // Add events
    await request.post('/api/state/events', {
      data: { type: 'test', message: 'Event 1', severity: 'info' },
    });
    await request.post('/api/state/events', {
      data: { type: 'test', message: 'Event 2', severity: 'warning' },
    });

    // Read events (simulates page reload)
    const response1 = await request.get('/api/state/events');
    const data1 = await response1.json();
    expect(data1.events).toHaveLength(2);

    // Add another event
    await request.post('/api/state/events', {
      data: { type: 'test', message: 'Event 3', severity: 'error' },
    });

    // Read again
    const response2 = await request.get('/api/state/events');
    const data2 = await response2.json();
    expect(data2.events).toHaveLength(3);
  });

  test('should update entire history via PUT', async ({ request }) => {
    // Create custom history with valid UUIDs
    const customHistory = {
      events: [
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: new Date().toISOString(),
          type: 'custom',
          severity: 'info' as const,
          message: 'Custom event 1',
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          timestamp: new Date().toISOString(),
          type: 'custom',
          severity: 'warning' as const,
          message: 'Custom event 2',
        },
      ],
      maxEvents: 500,
    };

    const response = await request.put('/api/state/events', {
      data: customHistory,
    });

    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.events).toHaveLength(2);
    expect(data.maxEvents).toBe(500);

    // Verify persistence
    const getResponse = await request.get('/api/state/events');
    const getData = await getResponse.json();
    expect(getData.events[0].id).toBe('550e8400-e29b-41d4-a716-446655440001');
    expect(getData.maxEvents).toBe(500);
  });
});
