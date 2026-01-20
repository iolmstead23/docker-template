import { NextRequest, NextResponse } from 'next/server';
import { createStateManager } from '@/lib/state';
import { EventHistory, EventHistoryItem, DEFAULT_EVENT_HISTORY } from '@/lib/state-types';
import { randomUUID } from 'crypto';

const stateManager = createStateManager('event-history');

export async function GET() {
  try {
    const history = await stateManager.readOrInit<EventHistory>(DEFAULT_EVENT_HISTORY);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read event history', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const eventData = await request.json();
    const history = await stateManager.readOrInit<EventHistory>(DEFAULT_EVENT_HISTORY);

    const newEvent: EventHistoryItem = {
      id: randomUUID(),
      timestamp: new Date().toISOString(),
      type: eventData.type,
      severity: eventData.severity || 'info',
      message: eventData.message,
      metadata: eventData.metadata,
    };

    history.events.unshift(newEvent);

    if (history.events.length > history.maxEvents) {
      history.events = history.events.slice(0, history.maxEvents);
    }

    await stateManager.write(history);
    return NextResponse.json(newEvent);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to add event', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const history = await request.json();
    await stateManager.write(history);
    return NextResponse.json(history);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save event history', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await stateManager.write(DEFAULT_EVENT_HISTORY);
    return NextResponse.json({ message: 'Event history cleared successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to clear event history', details: String(error) },
      { status: 500 }
    );
  }
}
