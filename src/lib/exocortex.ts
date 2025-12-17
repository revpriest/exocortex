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
 * ExocortexEvent Interface
 *
 * Defines the structure of a single time tracking event.
 * Each event represents a period of time with associated mood data.
 *
 * Properties:
 * - id: Unique identifier for the event (UUID string)
 * - endTime: When the event ends (Unix timestamp in milliseconds)
 * - category: Type of activity (e.g., "Work", "Sleep", "Exercise")
 * - happiness: Emotional state during event (0.0 = very sad, 1.0 = very happy)
 * - wakefulness: Mental alertness during event (0.0 = asleep, 1.0 = fully awake)
 * - health: Physical well-being during event (0.0 = very poor, 1.0 = excellent)
 */
export interface ExocortexEvent {
  /** Unique identifier for the event (UUID format) */
  id: string;
  /** When the event ends (Unix timestamp in milliseconds) */
  endTime: number;
  /** Category or type of activity (e.g., "Work", "Sleep", "Exercise") */
  category: string;
  /** Optional diary notes about the event */
  notes?: string;
  /** Happiness level during event (0.0 = very sad, 1.0 = very happy) */
  happiness: number;
  /** Wakefulness level during event (0.0 = asleep, 1.0 = fully awake) */
  wakefulness: number;
  /** Health level during event (0.0 = very poor, 1.0 = excellent) */
  health: number;
}

/**
 * DayEvents Interface
 *
 * Represents all events for a specific day.
 * The app groups events by date for efficient loading and display.
 *
 * Properties:
 * - date: Date in ISO format (YYYY-MM-DD)
 * - events: Array of all events that occurred on this date
 */
export interface DayEvents {
  /** Date string in ISO format (YYYY-MM-DD) */
  date: string;
  /** Array of all events for this day, sorted by end time */
  events: ExocortexEvent[];
}

/** Summary information about all events in the database. */
export interface EventSummary {
  /** Total number of events stored. */
  totalEvents: number;
  /** Earliest event end time, if any events exist. */
  earliestEndTime: number | null;
  /** Latest event end time, if any events exist. */
  latestEndTime: number | null;
}

/**
 * Category bucket interfaces used for time-aggregation analytics.
 */
export type IntervalOption = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface TimeBucket {
  start: Date;
  end: Date;
  label: string;
}

export interface CategoryBucketPoint {
  bucketLabel: string;
  bucketStart: Date;
  bucketEnd: Date;
  // Dynamic category keys will be added at runtime with hour values.
  [category: string]: string | number | Date;
}

/**
 * App-wide configuration snapshot stored inside IndexedDB.
 *
 * This lets us persist view-specific preferences (like Cats selections)
 * alongside event data instead of only in localStorage, so they survive
 * SPA navigation and future storage refactors.
 */
export interface ExocortexSettings {
  /** Most recently used categories on the Cats page (in display order). */
  catsSelectedCategories?: string[];
}

/**
 * IndexedDB Configuration Constants
 *
 * These constants define our IndexedDB database setup:
 *
 * IndexedDB is a browser API for storing large amounts of structured data.
 * It's like a mini-database that lives in the user's browser.
 *
 * - DB_NAME: Name of our database
 * - DB_VERSION: Version number for schema migrations
 * - STORE_NAME: Name of the object store (like a table in SQL)
 */
const DB_NAME = 'exocortex'; // Database name for our time tracking data
const DB_VERSION = 2; // Database version (increment when schema changes)
const STORE_NAME = 'events'; // Object store name for storing events
const SETTINGS_STORE = 'settings'; // Object store for app-level settings

/**
 * ExocortexDB Class
 *
 * This class manages all database operations for the time tracking app.
 * It provides a clean interface for working with IndexedDB.
 *
 * The class handles:
 * - Database initialization and schema creation
 * - Adding, updating, and deleting events
 * - Querying events by date ranges
 * - Getting the latest event for defaults
 */
export class ExocortexDB {
  /** Database instance (null until initialized) */
  private db: IDBDatabase | null = null;

  /** Helper to get a transaction, ensuring init() has run. */
  private getDb(): IDBDatabase {
    if (!this.db) throw new Error('Database not initialized');
    return this.db;
  }

  /**
   * Initialize Database
   *
   * Sets up the IndexedDB database and creates the object stores
   * if they don't exist yet.
   *
   * This method must be called before any other database operations.
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Open or create the database
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      // Handle database opening errors
      request.onerror = () => reject(request.error);

      // Handle successful database opening
      request.onsuccess = () => {
        this.db = request.result;
        resolve(); // Database is ready
      };

      /**
       * Handle Database Schema Creation/Updates
       *
       * This event fires when:
       * 1. Database doesn't exist yet (first time)
       * 2. Database version number is higher than existing
       */
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Existing events store
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('endTime', 'endTime', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        } else {
          // In case older versions were missing indexes, ensure they exist.
          const store = (event.currentTarget as IDBOpenDBRequest).transaction?.objectStore(STORE_NAME);
          if (store) {
            if (!store.indexNames.contains('endTime')) {
              store.createIndex('endTime', 'endTime', { unique: false });
            }
            if (!store.indexNames.contains('category')) {
              store.createIndex('category', 'category', { unique: false });
            }
          }
        }

        // New settings store (version 2+)
        if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
          db.createObjectStore(SETTINGS_STORE, { keyPath: 'key' });
        }
      };
    });
  }

  /** Load a small settings object from the settings store. */
  async getSettings(): Promise<ExocortexSettings> {
    const db = this.getDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SETTINGS_STORE], 'readonly');
      const store = tx.objectStore(SETTINGS_STORE);
      const request = store.get('app');

      request.onsuccess = () => {
        const value = request.result?.value as ExocortexSettings | undefined;
        resolve(value ?? {});
      };
      request.onerror = () => reject(request.error);
    });
  }

  /** Persist a partial settings update, shallow-merging into existing value. */
  async updateSettings(patch: Partial<ExocortexSettings>): Promise<void> {
    const db = this.getDb();
    const current = await this.getSettings();
    const next: ExocortexSettings = { ...current, ...patch };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([SETTINGS_STORE], 'readwrite');
      const store = tx.objectStore(SETTINGS_STORE);
      const request = store.put({ key: 'app', value: next });

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Add New Event
   *
   * Adds a new event to the database.
   * Generates a UUID for the event ID automatically.
   */
  async addEvent(event: Omit<ExocortexEvent, 'id'>): Promise<string> {
    const db = this.getDb();

    const id = crypto.randomUUID();
    const fullEvent: ExocortexEvent = { id, ...event };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      console.log('Adding to store ', fullEvent);
      const request = store.add(fullEvent);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getEventsByDate(date: string): Promise<ExocortexEvent[]> {
    const db = this.getDb();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('endTime');

      const request = index.openCursor(IDBKeyRange.bound(
        startOfDay.getTime(),
        endOfDay.getTime()
      ));

      const events: ExocortexEvent[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getEventsByDateRangeOnly(startDate: string, endDate: string): Promise<DayEvents[]> {
    const db = this.getDb();

    let start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    let end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    if (start > end) {
      const t = end;
      end = start;
      start = t;
    }

    const events: ExocortexEvent[] = await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('endTime');

      const request = index.openCursor(IDBKeyRange.bound(
        start.getTime(),
        end.getTime()
      ));

      const events: ExocortexEvent[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          events.push(cursor.value);
          cursor.continue();
        } else {
          resolve(events);
        }
      };

      request.onerror = () => reject(request.error);
    });

    const eventsByDate = new Map<string, ExocortexEvent[]>();

    events.forEach((event) => {
      const dateStr = new Date(event.endTime).toISOString().split('T')[0];
      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      eventsByDate.get(dateStr)!.push(event);
    });

    const days: DayEvents[] = [];
    for (const [dateStr, dayEvents] of eventsByDate) {
      days.push({ date: dateStr, events: dayEvents });
    }

    return days;
  }

  async eventsExist(): Promise<boolean> {
    const db = this.getDb();

    return new Promise((resolve, _reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('endTime');

      const request = index.openCursor(IDBKeyRange.bound(0, 999999999999999, true, true));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          resolve(true);
        } else {
          resolve(false);
        }
      };

      request.onerror = () => resolve(false);
    });
  }

  async getLatestEvent(): Promise<ExocortexEvent | null> {
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('endTime');

      const request = index.openCursor(null, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        resolve(cursor ? cursor.value : null);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getEventSummary(): Promise<EventSummary> {
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('endTime');

      let totalEvents = 0;
      let earliestEndTime: number | null = null;
      let latestEndTime: number | null = null;

      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const event = cursor.value as ExocortexEvent;
          totalEvents += 1;

          if (earliestEndTime === null || event.endTime < earliestEndTime) {
            earliestEndTime = event.endTime;
          }
          if (latestEndTime === null || event.endTime > latestEndTime) {
            latestEndTime = event.endTime;
          }

          cursor.continue();
        } else {
          resolve({ totalEvents, earliestEndTime, latestEndTime });
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async getAllEvents(): Promise<ExocortexEvent[]> {
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('endTime');

      const events: ExocortexEvent[] = [];
      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          events.push(cursor.value as ExocortexEvent);
          cursor.continue();
        } else {
          resolve(events);
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async updateEvent(id: string, updates: Omit<ExocortexEvent, 'id'>): Promise<void> {
    const db = this.getDb();

    const updatedEvent: ExocortexEvent = { id, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(updatedEvent);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteEvent(id: string): Promise<void> {
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllEvents(): Promise<void> {
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearEventsForDate(date: string): Promise<void> {
    const db = this.getDb();

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('endTime');

      const request = index.openCursor(IDBKeyRange.bound(
        startOfDay.getTime(),
        endOfDay.getTime()
      ));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async mergeCategories(fromCategories: string[], toCategory: string): Promise<void> {
    const db = this.getDb();

    const normalizedTargets = new Set(fromCategories.map((c) => c.trim()));
    const normalizedTo = toCategory.trim();

    if (normalizedTargets.size === 0 || !normalizedTo) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');

      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }

        const event = cursor.value as ExocortexEvent;
        const currentCategory = event.category.trim();

        if (normalizedTargets.has(currentCategory)) {
          const updated: ExocortexEvent = {
            ...event,
            category: normalizedTo,
          };
          cursor.update(updated);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async renameCategory(fromCategory: string, toCategory: string): Promise<void> {
    const db = this.getDb();

    const from = fromCategory.trim();
    const to = toCategory.trim();
    if (!from || !to || from === to) return;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');

      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }

        const event = cursor.value as ExocortexEvent;
        if (event.category.trim() === from) {
          const updated: ExocortexEvent = {
            ...event,
            category: to,
          };
          cursor.update(updated);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async mergeSimilarCategories(): Promise<void> {
    const db = this.getDb();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');

      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }

        const event = cursor.value as ExocortexEvent;
        const rawCategory = event.category ?? '';
        const trimmed = rawCategory.trim();

        if (!trimmed) {
          cursor.continue();
          return;
        }

        const canonical = `${trimmed.charAt(0).toLocaleUpperCase()}${trimmed
          .slice(1)
          .toLocaleLowerCase()}`;

        if (event.category !== canonical) {
          const updated: ExocortexEvent = {
            ...event,
            category: canonical,
          };
          cursor.update(updated);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  async generateCategoryNotes(category: string): Promise<string> {
    const notesByCategory: Record<string, string[]> = {
      Work: [
        'Productive morning session',
        'Good meetings with the team',
        'Made good progress on the project',
        'Challenging but rewarding work',
        'Focus was high today',
      ],
      Exercise: [
        'Great workout! Feeling energized',
        'Pushed myself harder than usual',
        'Nice and relaxing session',
        'Cardio felt good today',
        'Strength training was productive',
      ],
      Meal: [
        'Delicious and satisfying',
        'Healthy choice, feeling good',
        'Quick bite between tasks',
        'Enjoyed this meal',
        'Felt nourished and ready',
      ],
      Break: [
        'Needed this rest',
        'Quick recharge session',
        'Nice coffee break',
        'Mindful moment of peace',
        'Good time to reflect',
      ],
      Study: [
        'Learned something new',
        'Deep focus achieved',
        'Interesting material today',
        'Productive study session',
        'Challenging concepts clicked',
      ],
      Slack: [
        'Busy doing nothing',
        'Excellent doom scrolling',
        'Waiting till its times',
        'pottering around the kitchen',
        'Lazing on the sofa',
      ],
    };

    const categoryNotes = notesByCategory[category] || [
      'Interesting activity',
      'Good use of time',
      'Felt productive',
      'Nice moment today',
      'Time well spent',
    ];

    return categoryNotes[Math.floor(Math.random() * categoryNotes.length)];
  }

  async generateTestData(): Promise<string> {
    console.log('Generating Test Data');
    try {
      console.log('Clearing events');
      await this.clearAllEvents();

      const categories = ['Work', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);

      const events: Omit<any, 'id'>[] = [];

      for (
        let currentDate = new Date(startDate);
        currentDate <= endDate;
        currentDate.setDate(currentDate.getDate() + 1)
      ) {
        console.log('Doing Day ', currentDate);
        const dayEvents: Omit<any, 'id'>[] = [];

        const sleepStartHour = 20 + Math.floor(Math.random() * 3);
        const sleepStartMinute = Math.floor(Math.random() * 60);
        const sleepDurationHours = 7 + Math.random();

        const sleepStart = new Date(currentDate);
        sleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
        let sleepEnd = new Date(sleepStart.getTime() + sleepDurationHours * 60 * 60 * 1000);

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (sleepEnd >= today) {
          const maxDuration = today.getTime() - sleepStart.getTime();
          const adjustedDurationHours = Math.max(6, maxDuration / (60 * 60 * 1000) - 0.5);
          sleepEnd = new Date(sleepStart.getTime() + adjustedDurationHours * 60 * 60 * 1000);
        }

        const sleepEvent = {
          endTime: sleepEnd.getTime(),
          category: 'Sleep' as const,
          notes:
            Math.random() > 0.7
              ? [
                  'Had some interesting dreams',
                  'Woke up feeling refreshed',
                  'Slept through the night',
                  'A bit restless but okay',
                  'Deep sleep cycle felt good',
                ][Math.floor(Math.random() * 5)]
              : undefined,
          happiness: 0.8,
          wakefulness: Math.random() * 0.02,
          health: 0.9,
        };

        console.log('Pushing To Day ', sleepEvent);
        dayEvents.push(sleepEvent);

        let currentTime = new Date(currentDate);
        currentTime.setHours(7, 0, 0, 0);

        while (currentTime < sleepStart) {
          const timeUntilSleep = sleepStart.getTime() - currentTime.getTime();
          if (timeUntilSleep < 30 * 60 * 1000) break;

          const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilSleep - 30 * 60 * 1000);
          if (maxDuration <= 0) break;

          const durationMs =
            (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) *
            60 * 60 * 1000;
          const actualDuration = Math.min(durationMs, maxDuration);

          const category = categories[Math.floor(Math.random() * categories.length)];
          const happiness = Math.random() * 0.4 + 0.5;
          const wakefulness = Math.random() * 0.4 + 0.5;
          const health = Math.random() * 0.3 + 0.6;

          const eventEndTime = new Date(currentTime.getTime() + actualDuration);

          const event = {
            endTime: eventEndTime.getTime(),
            category,
            notes:
              Math.random() > 0.6
                ? await this.generateCategoryNotes(category)
                : undefined,
            happiness,
            wakefulness,
            health,
          };

          dayEvents.push(event);
          currentTime = new Date(
            eventEndTime.getTime() + Math.random() * 30 * 60 * 1000,
          );
        }
        console.log('Pushing all days events to events');
        events.push(...dayEvents);
      }

      for (const event of events) {
        console.log('Adding an event', event);
        await this.addEvent(event);
      }
      return `Successfully generated ${events.length} test events for the past 30 days`;
    } catch (error) {
      console.error('Failed to generate test data:', error);
      return 'Failed to generate test data. Please try again.';
    }
  }
}

// Utility functions
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getEventColor(
  event: ExocortexEvent,
  colorOverrides?: { category: string; hue: number }[],
): string {
  const override = colorOverrides?.find(
    (override) => override.category.trim() === event.category.trim(),
  );
  const hue = override ? override.hue : hashString(event.category.trim()) % 360;
  const saturation = Math.round(event.happiness * 100);
  const value = Math.round(event.wakefulness * 100);

  return `hsl(${hue}, ${saturation}%, ${value}%)`;
}

export function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEventDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export async function getEventStartTime(db: ExocortexDB, endTime: number): Promise<number | null> {
  const currentEnd = new Date(endTime);
  const currentDay = currentEnd.toISOString().split('T')[0];
  const previousDay = new Date(currentEnd);
  previousDay.setDate(previousDay.getDate() - 1);
  const previousDayStr = previousDay.toISOString().split('T')[0];

  const [currentDayEvents, previousDayEvents] = await Promise.all([
    db.getEventsByDate(currentDay),
    db.getEventsByDate(previousDayStr),
  ]);

  const allEvents = [...previousDayEvents, ...currentDayEvents].sort(
    (a, b) => a.endTime - b.endTime,
  );

  const previousEvent = allEvents
    .filter((event) => event.endTime < endTime)
    .sort((a, b) => b.endTime - a.endTime)[0];

  return previousEvent ? previousEvent.endTime : null;
}

export function getHourSlots(): string[] {
  const hours: string[] = [];
  for (let i = 0; i < 24; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
}
