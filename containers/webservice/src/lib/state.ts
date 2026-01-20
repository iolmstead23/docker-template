import fs from 'fs/promises';
import path from 'path';

const STATE_DIR = process.env.STATE_PATH || '/app/appState';

export interface StateFile {
  [key: string]: unknown;
}

export class StateManager {
  private statePath: string;

  constructor(fileName: string) {
    this.statePath = path.join(STATE_DIR, `${fileName}.json`);
  }

  async read<T extends StateFile>(): Promise<T | null> {
    try {
      const data = await fs.readFile(this.statePath, 'utf-8');
      return JSON.parse(data) as T;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      throw new Error(`Failed to read state file ${this.statePath}: ${error}`);
    }
  }

  async write<T extends StateFile>(data: T): Promise<void> {
    try {
      await fs.mkdir(STATE_DIR, { recursive: true });
      await fs.writeFile(this.statePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write state file ${this.statePath}: ${error}`);
    }
  }

  async update<T extends StateFile>(updates: Partial<T>): Promise<T> {
    const currentState = (await this.read<T>()) || ({} as T);
    const newState = { ...currentState, ...updates };
    await this.write(newState);
    return newState;
  }

  async delete(): Promise<void> {
    try {
      await fs.unlink(this.statePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to delete state file ${this.statePath}: ${error}`);
      }
    }
  }

  async exists(): Promise<boolean> {
    try {
      await fs.access(this.statePath);
      return true;
    } catch {
      return false;
    }
  }

  async readOrInit<T extends StateFile>(defaultState: T): Promise<T> {
    const state = await this.read<T>();
    if (state === null) {
      await this.write(defaultState);
      return defaultState;
    }
    return state;
  }
}

export async function listStateFiles(): Promise<string[]> {
  try {
    await fs.mkdir(STATE_DIR, { recursive: true });
    const files = await fs.readdir(STATE_DIR);
    return files.filter(file => file.endsWith('.json')).map(file => file.replace('.json', ''));
  } catch (error) {
    throw new Error(`Failed to list state files: ${error}`);
  }
}

export function createStateManager(fileName: string): StateManager {
  return new StateManager(fileName);
}
