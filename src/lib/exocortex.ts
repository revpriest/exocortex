        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Merge categories across the entire database.
   *
   * Every event whose category matches any of the values in `fromCategories`
   * will be rewritten so that its category becomes `toCategory`.
   *
   * This is an irreversible operation at the storage level, so callers
   * should present a clear confirmation UI before invoking it.
   */
  async mergeCategories(fromCategories: string[], toCategory: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const normalizedTargets = new Set(fromCategories.map((c) => c.trim().toLocaleLowerCase() || 'slack'));
    const normalizedToRaw = toCategory.trim();
    const normalizedTo = (normalizedToRaw || 'Slack').trim();

    if (normalizedTargets.size === 0 || !normalizedTo) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('category');

      // We scan all events for the involved categories in a single cursor
      const request = index.openCursor();

      request.onsuccess = () => {
        const cursor = request.result as IDBCursorWithValue | null;
        if (!cursor) {
          resolve();
          return;
        }

        const event = cursor.value as ExocortexEvent;
        const currentRaw = event.category ?? '';
        const currentCategory = currentRaw.trim().toLocaleLowerCase() || 'slack';

        if (normalizedTargets.has(currentCategory)) {
          const updated: ExocortexEvent = {
            ...event,
            category: normalizedTo,
          };
          cursor.update(updated);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Rename a single category across the entire database.
   *
   * Every event whose category matches `fromCategory` (after trimming) will be
   * updated so that its category becomes `toCategory`.
   */
  async renameCategory(fromCategory: string, toCategory: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const from = fromCategory.trim();
    const to = toCategory.trim();
    if (!from || !to || from === to) return;

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
        if (event.category.trim() === from) {
          const updated: ExocortexEvent = {
            ...event,
            category: to,
          };
          cursor.update(updated);
        }

        cursor.continue();
      };

      request.onerror = () => reject(request.error);
    });
  }

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

        // If the category is empty after trimming, treat it as "Slack".
        const effectiveTrimmed = trimmed || 'Slack';

        const normalisedKey = effectiveTrimmed.toLocaleLowerCase();

        // Headline-case: first character upper, rest lower.
        const canonical = `${effectiveTrimmed.charAt(0).toLocaleUpperCase()}${effectiveTrimmed
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