import { NextRequest, NextResponse } from 'next/server';
import { createStateManager } from '@/lib/state';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/lib/state-types';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';
import { validateUserPreferencesUpdate, ValidationError } from '@/lib/validators';

const stateManager = createStateManager('user-preferences');

export async function GET(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const preferences = await stateManager.readOrInit<UserPreferences>(DEFAULT_USER_PREFERENCES);
    return NextResponse.json(preferences);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to read user preferences: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to read user preferences', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const body = await request.json();

    // Validate input with Zod schema before processing
    const validatedUpdates = validateUserPreferencesUpdate(body);

    const preferences = await stateManager.update<UserPreferences>(validatedUpdates);
    return NextResponse.json(preferences);
  } catch (error) {
    // Handle validation errors with 400 status code
    if (error instanceof ValidationError) {
      await log('warn', `Invalid user preferences input: ${error.message}`, logId);
      return NextResponse.json(
        { error: 'Invalid input', details: error.message, field: error.field },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to update user preferences: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to update user preferences', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    await stateManager.delete();
    return NextResponse.json({ message: 'User preferences deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to delete user preferences: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to delete user preferences', details: errorMessage },
      { status: 500 }
    );
  }
}
