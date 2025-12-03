/**
 * dataExport.ts - Import/Export Functionality
 *
 * This file handles data backup and restoration for the time tracking app.
 * It provides functionality to:
 *
 * - Export all events to a JSON file for backup
 * - Import events from a previously saved JSON file
 * - Validate imported data to prevent corruption
 * - Handle file operations in a browser-compatible way
 *
 * This ensures users can back up their data and move it between
 * devices or browsers safely.
 */

// Import our data types and database class
import { ExocortexEvent, ExocortexDB } from './exocortex';

/**
 * Export Data Structure Interface
 *
 * This defines the format of our exported JSON files.
 * It includes metadata and version information for future compatibility.
 *
 * Properties:
 * - version: Export format version (for migration support)
 * - exportDate: When the export was created (ISO string)
 * - events: Array of all events in the database
 * - settings: Application settings from localStorage
 */
export interface ExportData {
  /** Export format version for compatibility checking */
  version: string;
  /** ISO timestamp of when export was created */
  exportDate: string;
  /** All events from the database at time of export */
  events: ExocortexEvent[];
  /** Application settings from localStorage */
  settings?: AppSettings;
}

/**
 * Application Settings Interface
 *
 * Dynamic interface for localStorage-based app settings.
 * This uses index signatures to allow any localStorage keys
 * with 'exocortex-' prefix to be automatically included.
 */
export interface AppSettings {
  /** Dynamic settings object with string keys and any values */
  [key: string]: any;
}

/**
 * DataExporter Class
 *
 * This static class handles all import/export operations.
 * It doesn't need instantiation - just call methods directly.
 *
 * Methods:
 * - exportDatabase: Save all events to JSON file
 * - importDatabase: Load events from JSON file
 * - validateExportFile: Check if file is valid export format
 */
/**
 * DataImporter Class
 *
 * Handles importing new format data files (alias for DataExporter's import functionality)
 */
export class DataImporter {
  static async importDatabase(db: ExocortexDB, file: File): Promise<void> {
    return DataExporter.importDatabase(db, file);
  }

  static async validateFile(file: File): Promise<boolean> {
    return DataExporter.validateExportFile(file);
  }
}

export class DataExporter {
  /**
   * Get Application Settings from localStorage
   *
   * Automatically detects and extracts all exocortex app settings from localStorage.
   * Uses the 'exocortex-' prefix to identify relevant settings keys.
   * Handles errors gracefully if localStorage is unavailable or data is corrupted.
   *
   * @returns AppSettings object with all available settings
   */
  private static getAppSettings(): AppSettings {
    const settings: AppSettings = {};

    try {
      // Get all localStorage keys
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);

        // Only include keys with our app prefix
        if (key && key.startsWith('exocortex-')) {
          const value = localStorage.getItem(key);

          if (value !== null) {
            try {
              // Try to parse as JSON, if fails keep as string
              const parsedValue = JSON.parse(value);
              settings[key] = parsedValue;
            } catch {
              // If not valid JSON, store as raw string
              settings[key] = value;
            }
          }
        }
      }

      console.log('Auto-detected settings for export:', Object.keys(settings));
    } catch (error) {
      console.warn('Failed to access localStorage for settings export:', error);
    }

    return settings;
  }

  /**
   * Restore Application Settings to localStorage
   *
   * Automatically restores all exocortex app settings from import to localStorage.
   * Handles both string and JSON values appropriately.
   * Only updates settings that are present in the import data.
   *
   * @param settings - AppSettings object to restore
   */
  private static restoreAppSettings(settings: AppSettings): void {
    if (!settings) return;

    const restoredKeys: string[] = [];
    const errorKeys: string[] = [];

    try {
      // Restore all settings from the import
      for (const [key, value] of Object.entries(settings)) {
        // Only restore keys with our app prefix (as a safety check)
        if (key.startsWith('exocortex-')) {
          try {
            // Store value as JSON string (works for both objects and primitives)
            localStorage.setItem(key, JSON.stringify(value));
            restoredKeys.push(key);
          } catch (error) {
            console.warn(`Failed to restore setting ${key}:`, error);
            errorKeys.push(key);
          }
        } else {
          console.warn(`Skipping non-exocortex key during restore: ${key}`);
        }
      }

      console.log(`Successfully restored ${restoredKeys.length} settings:`, restoredKeys);
      if (errorKeys.length > 0) {
        console.warn(`Failed to restore ${errorKeys.length} settings:`, errorKeys);
      }
    } catch (error) {
      console.warn('Failed to restore settings to localStorage:', error);
    }
  }

  /**
   * Helper to track and clear days during imports.
   *
   * Given an endTime, computes its YYYY-MM-DD date string. If this date
   * has not been seen during the current import, it will clear all
   * existing events in the database for that day before resolving.
   */
  private static async ensureDayCleared(
    db: ExocortexDB,
    endTime: number,
    seenDays: Set<string>,
  ): Promise<void> {
    const dateStr = new Date(endTime).toISOString().split('T')[0];
    if (!seenDays.has(dateStr)) {
      await db.clearEventsForDate(dateStr);
      seenDays.add(dateStr);
    }
  }

  /**
   * Export Database to JSON File
   *
   * This method exports all events from the database to a downloadable JSON file.
   * It includes metadata for version tracking and export date information.
   * It also exports application settings from localStorage.
   *
   * Process:
   * 1. Query all events from database
   * 2. Collect application settings from localStorage
   * 3. Create structured export data with metadata
   * 4. Convert to formatted JSON string
   * 5. Create Blob and trigger browser download
   *
   * @param db - The ExocortexDB instance to export from
   * @returns Promise that resolves when export is complete
   */
  static async exportDatabase(db: ExocortexDB): Promise<void> {
    try {
      // Get all events from database (no date range assumptions)
      const allEvents: ExocortexEvent[] = await db.getAllEvents();

      /**
       * Create Export Data Structure
       *
       * We structure the export with metadata for future compatibility:
       * - Version: Allows us to handle format changes in future imports
       * - Export date: Helps users track when backup was made
       * - Events: The actual data array
       * - Settings: Application settings from localStorage (auto-detected)
       */
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        events: allEvents.map(event => ({
          ...event,
          category: event.category.trim(),
        })),
        settings: this.getAppSettings(),
      };

      // Convert JavaScript object to formatted JSON string
      const jsonData = JSON.stringify(exportData, null, 2);

      /**
       * Create Downloadable File
       *
       * Browser file download process:
       * 1. Create Blob (Binary Large Object) from JSON string
       * 2. Create object URL for the Blob
       * 3. Create temporary link element
       * 4. Set download filename with current date
       * 5. Trigger click to start download
       */
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `exocortexlog-export-${new Date().toISOString().split('T')[0]}.json`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export database:', error);
      throw new Error('Failed to export database');
    }
  }

  static async importDatabase(db: ExocortexDB, file: File): Promise<void> {
    try {
      // Read file content
      const text = await file.text();
      const jsonData = JSON.parse(text) as ExportData;

      // Validate export data structure
      if (!jsonData.version || !jsonData.events || !Array.isArray(jsonData.events)) {
        throw new Error('Invalid export file format');
      }

      // Import all events
      let successCount = 0;
      const seenDays = new Set<string>();
      for (const event of jsonData.events) {
        try {
          await this.ensureDayCleared(db, event.endTime, seenDays);
          await db.addEvent({
            endTime: event.endTime,
            category: event.category,
            notes: event.notes,
            happiness: event.happiness,
            wakefulness: event.wakefulness,
            health: event.health,
          });
          successCount++;
        } catch (error) {
          console.warn('Failed to import event:', event, error);
          // Continue with other events even if one fails
        }
      }

      console.log(`Successfully imported ${successCount} of ${jsonData.events.length} events`);

      // Restore settings if they exist (even in 1.0 files, since you're pre-release)
      if (jsonData.settings) {
        this.restoreAppSettings(jsonData.settings);
        console.log('Successfully restored application settings');
      } else if (jsonData.version === '1.0') {
        console.log('Imported version 1.0 file without settings');
      } else {
        console.log('No settings found in import file or unsupported version');
      }
    } catch (error) {
      console.error('Failed to import database:', error);
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON file. Please select a valid exocortex export file.');
      }
      throw error;
    }
  }

  static async validateExportFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          // Basic validation - must have version and events array
          const hasBasicStructure =
            jsonData.version && jsonData.events && Array.isArray(jsonData.events);

          // Additional validation for settings if present
          let hasValidSettings = true;
          if (jsonData.settings) {
            hasValidSettings =
              typeof jsonData.settings === 'object' && jsonData.settings !== null;
          }

          resolve(hasBasicStructure && hasValidSettings);
        } catch {
          resolve(false);
        }
      };

      reader.onerror = () => resolve(false);

      reader.readAsText(file);
    });
  }

}
