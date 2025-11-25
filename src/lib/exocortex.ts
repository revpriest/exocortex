// Types for the exocortex time tracking app
export interface ExocortexEvent {
  id: string;
  endTime: number; // Unix timestamp in milliseconds
  category: string;
  happiness: number; // 0-1 float
  wakefulness: number; // 0-1 float
  health: number; // 0-1 float
}

export interface DayEvents {
  date: string; // YYYY-MM-DD format
  events: ExocortexEvent[];
}

// IndexedDB setup
const DB_NAME = 'exocortex';
const DB_VERSION = 1;
const STORE_NAME = 'events';

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

  async addEvent(event: Omit<ExocortexEvent, 'id'>): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');
    
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
    const days: DayEvents[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);
    
    while (current <= end) {
      const dateStr = current.toISOString().split('T')[0];
      const events = await this.getEventsByDate(dateStr);
      days.push({ date: dateStr, events });
      current.setDate(current.getDate() + 1);
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

export function getEventColor(event: ExocortexEvent): string {
  const hue = (hashString(event.category) % 360);
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