import { NextResponse } from 'next/server';
import { listStateFiles } from '@/lib/state';

export async function GET() {
  try {
    const files = await listStateFiles();
    return NextResponse.json({ files });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list state files', details: String(error) },
      { status: 500 }
    );
  }
}
