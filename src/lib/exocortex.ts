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
const DB_VERSION = 1; // Database version (increment when schema changes)
const STORE_NAME = 'events'; // Object store name for storing events

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

  /**
   * Initialize Database
   *
   * Sets up the IndexedDB database and creates the object store
   * if it doesn't exist yet.
   *
   * This method must be called before any other database operations.
   *
   * @returns Promise that resolves when database is ready
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
       *
       * This is where we define our "table schema":
       * - Create object store (like a table)
       * - Create indexes for efficient querying
       */
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create the events store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          /**
           * Create Object Store
           *
           * This is like creating a table in a SQL database.
           *
           * - keyPath: 'id' means the 'id' field is the primary key
           * - autoIncrement: false because we generate our own UUIDs
           */
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          /**
           * Create Indexes for Efficient Querying
           *
           * Indexes are like indexes in SQL - they make queries faster.
           *
           * endTime index: Allows us to efficiently query events by time
           * category index: Allows us to efficiently filter by activity type
           *
           * unique: false means multiple events can have the same endTime or category
           */
          store.createIndex('endTime', 'endTime', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }

  /**
   * Add New Event
   *
   * Adds a new event to the database.
   * Generates a UUID for the event ID automatically.
   *
   * @param event - Event data without an id field
   * @returns Promise that resolves to the generated event ID
   */
  async addEvent(event: Omit<ExocortexEvent, 'id'>): Promise<string> {
    // Ensure database is initialized
    if (!this.db) throw new Error('Database not initialized');

    // Generate unique identifier for the event
    const id = crypto.randomUUID();
    const fullEvent: ExocortexEvent = { id, ...event };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.add(fullEvent);

      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  }

  async getEventsByDate(date: string): Promise<ExocortexEvent[]> {
    if (!this.db) throw new Error('Database not initialized');

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
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

  async getEventsByDateRange(startDate: string, endDate: string): Promise<DayEvents[]> {
    if (!this.db) throw new Error('Database not initialized');

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Single query to get all events for the date range
    const events: ExocortexEvent[] = await new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
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

    // Group events by date in JavaScript (more efficient than multiple DB queries)
    const eventsByDate = new Map<string, ExocortexEvent[]>();

    events.forEach(event => {
      const dateStr = new Date(event.endTime).toISOString().split('T')[0];
      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      eventsByDate.get(dateStr)!.push(event);
    });

    // Create DayEvents array with all dates in range (even those without events)
    const days: DayEvents[] = [];
    const current = new Date(startDate);
    const endDateObj = new Date(endDate);

    while (current <= endDateObj) {
      const dateStr = current.toISOString().split('T')[0];
      const dayEvents = eventsByDate.get(dateStr) || [];
      days.push({ date: dateStr, events: dayEvents });
      current.setDate(current.getDate() + 1);
    }

    return days;
  }

  async getEventsByDateRangeOnly(startDate: string, endDate: string): Promise<DayEvents[]> {
    if (!this.db) throw new Error('Database not initialized');

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);

    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Single query to get all events for the date range
    const events: ExocortexEvent[] = await new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
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

    // Group events by date - ONLY include dates that have events
    const eventsByDate = new Map<string, ExocortexEvent[]>();

    events.forEach(event => {
      const dateStr = new Date(event.endTime).toISOString().split('T')[0];
      if (!eventsByDate.has(dateStr)) {
        eventsByDate.set(dateStr, []);
      }
      eventsByDate.get(dateStr)!.push(event);
    });

    // Create DayEvents array ONLY with dates that have events
    const days: DayEvents[] = [];
    for (const [dateStr, dayEvents] of eventsByDate) {
      days.push({ date: dateStr, events: dayEvents });
    }

    return days;
  }

  async getLatestEvent(): Promise<ExocortexEvent | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
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

  async updateEvent(id: string, updates: Omit<ExocortexEvent, 'id'>): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const updatedEvent: ExocortexEvent = { id, ...updates };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.put(updatedEvent);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteEvent(id: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clearAllEvents(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

// Utility functions
export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getEventColor(event: ExocortexEvent, colorOverrides?: { category: string; hue: number }[]): string {
  // Find custom hue for this category if it exists
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
  const hours = [];
  for (let i = 0; i < 24; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
}