import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';

export async function GET() {
  const headersList = headers();
  const logId = getLogIdFromHeaders(headersList);

  return NextResponse.json({
    status: 'ok',
    service: 'webservice',
    timestamp: new Date().toISOString(),
  });
}
