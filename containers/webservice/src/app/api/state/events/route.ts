import { NextRequest, NextResponse } from 'next/server';
import { createStateManager } from '@/lib/state';
import { EventHistory, EventHistoryItem, DEFAULT_EVENT_HISTORY } from '@/lib/state-types';
import { randomUUID } from 'crypto';
import { log, getLogIdFromHeaders } from '@/lib/telemetry';
import { validateEventCreate, validateEventHistoryUpdate, ValidationError } from '@/lib/validators';

const stateManager = createStateManager('event-history');

export async function GET(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const history = await stateManager.readOrInit<EventHistory>(DEFAULT_EVENT_HISTORY);
    return NextResponse.json(history);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to read event history: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to read event history', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const body = await request.json();

    // Validate input with Zod schema (excludes id and timestamp - generated server-side)
    const validatedEventData = validateEventCreate(body);

    const history = await stateManager.readOrInit<EventHistory>(DEFAULT_EVENT_HISTORY);

    // Create new event with server-generated id and timestamp
    const newEvent: EventHistoryItem = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: validatedEventData.type,
      severity: validatedEventData.severity,
      message: validatedEventData.message,
      metadata: validatedEventData.metadata,
    };

    // Add to beginning of array (LIFO - newest first)
    history.events.unshift(newEvent);

    // Enforce maxEvents limit by truncating array
    if (history.events.length > history.maxEvents) {
      history.events = history.events.slice(0, history.maxEvents);
    }

    await stateManager.write(history);
    return NextResponse.json(newEvent);
  } catch (error) {
    // Handle validation errors with 400 status code
    if (error instanceof ValidationError) {
      await log('warn', `Invalid event input: ${error.message}`, logId);
      return NextResponse.json(
        { error: 'Invalid input', details: error.message, field: error.field },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to add event: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to add event', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    const body = await request.json();

    // Validate input with Zod schema before processing
    const validatedUpdates = validateEventHistoryUpdate(body);

    // Merge with existing history to preserve fields not in update
    const currentHistory = await stateManager.readOrInit<EventHistory>(DEFAULT_EVENT_HISTORY);
    const updatedHistory = { ...currentHistory, ...validatedUpdates };

    await stateManager.write(updatedHistory);
    return NextResponse.json(updatedHistory);
  } catch (error) {
    // Handle validation errors with 400 status code
    if (error instanceof ValidationError) {
      await log('warn', `Invalid event history input: ${error.message}`, logId);
      return NextResponse.json(
        { error: 'Invalid input', details: error.message, field: error.field },
        { status: 400 }
      );
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to save event history: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to save event history', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const logId = getLogIdFromHeaders(request.headers);

  try {
    await stateManager.write(DEFAULT_EVENT_HISTORY);
    return NextResponse.json({ message: 'Event history cleared successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    // Log error with stack trace for debugging
    await log('error', `Failed to clear event history: ${errorMessage}${errorStack ? '\n' + errorStack : ''}`, logId);

    return NextResponse.json(
      { error: 'Failed to clear event history', details: errorMessage },
      { status: 500 }
    );
  }
}
