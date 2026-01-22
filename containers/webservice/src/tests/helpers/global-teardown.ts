import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(_config: FullConfig) {
  // Clean up test state
  const testStatePath = path.join(__dirname, '../../test-state');

  try {
    await fs.rm(testStatePath, { recursive: true, force: true });
    console.log('✓ Cleaned up test state directory');
  } catch (error) {
    console.error('Failed to clean up test state:', error);
  }
}

export default globalTeardown;
