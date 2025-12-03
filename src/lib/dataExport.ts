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
  // ... (rest of code remains unchanged)

  /**
   * Import CSV File in Legacy Time Grid Format
   *
   * Accepts a CSV file with rows like:
   *   YYYY-MM-DD HH:MM,happiness,wakefulness,category
   * Where category may end with spaces and a dot – these are trimmed.
   * Handles tens of thousands of lines efficiently.
   * @param db - The ExocortexDB instance to import into
   * @param file - The CSV file to import
   */
  static async importCsvDatabase(db: ExocortexDB, file: File): Promise<void> {
    // Read full file as text
    const text = await file.text();
    // Split to non-empty lines
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    let importedCount = 0;
    let skippedCount = 0;
    const BATCH_SIZE = 100; // add in batches for heavy files
    let batch: Promise<string>[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Each row: YYYY-MM-DD HH:MM,happiness,wakefulness,category
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}),(0?\.\d+|1\.0+),(0?\.\d+|1\.0+),(.+)$/
      );
      if (match) {
        let [_, dt, happiness, wakefulness, category] = match;
        // Remove all trailing spaces and final dot from category
        category = category.replace(/[ .]+$/, "");

        // Parse endTime as ms since epoch
        const endTime = Date.parse(dt.replace(' ', 'T'));
        if (!isFinite(endTime)) {
          skippedCount++;
          continue;
        }
        const happinessNum = Number(happiness);
        const wakefulnessNum = Number(wakefulness);
        if (
          isNaN(happinessNum) ||
          isNaN(wakefulnessNum) ||
          happinessNum < 0 ||
          happinessNum > 1 ||
          wakefulnessNum < 0 ||
          wakefulnessNum > 1
        ) {
          skippedCount++;
          continue;
        }
        // health: always 1.0 for imported legacy CSV
        const health = 1.0;
        // No notes available in CSV
        batch.push(
          db.addEvent({
            endTime,
            category,
            happiness: happinessNum,
            wakefulness: wakefulnessNum,
            health,
          })
        );
      } else {
        skippedCount++;
      }
      if (batch.length >= BATCH_SIZE) {
        await Promise.all(batch); // flush
        batch = [];
      }
    }
    if (batch.length) await Promise.all(batch);
  }
}
