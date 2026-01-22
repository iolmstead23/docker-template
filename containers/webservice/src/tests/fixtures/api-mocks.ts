import { http, HttpResponse } from 'msw';
import { mockPreferences, mockSettings, mockEvent } from './test-data';

// MSW handlers for mocking API responses in component tests
export const handlers = [
  // Status endpoint
  http.get('/api/status', () => {
    return HttpResponse.json({
      status: 'ok',
      service: 'webservice',
      timestamp: new Date().toISOString(),
    });
  }),

  // Preferences endpoints
  http.get('/api/state/preferences', () => {
    return HttpResponse.json(mockPreferences);
  }),

  http.put('/api/state/preferences', async ({ request }) => {
    const updates = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockPreferences, ...updates });
  }),

  http.delete('/api/state/preferences', () => {
    return HttpResponse.json(mockPreferences);
  }),

  // Settings endpoints
  http.get('/api/state/settings', () => {
    return HttpResponse.json(mockSettings);
  }),

  http.put('/api/state/settings', async ({ request }) => {
    const updates = await request.json() as Record<string, unknown>;
    return HttpResponse.json({ ...mockSettings, ...updates });
  }),

  http.delete('/api/state/settings', () => {
    return HttpResponse.json(mockSettings);
  }),

  // Events endpoints
  http.get('/api/state/events', () => {
    return HttpResponse.json([mockEvent]);
  }),

  http.post('/api/state/events', async ({ request }) => {
    const newEvent = await request.json();
    return HttpResponse.json(newEvent);
  }),

  http.delete('/api/state/events', () => {
    return HttpResponse.json({ success: true });
  }),
];
