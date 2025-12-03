/**
 * exocortex.ts - Core Data Management and Types
 *
 * ...[snip unchanged declarations above]...
 */

export class ExocortexDB {
  /** Database instance (null until initialized) */
  private db: IDBDatabase | null = null;

  // ... (all other methods unchanged)

  /**
   * Returns true if database contains at least one event, false if empty.
   * This is the correct check for new-user onboarding logic.
   */
  async hasAnyEvents(): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      // Open a single cursor with no bound/query: returns first event found
      const request = store.openCursor();
      request.onsuccess = () => {
        resolve(!!request.result);
      };
      request.onerror = () => reject(request.error);
    });
  }
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

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

export function getHourSlots(): string[] {
  const hours:any = [];
  for (let i = 0; i < 24; i++) {
    hours.push(`${i.toString().padStart(2, '0')}:00`);
  }
  return hours;
}
