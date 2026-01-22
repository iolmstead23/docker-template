import { NextRequest, NextResponse } from 'next/server';
import { createStateManager } from '@/lib/state';
import { ApplicationSettings, DEFAULT_APPLICATION_SETTINGS } from '@/lib/state-types';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';
import { validateApplicationSettingsUpdate, ValidationError } from '@/lib/validators';

const stateManager = createStateManager('application-settings');

export async function GET(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const settings = await stateManager.readOrInit<ApplicationSettings>(DEFAULT_APPLICATION_SETTINGS);
    return NextResponse.json(settings);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to read application settings: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to read application settings', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const body = await request.json();

    // Validate input with Zod schema before processing
    const validatedUpdates = validateApplicationSettingsUpdate(body);

    // Auto-generate lastUpdated timestamp (not part of user input)
    const updates = {
      ...validatedUpdates,
      lastUpdated: new Date().toISOString(),
    };

    const settings = await stateManager.update<ApplicationSettings>(updates);
    return NextResponse.json(settings);
  } catch (error) {
    // Handle validation errors with 400 status code
    if (error instanceof ValidationError) {
      await log('warn', `Invalid application settings input: ${error.message}`, logId);
      return NextResponse.json(
        { error: 'Invalid input', details: error.message, field: error.field },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to update application settings: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to update application settings', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    await stateManager.delete();
    return NextResponse.json({ message: 'Application settings reset to defaults' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to reset application settings: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to reset application settings', details: errorMessage },
      { status: 500 }
    );
  }
}
