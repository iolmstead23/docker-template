import { StateStorage } from 'zustand/middleware';

export interface ApiStorageOptions {
  apiEndpoint: string;
  onError?: (error: Error) => void;
}

/**
 * Creates a custom Zustand storage adapter that syncs with a JSON API endpoint.
 * This enables bidirectional sync between Zustand store and persistent JSON files.
 */
export function createApiStorage(options: ApiStorageOptions): StateStorage {
  const { apiEndpoint, onError } = options;

  return {
    // Name parameter required by StateStorage interface but unused (API endpoint is pre-configured)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    getItem: async (name: string): Promise<string | null> => {
      // Skip API calls during SSR - only fetch on client side
      if (typeof window === 'undefined') {
        return null;
      }

      try {
        const response = await fetch(apiEndpoint, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch state: ${response.statusText}`);
        }

        const data = await response.json();
        return JSON.stringify(data);
      } catch (error) {
        onError?.(error as Error);
        console.error(`Error fetching state from ${apiEndpoint}:`, error);
        return null;
      }
    },

    // Name parameter required by StateStorage interface but unused (API endpoint is pre-configured)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setItem: async (name: string, value: string): Promise<void> => {
      // Skip API calls during SSR - only save on client side
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const data = JSON.parse(value);
        const response = await fetch(apiEndpoint, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });

        if (!response.ok) {
          throw new Error(`Failed to save state: ${response.statusText}`);
        }
      } catch (error) {
        onError?.(error as Error);
        console.error(`Error saving state to ${apiEndpoint}:`, error);
      }
    },

    // Name parameter required by StateStorage interface but unused (API endpoint is pre-configured)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    removeItem: async (name: string): Promise<void> => {
      // Skip API calls during SSR - only delete on client side
      if (typeof window === 'undefined') {
        return;
      }

      try {
        const response = await fetch(apiEndpoint, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          throw new Error(`Failed to delete state: ${response.statusText}`);
        }
      } catch (error) {
        onError?.(error as Error);
        console.error(`Error deleting state from ${apiEndpoint}:`, error);
      }
    },
  };
}