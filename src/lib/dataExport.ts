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
 * Defines the structure for localStorage-based app settings
 * that should be included in exports and imports.
 */
export interface AppSettings {
  /** Theme preference (light, dark, system) */
  theme?: string;
  /** Category color overrides */
  categoryColorOverrides?: { category: string; hue: number }[];
  /** Notification settings */
  notificationSettings?: {
    frequency: 'never' | 'hourly' | 'every-2-hours';
    exceptAtNight: boolean;
    nightStartHour: number;
    nightEndHour: number;
    silent: boolean;
  };
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
   * Safely extracts all relevant app settings from localStorage.
   * Handles errors gracefully if localStorage is unavailable or data is corrupted.
   *
   * @returns AppSettings object with all available settings
   */
  private static getAppSettings(): AppSettings {
    const settings: AppSettings = {};

    try {
      // Theme settings
      const theme = localStorage.getItem('exocortex-theme');
      if (theme) {
        settings.theme = theme;
      }

      // Category color overrides
      const colorOverrides = localStorage.getItem('exocortex-color-overrides');
      if (colorOverrides) {
        try {
          settings.categoryColorOverrides = JSON.parse(colorOverrides);
        } catch (e) {
          console.warn('Failed to parse color overrides from localStorage:', e);
        }
      }

      // Notification settings
      const notificationSettings = localStorage.getItem('exocortex-notification-settings');
      if (notificationSettings) {
        try {
          settings.notificationSettings = JSON.parse(notificationSettings);
        } catch (e) {
          console.warn('Failed to parse notification settings from localStorage:', e);
        }
      }

    } catch (error) {
      console.warn('Failed to access localStorage for settings export:', error);
    }

    return settings;
  }

  /**
   * Restore Application Settings to localStorage
   *
   * Safely restores app settings from an import to localStorage.
   * Only updates settings that are present in the import data.
   *
   * @param settings - AppSettings object to restore
   */
  private static restoreAppSettings(settings: AppSettings): void {
    if (!settings) return;

    try {
      // Restore theme settings
      if (settings.theme !== undefined) {
        localStorage.setItem('exocortex-theme', settings.theme);
      }

      // Restore category color overrides
      if (settings.categoryColorOverrides) {
        localStorage.setItem('exocortex-color-overrides', JSON.stringify(settings.categoryColorOverrides));
      }

      // Restore notification settings
      if (settings.notificationSettings) {
        localStorage.setItem('exocortex-notification-settings', JSON.stringify(settings.notificationSettings));
      }

    } catch (error) {
      console.warn('Failed to restore settings to localStorage:', error);
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
   * 1. Query all events from database (wide date range for completeness)
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
      // Array to hold all events from database
      const allEvents: ExocortexEvent[] = [];

      /**
       * Get Wide Date Range
       *
       * We query a wide date range (10 years) to ensure we get all events.
       * This is simpler than trying to determine the exact date range of events.
       */
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5); // Go back 5 years

      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 5); // Go forward 5 years

      // Query database for all events in range
      const days = await db.getEventsByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );

      // Collect all events from all days into single array
      days.forEach(day => {
        allEvents.push(...day.events);
      });

      /**
       * Create Export Data Structure
       *
       * We structure the export with metadata for future compatibility:
       * - Version: Allows us to handle format changes in future imports
       * - Export date: Helps users track when backup was made
       * - Events: The actual data array
       * - Settings: Application settings from localStorage
       */
      const exportData: ExportData = {
        version: '2.0', // Updated version for settings inclusion
        exportDate: new Date().toISOString(),
        events: allEvents,
        settings: this.getAppSettings()
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
      for (const event of jsonData.events) {
        try {
          await db.addEvent({
            endTime: event.endTime,
            category: event.category,
            notes: event.notes,
            happiness: event.happiness,
            wakefulness: event.wakefulness,
            health: event.health
          });
          successCount++;
        } catch (error) {
          console.warn('Failed to import event:', event, error);
          // Continue with other events even if one fails
        }
      }

      console.log(`Successfully imported ${successCount} of ${jsonData.events.length} events`);

      // Restore settings if they exist (version 2.0+)
      if (jsonData.version === '2.0' && jsonData.settings) {
        this.restoreAppSettings(jsonData.settings);
        console.log('Successfully restored application settings');
      } else if (jsonData.version === '1.0') {
        console.log('Imported version 1.0 file (settings not included in old format)');
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
          const hasBasicStructure = jsonData.version && jsonData.events && Array.isArray(jsonData.events);

          // Additional validation for version 2.0+ if settings are present
          const hasValidSettings = jsonData.version === '2.0' ?
            (jsonData.settings === undefined || typeof jsonData.settings === 'object') : true;

          resolve(hasBasicStructure && hasValidSettings);
        } catch {
          resolve(false);
        }
      };

      reader.onerror = () => resolve(false);

      reader.readAsText(file);
    });
  }

  /**
   * Import Legacy Database from Old Format
   *
   * This method imports data from the legacy Exocortex format and converts it
   * to the new format, handling the schema differences:
   * - Converts tags to categories
   - Combines multiple tags per event into combined category names
   - Maps old fields to new fields (importance → happiness, sets health to 100%)
   - Handles microsecond timestamps
   * - Ignores location data
   *
   * @param db - The ExocortexDB instance to import into
   * @param file - The legacy JSON file to import
   * @returns Promise that resolves when import is complete
   */
  static async importLegacyDatabase(db: ExocortexDB, file: File): Promise<void> {
    try {
      // Read and parse the legacy JSON file
      const text = await file.text();
      const jsonData = JSON.parse(text);

      // Validate legacy format
      if (!jsonData.tag || !jsonData.event || !jsonData.event_tag) {
        throw new Error('Invalid legacy export file format. Missing required fields: tag, event, or event_tag');
      }

      console.log('📥 Starting legacy import...');
      console.log('📋 Legacy file structure:', {
        tagCount: jsonData.tag?.length || 0,
        eventCount: jsonData.event?.length || 0,
        eventTagCount: jsonData.event_tag?.length || 0,
        sampleEvent: jsonData.event?.[0] || 'none',
        sampleTag: jsonData.tag?.[0] || 'none'
      });

      // Create tag lookup map (ID → name)
      const tagMap = new Map<string, string>();
      jsonData.tag.forEach((tag: any) => {
        if (tag.id && tag.name) {
          tagMap.set(tag.id, tag.name);
        }
      });

      console.log(`🏷️ Loaded ${tagMap.size} categories from legacy data`);

      // Create event → tags map
      const eventTagsMap = new Map<string, string[]>();
      jsonData.event_tag.forEach((eventTag: any) => {
        if (eventTag.event && eventTag.tag) {
          if (!eventTagsMap.has(eventTag.event)) {
            eventTagsMap.set(eventTag.event, []);
          }
          const tagName = tagMap.get(eventTag.tag);
          if (tagName) {
            eventTagsMap.get(eventTag.event)!.push(tagName);
          }
        }
      });

      // Process and import events
      let importedCount = 0;
      let skippedCount = 0;

      for (const legacyEvent of jsonData.event) {
        try {
          // Get tags for this event (categories)
          const tags = eventTagsMap.get(legacyEvent.id) || [];

          // Create combined category name
          let category = tags.length > 0
            ? tags.join(' / ')
            : 'Uncategorized';

          // Parse happiness (old format uses string, map to 0-1 range)
          let happiness = 0.5; // default (50% in 0-1 range)
          if (legacyEvent.happiness) {
            const happinessValue = parseInt(legacyEvent.happiness);
            if (!isNaN(happinessValue)) {
              // Map from -100..100 range to 0..1 range (50% at 0, 0% at -100, 100% at +100)
              happiness = (happinessValue + 100) / 200;
              happiness = Math.max(0, Math.min(1, happiness)); // clamp to 0-1
            }
          }

          // Parse wakefulness from importance field (old importance maps to wakefulness)
          let wakefulness = 0.8; // default to reasonably awake (80% in 0-1 range)
          if (legacyEvent.importance) {
            const importanceValue = parseInt(legacyEvent.importance);
            if (!isNaN(importanceValue)) {
              // Map from -100..100 range to 0..1 range (50% at 0, 0% at -100, 100% at +100)
              wakefulness = (importanceValue + 100) / 200;
              // Scale up wakefulness by 2x to affect smiley face eyes appearance
              wakefulness = wakefulness * 2;
              wakefulness = Math.max(0, Math.min(1, wakefulness)); // clamp to 0-1
            }
          }

          // Debug log the conversion
          console.log(`🔄 Event ${legacyEvent.id}:`, {
            original: {
              happiness: legacyEvent.happiness,
              importance: legacyEvent.importance
            },
            converted: {
              happiness: `${happiness} (${Math.round(happiness * 100)}%)`,
              wakefulness: `${wakefulness} (${Math.round(wakefulness * 100)}%) × 2 scaled`,
              health: '1.0 (100%)'
            },
            category: category
          });

          // Health is always 100% in legacy import (not tracked in old format)
          const health = 1.0;

          // Parse end time (handle both seconds and milliseconds)
          let endTime = legacyEvent.end;
          if (endTime && endTime < 1000000000000) {
            // If it looks like seconds, convert to milliseconds
            endTime = endTime * 1000;
          }

          // Skip events without valid end time
          if (!endTime || endTime <= 0) {
            console.warn('⚠️ Skipping event with invalid end time:', legacyEvent.id);
            skippedCount++;
            continue;
          }

          // Import the event
          await db.addEvent({
            endTime: endTime,
            category: category,
            notes: legacyEvent.text || undefined, // use text field as notes if present
            happiness: happiness,
            wakefulness: wakefulness,
            health: health
          });

          importedCount++;
        } catch (error) {
          console.warn('⚠️ Failed to import legacy event:', legacyEvent.id, error);
          skippedCount++;
          // Continue with other events even if one fails
        }
      }

      console.log(`✅ Successfully imported ${importedCount} events`);
      if (skippedCount > 0) {
        console.warn(`⚠️ Skipped ${skippedCount} events due to errors`);
      }

    } catch (error) {
      console.error('❌ Failed to import legacy database:', error);
      if (error instanceof SyntaxError) {
        throw new Error('Invalid JSON file. Please select a valid legacy exocortex export file.');
      }
      throw error;
    }
  }

  /**
   * Validate Legacy Export File
   *
   * Checks if a file is in the legacy Exocortex format by looking for
   * the required fields: tag, event, and event_tag.
   *
   * @param file - The file to validate
   * @returns Promise that resolves to true if valid legacy format
   */
  static async validateLegacyFile(file: File): Promise<boolean> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string);
          const isValid = jsonData.tag && jsonData.event && jsonData.event_tag &&
            Array.isArray(jsonData.tag) && Array.isArray(jsonData.event) && Array.isArray(jsonData.event_tag);
          resolve(isValid);
        } catch {
          resolve(false);
        }
      };

      reader.onerror = () => resolve(false);

      reader.readAsText(file);
    });
  }
}