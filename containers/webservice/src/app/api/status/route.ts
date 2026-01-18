import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';
import { trace } from '@opentelemetry/api';

export async function GET() {
  // Create span for status request
  const tracer = trace.getTracer('webservice');
  const span = tracer.startSpan('api-status');

  const headersList = headers();
  const logId = getLogIdFromHeaders(headersList) || '';

  // Link correlation ID to span for log-trace correlation
  if (logId) {
    span.setAttribute('log.correlation.id', logId);
  }
  span.setAttribute('http.method', 'GET');
  span.setAttribute('http.url', '/api/status');

  // Log the status check with correlation ID for request tracing
  await log('info', 'Status endpoint called', logId);

  span.end();

  return NextResponse.json({
    status: 'ok',
    service: 'webservice',
    timestamp: new Date().toISOString(),
    log_id: logId, // Include log ID in response for client-side correlation
  });
}
