/**
 * useLocalStorage.ts - Browser Local Storage Hook
 *
 * This custom React hook provides a simple interface for working with
 * browser's localStorage API. It handles:
 *
 * - Saving and loading data from localStorage
 * - Automatic synchronization between browser tabs
 * - Error handling and fallbacks to default values
 * - Type safety with TypeScript generics
 *
 * localStorage is a browser API that stores data persistently
 * (data survives page reloads and browser restarts, but is limited to ~5MB).
 *
 * Example usage:
 * const [username, setUsername] = useLocalStorage('username', 'guest');
 */

// React hooks for state management and side effects
import { useState, useEffect } from 'react';

/**
 * useLocalStorage Hook
 *
 * Generic hook that manages localStorage state with React state.
 *
 * @param key - The localStorage key to store data under
 * @param defaultValue - Default value if no data exists in localStorage
 * @param serializer - Optional custom serialize/deserialize functions
 * @returns [value, setValue] - State and setter function like useState
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  serializer?: {
    serialize: (value: T) => string;
    deserialize: (value: string) => T;
  }
) {
  // Use provided serializer or default to JSON methods
  const serialize = serializer?.serialize || JSON.stringify;
  const deserialize = serializer?.deserialize || JSON.parse;

  /**
   * Initialize State from localStorage
   *
   * This function runs once when component mounts to load
   * existing data from localStorage or use default value.
   */
  const [state, setState] = useState<T>(() => {
    try {
      // Try to get existing item from localStorage
      const item = localStorage.getItem(key);
      return item ? deserialize(item) : defaultValue;
    } catch (error) {
      // If parsing fails, use default value and log warning
      console.warn(`Failed to load ${key} from localStorage:`, error);
      return defaultValue;
    }
  });

  /**
   * Set Value Function
   *
   * This function handles both direct values and update functions
   * (like React's setState). It updates both React state and localStorage.
   */
  const setValue = (value: T | ((prev: T) => T)) => {
    try {
      // Handle both direct values and functional updates
      const valueToStore = value instanceof Function ? value(state) : value;

      // Update React state (triggers re-render)
      setState(valueToStore);

      // Save to localStorage (persists across page reloads)
      localStorage.setItem(key, serialize(valueToStore));
    } catch (error) {
      // Handle quota exceeded or other localStorage errors
      console.warn(`Failed to save ${key} to localStorage:`, error);
    }
  };

  /**
   * Cross-Tab Synchronization
   *
   * This useEffect sets up event listeners to synchronize state
   * when the same localStorage key changes in another browser tab.
   *
   * This ensures that if user has multiple tabs open,
   * changes in one tab are reflected in others.
   */
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      // Only handle changes to our specific key
      if (e.key === key && e.newValue !== null) {
        try {
          // Update this tab's state with the new value
          setState(deserialize(e.newValue));
        } catch (error) {
          console.warn(`Failed to sync ${key} from localStorage:`, error);
        }
      }
    };

    // Listen for storage changes across all tabs
    window.addEventListener('storage', handleStorageChange);

    // Clean up event listener when component unmounts
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, deserialize]);

  // Return state and setter like React's useState
  return [state, setValue] as const;
}