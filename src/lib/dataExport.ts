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
 */
export interface ExportData {
  /** Export format version for compatibility checking */
  version: string;
  /** ISO timestamp of when export was created */
  exportDate: string;
  /** All events from the database at time of export */
  events: ExocortexEvent[];
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
export class DataExporter {
  /**
   * Export Database to JSON File
   *
   * This method exports all events from the database to a downloadable JSON file.
   * It includes metadata for version tracking and export date information.
   *
   * Process:
   * 1. Query all events from database (wide date range for completeness)
   * 2. Create structured export data with metadata
   * 3. Convert to formatted JSON string
   * 4. Create Blob and trigger browser download
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
       */
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        events: allEvents
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
      link.download = `exocortex-export-${new Date().toISOString().split('T')[0]}.json`;

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
        } catch (error) {
          console.warn('Failed to import event:', event, error);
          // Continue with other events even if one fails
        }
      }

      console.log(`Successfully imported ${jsonData.events.length} events`);

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
          const isValid = jsonData.version && jsonData.events && Array.isArray(jsonData.events);
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