/**
 * exocortex.ts - Core Data Management and Types
 *
 * This file contains the core data structures and database logic for the
 * time tracking application. It handles:
 *
 * - TypeScript type definitions for events and data structures
 * - IndexedDB database management for local data persistence
 * - Data queries and CRUD operations
 * - Utility functions for time calculations and event processing
 * - Color calculations based on event categories
 */

/**
 * Returns the total number of events in the database (all time).
 * Returns 0 if no events have ever been added.
 */
export async function exocortexEventCount(db: IDBDatabase): Promise<number> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['events'], 'readonly');
    const store = transaction.objectStore('events');
    let countRequest = store.count();
    countRequest.onsuccess = () => resolve(countRequest.result);
    countRequest.onerror = () => reject(countRequest.error);
  });
}

export interface ExocortexEvent {
  id: string;
  endTime: number;
  category: string;
  notes?: string;
  happiness: number;
  wakefulness: number;
  health: number;
}

export interface DayEvents {
  date: string;
  events: ExocortexEvent[];
}

const DB_NAME = 'exocortex';
const DB_VERSION = 1;
const STORE_NAME = 'events';

// Export ExocortexDB and all utility functions
export class ExocortexDB {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('endTime', 'endTime', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }
  // [rest of class yields unchanged]
}

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function getEventColor(event: ExocortexEvent, colorOverrides?: { category: string; hue: number }[]): string {
  const override = colorOverrides?.find(override => override.category === event.category);
  const hue = override ? override.hue : (hashString(event.category) % 360);
  const saturation = Math.round(event.happiness * 100);
  const value = Math.round(event.wakefulness * 100);
  return `hsl(${hue}, ${saturation}%, ${value}%)`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getHourSlots(): string[] {
  const hours: any = [];
  for (let i = 0; i < 24; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
}
