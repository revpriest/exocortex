import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExocortexDB } from '@/lib/exocortex';

export const usePageData = () => {
  const navigate = useNavigate();
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Check if there's existing data
  useEffect(() => {
    const checkForData = async () => {
      try {
        const database = new ExocortexDB();
        await database.init();

        // Check today and past few days for events
        const today = new Date().toISOString().split('T')[0];
        const todayEvents = await database.getEventsByDate(today);

        if (todayEvents.length > 0) {
          setHasData(true);
          return;
        }

        // Check past 7 days
        for (let i = 1; i <= 7; i++) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          const events = await database.getEventsByDate(dateStr);

          if (events.length > 0) {
            setHasData(true);
            return;
          }
        }

        setHasData(false);
      } catch (error) {
        console.error('Failed to check database:', error);
        setHasData(false);
      }
    };

    checkForData();
  }, []);

  const handleStartWithTestData = async () => {
    setIsGenerating(true);
    try {
      const database = new ExocortexDB();
      await database.init();

      // Clear existing data first
      await database.clearAllEvents();

      // Categories for test data
      const categories = ['Work', 'Exercise', 'Meal', 'Break', 'Study', 'Slack'];

      // Generate events for the past 7 days
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1); // Yesterday
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7); // 7 days ago

      const events: Omit<any, 'id'>[] = [];

      // Generate events for each day
      for (let currentDate = new Date(startDate); currentDate <= endDate; currentDate.setDate(currentDate.getDate() + 1)) {
        const dayEvents: Omit<any, 'id'>[] = [];

        // Create sleep event that starts around 22:00 and lasts 7-8 hours
        const sleepStartHour = 20 + Math.floor(Math.random() * 3); // 20:00, 21:00, or 22:00
        const sleepStartMinute = Math.floor(Math.random() * 60);
        const sleepDurationHours = 7 + Math.random(); // 7-8 hours

        const sleepStart = new Date(currentDate);
        sleepStart.setHours(sleepStartHour, sleepStartMinute, 0, 0);
        let sleepEnd = new Date(sleepStart.getTime() + sleepDurationHours * 60 * 60 * 1000);

        // Sleep event with typical sleep values
        const sleepEvent = {
          endTime: sleepEnd.getTime(),
          category: 'Sleep' as const,
          notes: Math.random() > 0.7 ? [
            'Had some interesting dreams',
            'Woke up feeling refreshed',
            'Slept through the night',
            'A bit restless but okay',
            'Deep sleep cycle felt good'
          ][Math.floor(Math.random() * 5)] : undefined,
          happiness: 0.8,
          wakefulness: Math.random() * 0.02,
          health: 0.9,
        };

        dayEvents.push(sleepEvent);

        // Fill the rest of the day with other activities
        let currentTime = new Date(currentDate);
        currentTime.setHours(7, 0, 0, 0); // Start at 7:00 AM

        while (currentTime < sleepStart) {
          const timeUntilSleep = sleepStart.getTime() - currentTime.getTime();
          if (timeUntilSleep < 30 * 60 * 1000) break; // Less than 30 minutes before sleep

          // Random duration between 30 minutes and 3 hours
          const maxDuration = Math.min(3 * 60 * 60 * 1000, timeUntilSleep - 30 * 60 * 1000);
          if (maxDuration <= 0) break;

          const durationMs = (Math.random() * (maxDuration / (60 * 60 * 1000)) * 2 + 0.5) * 60 * 60 * 1000;
          const actualDuration = Math.min(durationMs, maxDuration);

          const category = categories[Math.floor(Math.random() * categories.length)];
          const happiness = Math.random() * 0.4 + 0.5;
          const wakefulness = Math.random() * 0.4 + 0.5;
          const health = Math.random() * 0.3 + 0.6;

          const eventEndTime = new Date(currentTime.getTime() + actualDuration);

          const event = {
            endTime: eventEndTime.getTime(),
            category,
            notes: Math.random() > 0.6 ? [
              'Productive session',
              'Good progress made',
              'Felt energized',
              'Nice break',
              'Interesting activity'
            ][Math.floor(Math.random() * 5)] : undefined,
            happiness,
            wakefulness,
            health,
          };

          dayEvents.push(event);
          currentTime = new Date(eventEndTime.getTime() + Math.random() * 30 * 60 * 1000); // 0-30 minute gap
        }

        // Add all events for this day
        events.push(...dayEvents);
      }

      // Add all events to database
      for (const event of events) {
        await database.addEvent(event);
      }

      // Navigate to grid after generating data
      navigate('/');
    } catch (error) {
      console.error('Failed to generate test data:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStartEmpty = () => {
    navigate('/');
  };

  const handleGotoGrid = () => {
    navigate('/');
  };

  return {
    hasData,
    isGenerating,
    handleStartWithTestData,
    handleStartEmpty,
    handleGotoGrid,
  };
};