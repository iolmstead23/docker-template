import { NextRequest, NextResponse } from 'next/server';
import { createStateManager } from '@/lib/state';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '@/lib/state-types';

const stateManager = createStateManager('user-preferences');

export async function GET() {
  try {
    const preferences = await stateManager.readOrInit<UserPreferences>(DEFAULT_USER_PREFERENCES);
    return NextResponse.json(preferences);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read user preferences', details: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const updates = await request.json();
    const preferences = await stateManager.update<UserPreferences>(updates);
    return NextResponse.json(preferences);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update user preferences', details: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    await stateManager.delete();
    return NextResponse.json({ message: 'User preferences deleted successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete user preferences', details: String(error) },
      { status: 500 }
    );
  }
}
