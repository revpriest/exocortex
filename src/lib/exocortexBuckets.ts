import type { ExocortexEvent, IntervalOption, TimeBucket, CategoryBucketPoint } from './exocortex';
import { addDays, addMonths, endOfDay, format, startOfDay } from 'date-fns';

export function computeBuckets(
  start: Date,
  interval: IntervalOption,
  bucketCount = 60,
): TimeBucket[] {
  const buckets: TimeBucket[] = [];
  let cursor = startOfDay(start);

  const advance = (date: Date): Date => {
    switch (interval) {
      case 'daily':
        return addDays(date, 1);
      case 'weekly':
        return addDays(date, 7);
      case 'monthly':
        return addMonths(date, 1);
      case 'yearly':
        return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    }
  };

  for (let i = 0; i < bucketCount; i++) {
    const startAt = cursor;
    const endAt = endOfDay(advance(cursor));
    let label: string;
    switch (interval) {
      case 'daily':
        label = format(startAt, 'MMM d');
        break;
      case 'weekly':
        label = format(startAt, 'yyyy-MM-dd');
        break;
      case 'monthly':
        label = format(startAt, 'MMM yyyy');
        break;
      case 'yearly':
        label = format(startAt, 'yyyy');
        break;
    }
    buckets.push({ start: startAt, end: endAt, label });
    cursor = advance(cursor);
  }

  return buckets;
}

export function computeCategorySeries(
  buckets: TimeBucket[],
  events: ExocortexEvent[],
  categories: string[],
  options?: { includeOther?: boolean },
): CategoryBucketPoint[] {
  if (events.length === 0 || categories.length === 0) return [];

  // Events are already modeled as contiguous segments: each event represents
  // the time between the previous event's endTime and its own endTime. This
  // is the same model used elsewhere in the app (search, summary etc), so we
  // simply respect that ordering here.
  const sorted = [...events].sort((a, b) => a.endTime - b.endTime);

  const points: CategoryBucketPoint[] = buckets.map((b) => ({
    bucketLabel: b.label,
    bucketStart: b.start,
    bucketEnd: b.end,
  }));

  // baseline 0 for each selected category in each bucket
  for (const bucket of buckets) {
    const point = points.find((p) => p.bucketLabel === bucket.label)!;
    for (const cat of categories) {
      if (point[cat] == null) point[cat] = 0;
    }
  }

  const bucketCount = buckets.length;

  for (let i = 0; i < sorted.length; i++) {
    const current = sorted[i];
    const previous = i > 0 ? sorted[i - 1] : null;

    const segStart = previous ? previous.endTime : current.endTime;
    const segEnd = current.endTime;
    if (segEnd <= segStart) continue;

    for (let b = 0; b < bucketCount; b++) {
      const bucket = buckets[b];
      const overlapStart = Math.max(segStart, bucket.start.getTime());
      const overlapEnd = Math.min(segEnd, bucket.end.getTime());
      if (overlapEnd <= overlapStart) continue;

      const hours = (overlapEnd - overlapStart) / (1000 * 60 * 60);
      const point = points[b];
      const catKey = current.category;
      point[catKey] = ((point[catKey] as number | undefined) ?? 0) + hours;
    }
  }

  if (options?.includeOther) {
    for (let b = 0; b < bucketCount; b++) {
      const bucket = buckets[b];
      const point = points[b];
      const bucketHours = (bucket.end.getTime() - bucket.start.getTime()) / (1000 * 60 * 60);

      let selectedSum = 0;
      for (const cat of categories) {
        selectedSum += (point[cat] as number | undefined) ?? 0;
      }

      const other = Math.max(bucketHours - selectedSum, 0);
      (point as Record<string, number>)["__other__"] = other;
    }
  }

  return points;
}
