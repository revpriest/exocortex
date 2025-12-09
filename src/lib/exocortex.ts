  /**
   * Merge all categories that are effectively the same name but differ only in
   * case or surrounding whitespace.
   *
   * For example: "work", " Work ", and "WORK" will all be merged into
   * "Work". The headline-case form (first letter uppercase, rest lowercase)
   * is used as the canonical category name.
   *
   * This scans all events once and rewrites any that are using a non-canonical
   * variant.
   */
  async mergeSimilarCategories(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');

      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }

        const event = cursor.value as ExocortexEvent;
        const rawCategory = event.category ?? '';
        const trimmed = rawCategory.trim();

        // If the category is empty after trimming, leave it as-is for now.
        if (!trimmed) {
          cursor.continue();
          return;
        }

        // Headline-case: first character upper, rest lower.
        const canonical = `${trimmed.charAt(0).toLocaleUpperCase()}${trimmed
          .slice(1)
          .toLocaleLowerCase()}`;

        if (event.category !== canonical) {
          const updated: ExocortexEvent = {
            ...event,
            category: canonical,
          };
          cursor.update(updated);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }
