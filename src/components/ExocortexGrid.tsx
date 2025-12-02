// ...imports remain the same...

// Utility: Deduplicate days by date (keeping first encountered entry)
function dedupeDays(days: DayEvents[]): DayEvents[] {
  const seen = new Set<string>();
  const deduped: DayEvents[] = [];
  for (const day of days) {
    if (!seen.has(day.date)) {
      seen.add(day.date);
      deduped.push(day);
    }
  }
  return deduped;
}

// ...

export function ExocortexGrid({ className, refreshTrigger, db, skipDate, setSkipDate}: ExocortexGridProps) {
  // ...existing hooks/state

  // PATCHED: Infinite scroll (dedupe on setDays update)
  useEffect(() => {
    const initDaysChange = async () => {
      if (!loadingRef.current || !db) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && !loading) {
            const loadMoreDays = async () => {
              setLoading(true);
              const oldestDay = days[days.length - 1];
              let oldestDate = oldestDay ? new Date(oldestDay.date) : new Date();

              // Don't load data from more than 10 years ago
              const tenYearsAgo = new Date();
              tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);

              if (oldestDate < tenYearsAgo) {
                setLoading(false);
                return;
              }

              // Calculate the range for new days (load 7 days for better coverage)
              const daysToLoad = 7;
              const fromDate = new Date(oldestDate);
              fromDate.setDate(fromDate.getDate() - daysToLoad + 1);
              const allDaysInRange = await db.getEventsByDateRange(
                fromDate.toISOString().split('T')[0],
                oldestDate.toISOString().split('T')[0]
              );
              const existingDates = new Set(days.map(d => d.date));
              const newDays = allDaysInRange.filter(day => !existingDates.has(day.date));
              if (newDays.length > 0) {
                setDays(prev => dedupeDays([...prev, ...newDays]));
              }
              setLoading(false);
            };
            loadMoreDays().catch((error) => {
              console.error('Error in loadMoreDays:', error);
              setLoading(false);
              setError('Failed to load more days. Please try again.');
            });
          }
        },
        { threshold: 0.1 }
      );
      observerRef.current.observe(loadingRef.current);
      return () => { if (observerRef.current) observerRef.current.disconnect(); };
    };
    initDaysChange().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, [loading, days, db]);

  // PATCHED: Day change effect
  useEffect(() => {
    const checkDayChange = () => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      if (now.getDate() !== lastDayCheck.getDate() || now.getMonth() !== lastDayCheck.getMonth() || now.getFullYear() !== lastDayCheck.getFullYear()) {
        const hasToday = days.some(day => day.date === today);
        if (!hasToday && db) {
          setDays(prev => dedupeDays([{ date: today, events: [] }, ...prev]));
          setCurrentDate(now);
          setLastDayCheck(now);
        } else {
          setCurrentDate(now);
          setLastDayCheck(now);
        }
      }
    };
    const interval = setInterval(checkDayChange, 600000);
    checkDayChange();
    return () => clearInterval(interval);
  }, [days, db, lastDayCheck]);

  // PATCHED: updateDaysWithNewStartDay
  const updateDaysWithNewStartDay = async function(){
    // ...same logic...
    setDays(prev => {
      const newDays = [...prev];
      // ...mutations as before...
      return dedupeDays(newDays);
    });
  }

  // PATCHED: Initial load (initAll) and refresh handlers
  useEffect(() => {
    const initAll = async () => {
      // ...as before...
      setDays(dedupeDays(allDays));
      setLoading(false);
    };
    initAll().catch((error) => {
      console.error('Failed to initialize database:', error);
      setError('Failed to initialize database. Please refresh the page.');
    });
  }, [db]);

  // PATCHED: bulk setDays in skipDate/refreshTrigger handlers
  // wherever setDays(allDays) exists, use setDays(dedupeDays(allDays))
  //
  // --- All remaining logic and rendering as before...
}
