/**
 * dataExport.ts - Import/Export Functionality
 *
 * ...[snip: previous code remains unchanged]...
 */

export class DataExporter {
  // ... (rest of code remains unchanged)

  /**
   * Import CSV File in Legacy Time Grid Format
   *
   * Accepts a CSV file with rows like:
   *   YYYY-MM-DD HH:MM,happiness,wakefulness,category
   * Where category may end with spaces and a dot – these are trimmed.
   * Handles tens of thousands of lines efficiently.
   */
  static async importCsvDatabase(db: ExocortexDB, file: File): Promise<void> {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

    let importedCount = 0;
    let skippedCount = 0;
    let minTime = Infinity;
    let maxTime = -Infinity;
    const timeSamples: number[] = [];
    const BATCH_SIZE = 100; // add in batches for heavy files
    let batch: Promise<string>[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = line.match(
        /^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}),(0?\.\d+|1\.0+),(0?\.\d+|1\.0+),(.+)$/
      );
      if (match) {
        let [_, dt, happiness, wakefulness, category] = match;
        category = category.replace(/[ .]+$/, "");
        const endTime = Date.parse(dt.replace(' ', 'T'));
        if (!isFinite(endTime)) {
          skippedCount++;
          continue;
        }
        if (importedCount < 5) timeSamples.push(endTime);    // sample first 5
        minTime = Math.min(minTime, endTime);
        maxTime = Math.max(maxTime, endTime);
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
        const health = 1.0;
        batch.push(
          db.addEvent({
            endTime,
            category,
            happiness: happinessNum,
            wakefulness: wakefulnessNum,
            health,
          })
        );
        importedCount++;
      } else {
        skippedCount++;
      }
      if (batch.length >= BATCH_SIZE) {
        await Promise.all(batch); // flush
        batch = [];
      }
    }
    if (batch.length) await Promise.all(batch);

    // Diagnostic logging
    function fmt(ts:number) { try { return new Date(ts).toISOString(); }catch{return ""} }
    console.log(`[CSV Import] Imported events:`, importedCount, " Skipped:", skippedCount);
    if (importedCount) {
      console.log(`[CSV Import] First sample endTime:`, timeSamples.map(fmt));
      console.log(`[CSV Import] Min endTime:`, fmt(minTime), "Max endTime:", fmt(maxTime));
    }
  }
}
