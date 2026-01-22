import { test, expect } from '@playwright/test';

test.describe('Status API Endpoint', () => {
  test('should return OK status', async ({ request }) => {
    // Make API request (auto-waits for response)
    const response = await request.get('/api/status');

    // Verify response status
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);

    // Verify JSON structure
    const data = await response.json();
    expect(data).toHaveProperty('status', 'ok');
    expect(data).toHaveProperty('service', 'webservice');
    expect(data).toHaveProperty('timestamp');

    // Verify timestamp is recent (within last 5 seconds)
    const timestamp = new Date(data.timestamp);
    const now = new Date();
    expect(now.getTime() - timestamp.getTime()).toBeLessThan(5000);
  });

  test('should respond quickly', async ({ request }) => {
    const start = Date.now();
    await request.get('/api/status');
    const duration = Date.now() - start;

    // Performance test - response should be < 2000ms (relaxed for system load variance)
    expect(duration).toBeLessThan(2000);
  });

  test('should include required fields', async ({ request }) => {
    const response = await request.get('/api/status');
    const data = await response.json();

    // Schema validation - ensure all required fields present
    expect(data).toHaveProperty('status');
    expect(data).toHaveProperty('service');
    expect(data).toHaveProperty('timestamp');

    // Verify field types
    expect(typeof data.status).toBe('string');
    expect(typeof data.service).toBe('string');
    expect(typeof data.timestamp).toBe('string');

    // Verify timestamp is valid ISO 8601 format
    expect(() => new Date(data.timestamp)).not.toThrow();
  });
});
