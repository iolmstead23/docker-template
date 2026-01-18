import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';

export async function GET() {
  const headersList = headers();
  const logId = getLogIdFromHeaders(headersList);

  // Log the status check with correlation ID for request tracing
  await log('info', 'Status endpoint called', logId);

  return NextResponse.json({
    status: 'ok',
    service: 'webservice',
    timestamp: new Date().toISOString(),
    log_id: logId, // Include log ID in response for client-side correlation
  });
}
