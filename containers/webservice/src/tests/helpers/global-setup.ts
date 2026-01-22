import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalSetup(_config: FullConfig) {
  // Clean up previous test state
  const testStatePath = path.join(__dirname, '../../test-state');

  try {
    await fs.rm(testStatePath, { recursive: true, force: true });
    await fs.mkdir(testStatePath, { recursive: true });
    console.log('✓ Cleaned test state directory');
  } catch (error) {
    console.error('Failed to clean test state:', error);
  }
}

export default globalSetup;
