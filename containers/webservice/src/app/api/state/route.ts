import { NextRequest, NextResponse } from 'next/server';
import { listStateFiles } from '@/lib/state';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';

export async function GET(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const files = await listStateFiles();
    return NextResponse.json({ files });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to list state files: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to list state files', details: errorMessage },
      { status: 500 }
    );
  }
}
