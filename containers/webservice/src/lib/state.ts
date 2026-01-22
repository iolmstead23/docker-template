import fs from 'fs/promises';
import path from 'path';
import { StateError } from './validators';

// Directory where all state JSON files are persisted (configured via STATE_PATH env var)
const STATE_DIR = process.env.STATE_PATH || '/app/appState';

// Base interface for all state files - allows arbitrary properties for flexibility
export interface StateFile {
  [key: string]: unknown;
}

// Manages reading, writing, updating, and deleting state JSON files
export class StateManager {
  private statePath: string;

  constructor(fileName: string) {
    // Build absolute path to state file in configured STATE_PATH directory
    this.statePath = path.join(STATE_DIR, `${fileName}.json`);
  }

  // Read state file or return null if file doesn't exist (allows readOrInit pattern)
  async read<T extends StateFile>(): Promise<T | null> {
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      // Return null for missing files rather than throwing (allows readOrInit pattern)
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new StateError(
        `Failed to read state file: ${error instanceof Error ? error.message : String(error)}`,
        'read',
        this.statePath
      );
    }
  }

  // Write state data to JSON file with pretty formatting (2-space indent)
  async write<T extends StateFile>(data: T): Promise<void> {
    try {
      // Ensure STATE_DIR exists before writing (recursive: true creates parent dirs)
      await fs.mkdir(STATE_DIR, { recursive: true });
      await fs.writeFile(this.statePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new StateError(
        `Failed to write state file: ${error instanceof Error ? error.message : String(error)}`,
        'write',
        this.statePath
      );
    }
  }

  // Update state file by merging partial updates with existing state (shallow merge)
  async update<T extends StateFile>(updates: Partial<T>): Promise<T> {
    const currentState = (await this.read<T>()) || ({} as T);
    // Shallow merge - nested objects will be replaced entirely, not deep merged
    const newState = { ...currentState, ...updates };
    await this.write(newState);
    return newState;
  }

  // Delete state file (silently succeeds if file doesn't exist)
  async delete(): Promise<void> {
    try {
      await fs.unlink(this.statePath);
    } catch (error) {
      // Ignore ENOENT errors (file already deleted) but throw for other errors
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new StateError(
          `Failed to delete state file: ${error instanceof Error ? error.message : String(error)}`,
          'delete',
          this.statePath
        );
      }
    }
  }

  // Check if state file exists on disk
  async exists(): Promise<boolean> {
    try {
      await fs.access(this.statePath);
      return true;
    } catch {
      return false;
    }
  }

  // Read state file or initialize with defaults if file doesn't exist
  async readOrInit<T extends StateFile>(defaultState: T): Promise<T> {
    const state = await this.read<T>();
    if (state === null) {
      // File doesn't exist - write defaults and return them
      await this.write(defaultState);
      return defaultState;
    }
    return state;
  }
}

// List all state files in STATE_DIR (returns filenames without .json extension)
export async function listStateFiles(): Promise<string[]> {
  try {
    // Ensure directory exists before listing files
    await fs.mkdir(STATE_DIR, { recursive: true });
    const files = await fs.readdir(STATE_DIR);
    // Filter to only JSON files and strip .json extension from filenames
    return files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
  } catch (error) {
    throw new StateError(
      `Failed to list state files: ${error instanceof Error ? error.message : String(error)}`,
      'read',
      STATE_DIR
    );
  }
}

// Factory function to create a StateManager instance for a specific file
export function createStateManager(fileName: string): StateManager {
  return new StateManager(fileName);
}
