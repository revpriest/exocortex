import { ExocortexEvent, ExocortexDB } from './exocortex';

export interface ExportData {
  version: string;
  exportDate: string;
  events: ExocortexEvent[];
}

export class DataExporter {
  static async exportDatabase(db: ExocortexDB): Promise<void> {
    try {
      // Get all events from the database
      const allEvents: ExocortexEvent[] = [];
      
      // We need to get events from all dates. For simplicity, let's get a wide range
      const startDate = new Date();
      startDate.setFullYear(startDate.getFullYear() - 5); // Go back 5 years
      
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 5); // Go forward 5 years
      
      const days = await db.getEventsByDateRange(
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      // Collect all events
      days.forEach(day => {
        allEvents.push(...day.events);
      });

      // Create export data structure
      const exportData: ExportData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        events: allEvents
      };

      // Convert to JSON
      const jsonData = JSON.stringify(exportData, null, 2);
      
      // Create and trigger download
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

      // Clear existing events (optional - you might want to ask user)
      // For now, we'll just add the imported events
      
      // Import all events
      for (const event of jsonData.events) {
        try {
          await db.addEvent({
            endTime: event.endTime,
            category: event.category,
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

  static validateExportFile(file: File): Promise<boolean> {
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