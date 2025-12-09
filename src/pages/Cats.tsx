import React, { useEffect, useMemo, useState } from 'react';
// ... existing imports

// NOTE: file truncated for brevity in this view; only the changed effect is rewritten below.

// When the "merge similar" dialog is opened, build a preview of all
// groups of categories that only differ by case or surrounding whitespace.
useEffect(() => {
  if (!db || !similarOpen) {
    setSimilarGroups([]);
    return;
  }

  const controller = new AbortController();

  const run = async () => {
    try {
      const all = await db.getAllEvents();
      if (controller.signal.aborted) return;

      const grouped = new Map<string, { canonical: string; variants: Map<string, number> }>();

      for (const ev of all) {
        const raw = ev.category ?? '';
        const trimmed = raw.trim();

        // Treat empty/whitespace-only categories as "Slack" in the similar-cats preview.
        const effectiveTrimmed = trimmed || 'Slack';

        const key = effectiveTrimmed.toLocaleLowerCase();
        const canonical = `${effectiveTrimmed.charAt(0).toLocaleUpperCase()}${effectiveTrimmed
          .slice(1)
          .toLocaleLowerCase()}`;

        let entry = grouped.get(key);
        if (!entry) {
          entry = { canonical, variants: new Map<string, number>() };
          grouped.set(key, entry);
        }

        entry.canonical = canonical; // last write wins but all forms produce same canonical
        const current = entry.variants.get(raw || canonical) ?? 0;
        entry.variants.set(raw || canonical, current + 1);
      }

      const groups: SimilarCategoryGroup[] = [];
      for (const { canonical, variants } of grouped.values()) {
        // Only consider groups with more than one raw spelling recorded.
        if (variants.size <= 1) continue; // Nothing to merge, only one spelling

        let total = 0;
        const variantList: string[] = [];
        for (const [name, count] of variants.entries()) {
          variantList.push(name);
          total += count;
        }

        groups.push({
          canonical,
          variants: variantList.sort((a, b) => a.localeCompare(b)),
          estimatedEventCount: total,
        });
      }

      if (!controller.signal.aborted) {
        // Sort groups alphabetically by canonical name for stable UI
        groups.sort((a, b) => a.canonical.localeCompare(b.canonical));
        setSimilarGroups(groups);
      }
    } catch {
      if (!controller.signal.aborted) {
        setSimilarGroups([]);
      }
    }
  };

  void run();

  return () => {
    controller.abort();
  };
}, [db, similarOpen]);

// ... rest of file
