import { NextRequest, NextResponse } from 'next/server';
import { createStateManager } from '@/lib/state';
import { ApplicationSettings, DEFAULT_APPLICATION_SETTINGS } from '@/lib/state-types';

const stateManager = createStateManager('application-settings');

export async function GET() {
  try {
    const settings = await stateManager.readOrInit<ApplicationSettings>(DEFAULT_APPLICATION_SETTINGS);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read application settings', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    updates.lastUpdated = new Date().toISOString();
    const settings = await stateManager.update<ApplicationSettings>(updates);
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update application settings', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await stateManager.delete();
    return NextResponse.json({ message: 'Application settings reset to defaults' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to reset application settings', details: String(error) },
      { status: 500 }
    );
  }
}
